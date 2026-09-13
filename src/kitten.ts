/**
 * Kitten: um pet em pixel art que vive dentro de um elemento da página.
 *
 *   const gato = new Kitten(document.querySelector('#area')!);
 *   gato.addEventListener('statechange', (e) => console.log(e.detail.state));
 *
 * Cada gato é um único elemento movido só com `transform` (sem layout), animado
 * trocando `background-position` de uma spritesheet gerada uma vez por pelagem.
 * Todos os gatos da página dividem um só `requestAnimationFrame`, e quem está fora
 * da tela para de rodar.
 */
import { Animator, type ClipName } from './animations';
import { Brain, type ActionName, type BehaviorWeights, type CatBody } from './brain';
import { Random } from './random';
import { subscribe, type Tickable } from './scheduler';
import { cellOf, coatAtlas, fxAtlas, FX_CELL, type Atlas, type Coat, type FrameName, type FxName } from './sprites/atlas';
import { CELL_H, CELL_W } from './sprites/rasterize';
import { adoptStyles } from './styles';
import { joinContainer, petsIn, World, type Pet, type Surface, type Wall } from './world';

export interface KittenOptions {
  /** Pelagem: `'calico'` (a original), `'laranja'`, `'preto'`, `'cinza'` ou uma paleta própria. */
  coat?: Coat;
  /** Tamanho de cada pixel da arte, em px CSS. Inteiros deixam a arte nítida. Padrão: 3. */
  scale?: number;
  /** Multiplicador da velocidade de andar/correr. Padrão: 1. */
  speed?: number;
  /** Nome do gato (vai nos eventos). */
  name?: string;
  /** Onde ele pode pisar: `'auto'` (elementos com caixa visível) ou um seletor CSS. */
  platforms?: string;
  /** Clique, carinho (mouse parado em cima) e arrastar. Padrão: `true`. */
  interactive?: boolean;
  /**
   * Dois cliques em qualquer lugar do container chamam o gato: ele larga o que está
   * fazendo e vai até o ponto clicado, pulando e escalando o que estiver no caminho.
   * Padrão: `false`.
   */
  summon?: boolean;
  /** Deixa o gato empurrar de leve os elementos em que dá patada ou arranha. Padrão: `true`. */
  nudge?: boolean;
  /** Semente do aleatório: a mesma semente repete as mesmas escolhas. */
  seed?: number;
  /** Posição X inicial (px dentro do container). Padrão: aleatória. */
  x?: number;
  /** Pesos dos comportamentos (0 desliga um deles). */
  behaviors?: BehaviorWeights;
  /** Frases do balão. */
  phrases?: readonly string[];
  /** Elemento que serve de camada (já dentro do container). Se omitido, um é criado. */
  layer?: HTMLElement;
}

export interface KittenEventDetail {
  cat: Kitten;
  [key: string]: unknown;
}

const GRAVITY = 300; // px da arte / s²
const WALK = 20; // px da arte / s
const RUN = 62;
/** Velocidade de subida na parede, em px da arte / s. */
const CLIMB = 26;
/**
 * Quando o sprite gira 90° para a parede, o chão do desenho (onde ficam as patas) sai do
 * fundo da célula e vai parar meia altura de célula ao lado do centro. É esse desvio.
 */
const CLIMB_SHIFT = CELL_H / 2;
const MAX_PARTICLES = 14;
/** Piso do pulo, em px da arte: o mínimo que ele sobe mesmo num palco pequeno. */
const MAX_RISE = 74;
/** O pulo cresce com o palco: esta fração da altura (e da largura) é o alcance dele. */
const RISE_OF_STAGE = 0.62;
const SPAN_OF_STAGE = 0.42;
/** Teto absoluto, para palcos gigantes não virarem pulo de foguete (px CSS). */
const MAX_REACH = 900;
const DEFAULT_PHRASES = ['miau!', 'mrrp?', 'miau~', 'prrr...', 'nhac!', 'mia?'];

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Containers que tiveram `position` trocado para `relative` (e por quantos gatos). */
const positioned = new WeakMap<HTMLElement, { count: number; previous: string }>();

export class Kitten extends EventTarget implements CatBody, Tickable, Pet {
  readonly container: HTMLElement;
  /** A camada onde o gato é desenhado (recebe os eventos `kitten:*`, que borbulham). */
  readonly element: HTMLElement;
  readonly name: string;
  readonly rng: Random;
  readonly world: World;
  readonly scale: number;
  readonly halfWidth: number;
  readonly bodyHeight: number;
  reducedMotion = false;

  x = 0;
  y = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  moving = false;
  support: Surface | null = null;

  private readonly speed: number;
  private readonly allowNudge: boolean;
  private readonly phrases: readonly string[];
  private readonly root: ShadowRoot;
  private readonly catEl: HTMLDivElement;
  private readonly spriteEl: HTMLDivElement;
  private readonly hitEl: HTMLDivElement;
  private readonly animator = new Animator();
  private readonly brain: Brain;
  private readonly fxSheet: Atlas;
  private readonly w: number;
  private readonly h: number;
  private atlas: Atlas;

  private vx = 0;
  private vy = 0;
  /** Quina onde está agarrado (fora dela, `null`). */
  private wall: Wall | null = null;
  private climbGoalY = 0;
  private goalX: number | null = null;
  private running = false;
  // De onde pulou e para onde vai, por elemento (`null` = chão, `undefined` = nenhum).
  // Por elemento e não por objeto: o mundo recria as superfícies a cada leitura do layout.
  private jumpFromEl: Element | null | undefined = undefined;
  private jumpTargetEl: Element | null | undefined = undefined;
  private jumpTargetY = 0;
  private apexY = 0;
  private lastOrigin = '';
  private worldVersion = -1;
  private supportTimer = 0;
  private tilt = 0;

  private lastFrame = '';
  private lastTransform = '';
  private lastSpriteTransform = '-';
  private particles = 0;
  private bubble: HTMLDivElement | null = null;
  private nextPhrase: string | undefined;

  private rawPointer: { cx: number; cy: number; t: number } | null = null;
  private drag: { id: number; sx: number; sy: number; active: boolean; lx: number; ly: number; lt: number; vx: number; vy: number } | null = null;
  private hoverTimer = 0;

  private unsubscribe: (() => void) | null = null;
  private visible = true;
  private paused = false;
  private destroyed = false;
  private readonly createdLayer: boolean;
  private leaveGroup: (() => void) | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(container: HTMLElement, options: KittenOptions = {}) {
    super();
    this.container = container;
    this.name = options.name ?? 'Kitten';
    this.rng = new Random(options.seed);
    this.scale = Math.max(1, options.scale ?? 3);
    this.speed = Math.max(0.1, options.speed ?? 1);
    this.allowNudge = options.nudge ?? true;
    this.phrases = options.phrases?.length ? options.phrases : DEFAULT_PHRASES;
    this.halfWidth = 8 * this.scale;
    this.bodyHeight = 15 * this.scale;
    this.w = CELL_W * this.scale;
    this.h = CELL_H * this.scale;

    // Camada: um elemento com Shadow DOM que cobre o container sem mexer no layout.
    this.createdLayer = !options.layer;
    const layer = options.layer ?? document.createElement('div');
    if (this.createdLayer) {
      layer.className = 'kitten-layer';
      container.append(layer);
    }
    this.element = layer;
    layer.setAttribute('aria-hidden', 'true');

    this.world = World.acquire(container, options.platforms?.trim() || 'auto');
    // Entra na turma do container: é assim que um gato enxerga o outro.
    this.leaveGroup = joinContainer(container, this);
    this.world.addLayer(layer);
    if (this.world.page) layer.style.position = 'fixed';
    else this.ensurePositioned();

    this.root = layer.shadowRoot ?? layer.attachShadow({ mode: 'open' });
    adoptStyles(this.root);

    this.catEl = document.createElement('div');
    this.catEl.className = 'cat';
    this.catEl.setAttribute('part', 'cat');
    this.spriteEl = document.createElement('div');
    this.spriteEl.className = 'sprite';
    this.hitEl = document.createElement('div');
    this.hitEl.className = 'hit';
    this.catEl.append(this.spriteEl, this.hitEl);
    this.root.append(this.catEl);

    const s = this.scale;
    this.atlas = coatAtlas(options.coat);
    this.fxSheet = fxAtlas();
    const vars: Record<string, string> = {
      '--u': `${s}px`,
      '--w': `${this.w}px`,
      '--h': `${this.h}px`,
      '--fx': `${FX_CELL * s}px`,
      '--fx-url': `url("${this.fxSheet.url}")`,
      '--fx-sheet-w': `${this.fxSheet.width * s}px`,
      '--fx-sheet-h': `${this.fxSheet.height * s}px`,
    };
    for (const [k, v] of Object.entries(vars)) layer.style.setProperty(k, v);
    this.applyAtlas();

    // Movimento reduzido: o gato fica mais calmo e sem partículas.
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion) {
      this.reducedMotion = motion.matches;
      const onMotion = (e: MediaQueryListEvent): void => void (this.reducedMotion = e.matches);
      motion.addEventListener('change', onMotion);
      this.cleanups.push(() => motion.removeEventListener('change', onMotion));
    }

    // Começa sentado no chão.
    this.world.update(performance.now());
    this.worldVersion = this.world.version;
    const floor = this.floor();
    this.support = floor;
    this.y = floor.y;
    this.x = clamp(options.x ?? this.rng.range(this.halfWidth, this.world.width - this.halfWidth), this.minX(), this.maxX());
    this.facing = this.rng.chance(0.5) ? 1 : -1;

    this.brain = new Brain(this, options.behaviors);
    this.brain.onState = (state, previous) => this.emit('statechange', { state, previous });

    if (options.interactive ?? true) this.bindInput();
    else this.catEl.dataset.passive = '';
    if (options.summon) this.bindSummon();

    // Fora da tela = parado (não gasta CPU nenhuma).
    if (!this.world.page && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.syncLoop();
      });
      io.observe(container);
      this.cleanups.push(() => io.disconnect());
    }

    this.render(this.animator.update(0));
    this.syncLoop();
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /** O que o gato está fazendo agora (`idle`, `wander`, `nap`, `play`...). */
  get state(): string {
    return this.brain.state;
  }

  /** 0 (exausto) a 1 (elétrico). */
  get energy(): number {
    return this.brain.energy;
  }

  /**
   * Altura que um pulo alcança, em px CSS. Cresce com o palco: numa div grande ele pula
   * bem mais alto, que é o que deixa o parkour possível em telas cheias de elementos.
   */
  get rise(): number {
    return clamp(this.world.height * RISE_OF_STAGE, MAX_RISE * this.scale, MAX_REACH);
  }

  /** Distância que um pulo cruza, em px CSS — também cresce com o palco. */
  get span(): number {
    return clamp(this.world.width * SPAN_OF_STAGE, 90 * this.scale, MAX_REACH);
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** Pede uma ação agora: `'sleep'`, `'groom'`, `'play'`, `'jump'`, `'scratch'`, `'meow'`... */
  do(action: ActionName): void {
    if (this.drag?.active || !this.grounded) return;
    this.brain.act(action);
  }

  /**
   * Chama o gato para um ponto do palco (em px do container). É o que os dois cliques
   * fazem quando `summon` está ligado: ele vai até lá pulando e escalando o que precisar.
   */
  summonTo(x: number, y: number): void {
    if (this.destroyed || this.drag?.active || !this.grounded) return;
    this.brain.summoned(x, y);
    this.emit('summon', { x, y });
  }

  /** Mia (com um texto opcional no balão). */
  meow(text?: string): void {
    this.nextPhrase = text;
    this.do('meow');
  }

  /** Troca a pelagem sem recriar o gato. */
  setCoat(coat: Coat): void {
    this.atlas = coatAtlas(coat);
    this.applyAtlas();
  }

  pause(): void {
    this.paused = true;
    this.syncLoop();
  }

  resume(): void {
    this.paused = false;
    this.syncLoop();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.syncLoop();
    window.clearTimeout(this.hoverTimer);
    for (const fn of this.cleanups.splice(0)) fn();
    this.leaveGroup?.();
    this.leaveGroup = null;
    this.world.removeLayer(this.element);
    this.world.release();
    this.root.replaceChildren();
    if (this.createdLayer) this.element.remove();
    this.releasePosition();
    this.emit('destroy');
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  tick(dt: number, now: number): void {
    if (this.world.update(now) || this.world.version !== this.worldVersion) this.resync();

    // Elementos que se movem sem mudar o DOM (animações CSS): confere quem está embaixo.
    this.supportTimer -= dt;
    if (this.supportTimer <= 0) {
      this.supportTimer = 0.25;
      const el = this.grounded ? this.support?.el : null;
      if (el) {
        const top = el.isConnected ? this.world.toLocal(0, el.getBoundingClientRect().top).y : NaN;
        if (!(Math.abs(top - this.y) < 1.5)) this.world.invalidate();
      }
    }

    if (!this.drag?.active) this.brain.update(dt);
    this.step(dt);
    this.render(this.animator.update(dt * 1000));
  }

  private syncLoop(): void {
    const run = this.visible && !this.paused && !this.destroyed;
    if (run && !this.unsubscribe) this.unsubscribe = subscribe(this);
    else if (!run && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // ── Convívio (um gato enxergando o outro) ─────────────────────────────────

  /** Ocupado: no colo, no ar, na parede ou já indo embora. */
  get busy(): boolean {
    return this.destroyed || !!this.drag?.active || !this.grounded;
  }

  /** Agarrado numa quina. */
  get climbing(): boolean {
    return this.wall !== null;
  }

  /** Outros gatos do mesmo container por perto, do mais próximo para o mais longe. */
  neighbors(radius: number): Pet[] {
    const found: Pet[] = [];
    for (const pet of petsIn(this.container)) {
      if (pet === this) continue;
      if (Math.abs(pet.x - this.x) > radius || Math.abs(pet.y - this.y) > this.bodyHeight) continue;
      found.push(pet);
    }
    return found.sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
  }

  /** Alguém veio dizer oi: ele para, olha e retribui. */
  greet(fromX: number): void {
    if (this.busy) return;
    this.brain.greeted(fromX >= this.x ? 1 : -1);
    this.emit('greet', { fromX });
  }

  /** Levou patadinha: se assusta e dá um pulinho para trás. */
  spook(fromX: number): void {
    if (this.busy) return;
    this.brain.spooked(fromX >= this.x ? 1 : -1);
  }

  /** Está sendo perseguido: corre para o outro lado. */
  flee(fromX: number): void {
    if (this.busy) return;
    this.brain.fleeFrom(fromX >= this.x ? 1 : -1);
  }

  /** Avisa a página que rolou uma interação entre dois gatos. */
  meet(kind: string, other: Pet): void {
    this.emit('social', { kind, other: other.name });
  }

  // ── Corpo (usado pelo cérebro) ────────────────────────────────────────────

  get pointer(): { x: number; y: number; t: number } | null {
    const p = this.rawPointer;
    if (!p) return null;
    const local = this.world.toLocal(p.cx, p.cy);
    return { x: local.x, y: local.y, t: p.t };
  }

  anim(clip: ClipName, restart = false): void {
    this.animator.play(clip, restart);
  }

  animDone(): boolean {
    return this.animator.done;
  }

  face(dir: 1 | -1): void {
    this.facing = dir;
  }

  walkTo(x: number, run = false): void {
    const s = this.support;
    if (!s || !this.grounded) return;
    const target = clamp(x, Math.max(s.left, this.minX()), Math.min(s.right, this.maxX()));
    if (Math.abs(target - this.x) < 1) {
      this.stop();
      return;
    }
    this.goalX = target;
    this.running = run;
    this.moving = true;
    this.face(target > this.x ? 1 : -1);
    this.animator.play(run ? 'run' : 'walk');
    this.animator.rate = this.speed;
  }

  stop(): void {
    this.goalX = null;
    this.moving = false;
  }

  jumpTo(target: Surface, x: number): void {
    const s = this.scale;
    const g = GRAVITY * s;
    const dx = x - this.x;
    const higher = Math.min(this.y, target.y);
    let apex = higher - (10 * s + Math.abs(dx) * 0.16 + Math.max(0, this.y - target.y) * 0.12);
    // Não deixa o arco sair pelo teto do container (o gato sumiria por um instante).
    apex = Math.min(Math.max(apex, this.bodyHeight + 2 * s), higher - 2 * s);
    // Nem subir mais alto do que um pulo alcança.
    apex = Math.max(apex, this.y - this.rise);
    const up = Math.max(1, this.y - apex);
    // Alvo acima do alcance (o mundo mudou no meio do pulo): sobe o que dá e cai.
    const short = apex > target.y - 2;
    const down = short ? 0 : Math.max(1, target.y - apex);
    const time = Math.sqrt((2 * up) / g) + (down > 0 ? Math.sqrt((2 * down) / g) : 0);
    this.vx = dx / time;
    this.vy = -Math.sqrt(2 * g * up);
    if (Math.abs(dx) > 1) this.face(dx > 0 ? 1 : -1);
    this.takeOff(target);
  }

  /** Se agarra numa quina, na altura em que está. */
  grabWall(wall: Wall): void {
    this.stop();
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.support = null;
    this.jumpFromEl = undefined;
    this.jumpTargetEl = undefined;
    this.wall = wall;
    this.climbGoalY = this.y = clamp(this.y, wall.top, wall.bottom);
    this.x = wall.x; // colado na face, mesmo que seja a borda do container
    this.face(wall.side === 1 ? -1 : 1); // de frente para o elemento, que é para onde vai subir
    this.apexY = this.y;
  }

  /** Sobe (ou desce) pela quina até `y`. */
  climbTo(y: number): void {
    if (!this.wall) return;
    this.climbGoalY = clamp(y, this.wall.top - this.bodyHeight, this.wall.bottom);
    this.moving = Math.abs(this.climbGoalY - this.y) > 1;
  }

  /** Chegou no topo e se puxa para cima: fica em pé em cima do elemento. */
  topOut(): boolean {
    const wall = this.wall;
    if (!wall) return false;
    // A parede do container não tem topo para pisar: de lá ele só pode saltar.
    const top = wall.el === null ? null : this.world.surfaces.find((s) => s.el === wall.el);
    if (!top) return false;
    this.wall = null;
    this.support = top;
    this.grounded = true;
    this.moving = false;
    this.vx = 0;
    this.vy = 0;
    this.y = top.y;
    this.x = clamp(wall.x - wall.side * this.halfWidth, top.left + this.halfWidth * 0.6, top.right - this.halfWidth * 0.6);
    this.emit('land', { element: top.el, height: 0 });
    return true;
  }

  /** Larga a parede com um empurrão para o lado: sai da parede pulando. */
  leapOffWall(dir: 1 | -1): void {
    if (!this.wall) return;
    const g = GRAVITY * this.scale;
    this.letGoWall();
    this.vx = dir * 30 * this.scale;
    this.vy = -Math.sqrt(2 * g * 8 * this.scale);
    this.face(dir);
    this.animator.play('leap', true);
  }

  /** Solta a quina e cai. */
  letGoWall(): void {
    if (!this.wall) return;
    this.wall = null;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.support = null;
    this.moving = false;
    this.apexY = this.y;
  }

  hop(dx: number, height: number): void {
    const s = this.support;
    if (!s) return;
    const x = clamp(this.x + dx, s.left + 2, s.right - 2);
    const g = GRAVITY * this.scale;
    const time = 2 * Math.sqrt((2 * height) / g);
    this.vx = (x - this.x) / time;
    this.vy = -Math.sqrt(2 * g * height);
    if (Math.abs(dx) > 1) this.face(dx > 0 ? 1 : -1);
    this.takeOff(s);
  }

  say(text?: string): void {
    const phrase = text ?? this.nextPhrase ?? this.rng.pick(this.phrases) ?? 'miau!';
    this.nextPhrase = undefined;
    this.bubble?.remove();
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.setAttribute('part', 'bubble');
    bubble.textContent = phrase;
    const nearRight = this.x > this.world.width - 70 * this.scale / 3 - this.w / 2;
    const nearLeft = this.x < 70 * this.scale / 3 + this.w / 2;
    bubble.dataset.side = nearRight ? 'left' : nearLeft ? 'right' : this.facing === 1 ? 'right' : 'left';
    this.catEl.append(bubble);
    this.bubble = bubble;
    const remove = (): void => {
      bubble.remove();
      if (this.bubble === bubble) this.bubble = null;
    };
    bubble.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, 2500);
    this.emit('meow', { text: phrase });
  }

  fx(name: FxName, count = 1): void {
    for (let i = 0; i < count; i++) this.spawn(name, i);
  }

  nudge(el: Element): void {
    if (!this.allowNudge || this.reducedMotion || el.hasAttribute('data-kitten-static')) return;
    const d = this.facing;
    const keyframes = [
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: `translate(${d * 2}px, -1px) rotate(${d * 1.6}deg)` },
      { transform: `translate(${-d}px, 0) rotate(${-d * 0.7}deg)` },
      { transform: 'translate(0, 0) rotate(0deg)' },
    ];
    const timing: KeyframeAnimationOptions = { duration: 320, easing: 'ease-out' };
    try {
      el.animate(keyframes, { ...timing, composite: 'add' });
    } catch {
      el.animate(keyframes, timing);
    }
    this.emit('nudge', { element: el });
  }

  // ── Física ────────────────────────────────────────────────────────────────

  private floor(): Surface {
    return this.world.surfaces[this.world.surfaces.length - 1]!;
  }

  private minX(): number {
    return Math.min(this.halfWidth * 0.7, this.world.width / 2);
  }

  private maxX(): number {
    return Math.max(this.world.width - this.halfWidth * 0.7, this.world.width / 2);
  }

  private takeOff(target: Surface | null): void {
    this.jumpFromEl = this.support ? this.support.el : undefined;
    this.jumpTargetEl = target ? target.el : undefined;
    this.jumpTargetY = target ? target.y : 0;
    this.grounded = false;
    this.support = null;
    this.stop();
    this.apexY = this.y;
  }

  private startFall(): void {
    if (!this.grounded) return;
    const dir = this.goalX === null ? 0 : Math.sign(this.goalX - this.x);
    this.vx = dir * (this.running ? RUN : WALK) * this.scale * this.speed * 0.8;
    this.vy = 0;
    this.takeOff(null);
    this.jumpFromEl = undefined;
    this.brain.fell();
  }

  /** O mundo mudou (layout, scroll, resize): reencontra a superfície embaixo do gato. */
  private resync(): void {
    this.worldVersion = this.world.version;
    if (this.wall) {
      // A quina mudou de lugar (ou sumiu): vai junto, ou solta e cai.
      const next = this.world.walls.find((w) => w.el === this.wall!.el && w.side === this.wall!.side);
      if (next) {
        this.wall = next;
        this.x = next.x; // colado na face, sem o limite das bordas do palco
        this.y = clamp(this.y, next.top, next.bottom);
      } else {
        this.fx('alert');
        this.letGoWall();
        this.brain.fell();
      }
      return;
    }
    this.x = clamp(this.x, this.minX(), this.maxX());
    if (this.drag?.active || !this.grounded) return;
    const old = this.support;
    const next = !old || old.el === null ? this.floor() : this.world.surfaces.find((s) => s.el === old.el) ?? null;
    // Em cima de um elemento que andou para o lado, o gato vai junto.
    if (old && next && old.el !== null) {
      this.x = clamp(this.x + (next.left + next.right - old.left - old.right) / 2, this.minX(), this.maxX());
      if (this.goalX !== null) this.goalX += (next.left + next.right - old.left - old.right) / 2;
    }
    if (next && this.x >= next.left - 2 && this.x <= next.right + 2) {
      this.support = next;
      this.y = next.y;
    } else {
      this.fx('alert');
      this.startFall();
    }
  }

  private step(dt: number): void {
    if (this.drag?.active) {
      this.tilt *= Math.pow(0.02, dt);
      return;
    }

    if (this.wall) {
      const v = CLIMB * this.scale * this.speed;
      const dy = this.climbGoalY - this.y;
      if (Math.abs(dy) <= v * dt) {
        this.y = this.climbGoalY;
        this.moving = false;
      } else {
        this.y += Math.sign(dy) * v * dt;
        this.moving = true;
      }
      return;
    }

    if (!this.grounded) {
      const prevY = this.y;
      this.vy += GRAVITY * this.scale * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.apexY = Math.min(this.apexY, this.y);
      // Bate na borda do palco e volta — mas quem saiu de uma parede já está fora do
      // limite e indo para dentro: esse segue o voo em vez de quicar no nada.
      const min = this.minX();
      const max = this.maxX();
      if (this.x < min) {
        this.x = min;
        if (this.vx < 0) this.vx = -this.vx * 0.25;
      } else if (this.x > max) {
        this.x = max;
        if (this.vx > 0) this.vx = -this.vx * 0.25;
      }
      if (this.vy > 0) {
        const landing = this.findLanding(prevY, this.y);
        if (landing) {
          this.land(landing);
          return;
        }
      }
      this.animator.play(this.vy < -30 * this.scale ? 'leap' : 'fall');
      return;
    }

    if (this.goalX !== null) {
      const v = (this.running ? RUN : WALK) * this.scale * this.speed;
      const dist = this.goalX - this.x;
      if (Math.abs(dist) <= v * dt) {
        this.x = this.goalX;
        this.stop();
      } else {
        this.x += Math.sign(dist) * v * dt;
        this.face(dist > 0 ? 1 : -1);
      }
      const s = this.support;
      if (s && (this.x < s.left - 1 || this.x > s.right + 1)) this.startFall();
    }
  }

  private findLanding(prevY: number, y: number): Surface | null {
    let best: Surface | null = null;
    for (const s of this.world.surfaces) {
      if (this.x < s.left || this.x > s.right || s.y < prevY - 0.5 || s.y > y) continue;
      // Pulando para baixo, atravessa a própria plataforma de onde saiu.
      const origin = s.el !== null && s.el === this.jumpFromEl;
      if (origin && this.jumpTargetEl !== undefined && this.jumpTargetY > s.y + 1) continue;
      if (s.el && s.el !== this.jumpTargetEl && s.clearance < this.bodyHeight * 0.6) continue;
      if (!best || s.y < best.y) best = s;
    }
    const floor = this.floor();
    if (!best && y >= floor.y) best = floor;
    return best;
  }

  private land(s: Surface): void {
    const height = s.y - this.apexY;
    this.y = s.y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.support = s;
    this.jumpFromEl = undefined;
    this.jumpTargetEl = undefined;
    this.animator.play('land', true);
    if (height > 28 * this.scale) this.fx('dust', 2);
    this.emit('land', { element: s.el, height });
  }

  // ── Desenho ───────────────────────────────────────────────────────────────

  private applyAtlas(): void {
    const s = this.scale;
    this.spriteEl.style.backgroundImage = `url("${this.atlas.url}")`;
    this.element.style.setProperty('--sheet-w', `${this.atlas.width * s}px`);
    this.element.style.setProperty('--sheet-h', `${this.atlas.height * s}px`);
    this.lastFrame = '';
  }

  private render(frame: FrameName): void {
    const s = this.scale;
    if (frame !== this.lastFrame) {
      const cell = cellOf(this.atlas, frame);
      this.spriteEl.style.backgroundPosition = `${-cell.x * s}px ${-cell.y * s}px`;
      this.lastFrame = frame;
    }
    const dpr = window.devicePixelRatio || 1;
    // Na parede o desenho gira 90° em volta do centro da célula: o chão do desenho vira a
    // linha das patas, e ela cai CLIMB_SHIFT px ao lado do gato — o desvio compensa isso.
    const shift = this.wall ? this.facing * CLIMB_SHIFT * s : 0;
    const tx = Math.round((this.x - this.w / 2 - shift) * dpr) / dpr;
    const ty = Math.round((this.y - this.h) * dpr) / dpr;
    const transform = `translate3d(${tx}px, ${ty}px, 0)`;
    if (transform !== this.lastTransform) {
      this.catEl.style.transform = transform;
      this.lastTransform = transform;
    }
    const origin = this.wall ? '50% 50%' : this.drag?.active ? '50% 24%' : '50% 70%';
    if (origin !== this.lastOrigin) {
      this.spriteEl.style.transformOrigin = origin;
      this.lastOrigin = origin;
    }
    const angle = this.poseTilt();
    const tilt = this.wall ? ' rotate(-90deg)' : Math.abs(angle) > 0.4 ? ` rotate(${angle.toFixed(1)}deg)` : '';
    const sprite = (this.facing === -1 ? 'scaleX(-1)' : '') + tilt;
    if (sprite !== this.lastSpriteTransform) {
      this.spriteEl.style.transform = sprite;
      this.lastSpriteTransform = sprite;
    }
  }

  /** No colo ele balança; no ar sobe com a traseira baixa e cai com o peito baixo. */
  private poseTilt(): number {
    if (this.drag?.active) return this.tilt;
    if (this.grounded) return 0;
    return clamp(this.vy / (14 * this.scale), -13, 15);
  }

  private spawn(name: FxName, i: number): void {
    if (this.particles >= MAX_PARTICLES || this.reducedMotion) return;
    const s = this.scale;
    const size = FX_CELL * s;
    const cell = cellOf(this.fxSheet, name);
    let px = this.x;
    let py = this.y;
    let dx = 0;
    if (name === 'heart') {
      px += this.facing * 2 * s + this.rng.range(-5, 5) * s;
      py -= 17 * s;
      dx = this.rng.range(-6, 6) * s;
    } else if (name === 'zzz') {
      px += this.facing * 5 * s;
      py -= 12 * s;
    } else if (name === 'dust') {
      const side = i % 2 ? 1 : -1;
      px += side * 7 * s;
      py -= 3 * s;
      dx = side * 6 * s;
    } else {
      px += this.facing * 3 * s;
      py -= 24 * s;
    }
    const el = document.createElement('div');
    el.className = `p ${name}`;
    el.style.backgroundPosition = `${-cell.x * s}px ${-cell.y * s}px`;
    el.style.setProperty('--x', `${Math.round(px - size / 2)}px`);
    el.style.setProperty('--y', `${Math.round(py - size)}px`);
    el.style.setProperty('--dx', `${Math.round(dx)}px`);
    if (i > 0 && name === 'heart') el.style.animationDelay = `${i * 0.18}s`;
    this.root.append(el);
    this.particles++;
    let removed = false;
    const remove = (): void => {
      if (removed) return;
      removed = true;
      el.remove();
      this.particles--;
    };
    el.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, 4000);
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    const payload: KittenEventDetail = { ...detail, cat: this };
    this.dispatchEvent(new CustomEvent(type, { detail: payload }));
    this.element.dispatchEvent(new CustomEvent(`kitten:${type}`, { detail: payload, bubbles: true, composed: true }));
  }

  /** Dois cliques no container: o gato é chamado para o ponto. */
  private bindSummon(): void {
    const onDouble = (e: MouseEvent): void => {
      const p = this.world.toLocal(e.clientX, e.clientY);
      this.summonTo(p.x, p.y);
    };
    this.container.addEventListener('dblclick', onDouble);
    this.cleanups.push(() => this.container.removeEventListener('dblclick', onDouble));
  }

  // ── Mouse / toque ─────────────────────────────────────────────────────────

  private bindInput(): void {
    const hit = this.hitEl;
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type, fn as EventListener, opts);
      this.cleanups.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };

    on(hit, 'pointerdown', (e) => {
      if (e.button !== 0 || this.destroyed) return;
      e.preventDefault();
      try {
        hit.setPointerCapture(e.pointerId);
      } catch {
        // Ponteiro sintético/inativo: segue sem captura.
      }
      const p = this.world.toLocal(e.clientX, e.clientY);
      this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, active: false, lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 };
    });

    on(hit, 'pointermove', (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
        d.active = true;
        this.startDrag();
      }
      const p = this.world.toLocal(e.clientX, e.clientY);
      const now = performance.now();
      const dt = Math.max(1, now - d.lt) / 1000;
      d.vx = d.vx * 0.5 + ((p.x - d.lx) / dt) * 0.5;
      d.vy = d.vy * 0.5 + ((p.y - d.ly) / dt) * 0.5;
      d.lx = p.x;
      d.ly = p.y;
      d.lt = now;
      this.x = clamp(p.x, this.minX(), this.maxX());
      this.y = Math.min(p.y + 19 * this.scale, this.floor().y);
      this.tilt = clamp(-d.vx * 0.03, -28, 28);
    });

    const release = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId);
      if (!d.active) {
        if (e.type === 'pointerup') {
          this.brain.clicked();
          this.emit('click');
        }
        return;
      }
      delete this.catEl.dataset.dragging;
      this.spriteEl.style.transition = '';
      this.tilt = 0;
      const max = 260 * this.scale;
      this.vx = clamp(d.vx, -max, max);
      this.vy = clamp(d.vy, -max, max * 0.5);
      this.grounded = false;
      this.apexY = this.y;
      this.jumpFromEl = undefined;
      this.jumpTargetEl = undefined;
      this.brain.dropped();
      this.emit('drop');
    };
    on(hit, 'pointerup', release);
    on(hit, 'pointercancel', release);

    on(hit, 'pointerenter', () => {
      window.clearTimeout(this.hoverTimer);
      this.hoverTimer = window.setTimeout(() => {
        if (this.drag) return;
        this.brain.pet(true);
        this.emit('pet');
      }, 650);
    });
    on(hit, 'pointerleave', () => {
      window.clearTimeout(this.hoverTimer);
      this.brain.pet(false);
    });

    // Posição do mouse no palco (o gato às vezes caça o cursor).
    const stage: HTMLElement | Window = this.world.page ? window : this.container;
    on(stage, 'pointermove', (e) => void (this.rawPointer = { cx: e.clientX, cy: e.clientY, t: performance.now() }), { passive: true });
  }

  private startDrag(): void {
    window.clearTimeout(this.hoverTimer);
    this.brain.pet(false);
    this.stop();
    this.wall = null; // se estava escalando, larga a parede
    this.grounded = false;
    this.support = null;
    this.vx = 0;
    this.vy = 0;
    this.bubble?.remove();
    this.catEl.dataset.dragging = '';
    this.brain.grabbed();
    // O cérebro fica em pausa no colo: a pose (de frente, pendurado pelo cangote) e a
    // transição suave até ela saem daqui.
    this.spriteEl.style.transition = 'transform 180ms cubic-bezier(.2, .8, .3, 1)';
    this.animator.play('dangle', true);
    this.emit('grab');
  }

  // ── Container ─────────────────────────────────────────────────────────────

  /** A camada usa `position: absolute; inset: 0`, então o container precisa ser posicionado. */
  private ensurePositioned(): void {
    const c = this.container;
    const entry = positioned.get(c);
    if (entry) {
      entry.count++;
      return;
    }
    if (getComputedStyle(c).position === 'static') {
      positioned.set(c, { count: 1, previous: c.style.position });
      c.style.position = 'relative';
    }
  }

  private releasePosition(): void {
    const c = this.container;
    const entry = positioned.get(c);
    if (!entry || --entry.count > 0) return;
    c.style.position = entry.previous;
    positioned.delete(c);
  }
}
