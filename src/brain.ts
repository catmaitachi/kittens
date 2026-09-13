/**
 * O "cérebro": escolhe aleatoriamente o que o gato faz a seguir e roda cada
 * comportamento como uma rotina (generator). Uma rotina devolve (`yield`) o que
 * está esperando — segundos ou uma condição — e o cérebro a retoma no momento certo.
 *
 * O cansaço (energia) muda as chances: gato cansado deita e dorme mais,
 * gato descansado pula e brinca mais.
 */
import type { ClipName } from './animations';
import type { Random } from './random';
import type { FxName } from './sprites/atlas';
import type { Pet, Surface, Wall, World } from './world';

export type BehaviorName =
  | 'idle' | 'loaf' | 'wander' | 'explore' | 'climb' | 'groom' | 'nap' | 'play' | 'stretch' | 'social';

/** Ações que dá para pedir direto com `kitten.do(...)`. */
export type ActionName = BehaviorName | 'sit' | 'walk' | 'jump' | 'sleep' | 'meow' | 'bat';

export type BehaviorWeights = Partial<Record<BehaviorName, number>>;

/** O que o cérebro enxerga e controla do gato (implementado por `Kitten`). */
export interface CatBody {
  readonly rng: Random;
  readonly world: World;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly grounded: boolean;
  readonly moving: boolean;
  /** Agarrado numa quina. */
  readonly climbing: boolean;
  readonly support: Surface | null;
  /** Meia largura e altura do corpo, em px CSS. */
  readonly halfWidth: number;
  readonly bodyHeight: number;
  /** Alcance de um pulo, em px CSS: `rise` para cima, `span` para o lado. */
  readonly rise: number;
  readonly span: number;
  readonly reducedMotion: boolean;
  /** Último ponto do mouse dentro do palco (px do palco + instante). */
  readonly pointer: { readonly x: number; readonly y: number; readonly t: number } | null;
  anim(clip: ClipName, restart?: boolean): void;
  animDone(): boolean;
  face(dir: 1 | -1): void;
  walkTo(x: number, run?: boolean): void;
  stop(): void;
  jumpTo(target: Surface, x: number): void;
  hop(dx: number, height: number): void;
  /** Abraça uma quina na altura em que está. */
  grabWall(wall: Wall): void;
  /** Sobe pela quina até essa altura. */
  climbTo(y: number): void;
  /** Se puxa para cima da quina; `false` se o topo sumiu no meio do caminho. */
  topOut(): boolean;
  /** Larga a quina (e cai). */
  letGoWall(): void;
  /** Sai da parede pulando para o lado. */
  leapOffWall(dir: 1 | -1): void;
  say(text?: string): void;
  fx(name: FxName, count?: number): void;
  nudge(el: Element): void;
  /** Outros gatos do mesmo container, do mais perto para o mais longe. */
  neighbors(radius: number): Pet[];
  /** Avisa a página que rolou uma interação entre dois gatos. */
  meet(kind: string, other: Pet): void;
}

type Wait = number | (() => boolean);
type Routine = Generator<Wait, void, void>;

interface JumpPlan {
  readonly from: Surface;
  readonly to: Surface;
  readonly x: number;
  readonly launchX: number;
}

export const DEFAULT_WEIGHTS: Readonly<Record<BehaviorName, number>> = {
  idle: 3,
  loaf: 1.2,
  wander: 3,
  explore: 2.4,
  climb: 1.6,
  groom: 1.5,
  nap: 0.8,
  play: 2,
  stretch: 0.5,
  social: 2,
};

/** Tempo máximo esperando uma condição (andar, pousar...) antes de desistir. */
const WAIT_TIMEOUT = 14;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export class Brain {
  /** Nome do comportamento atual (vira o evento `statechange`). */
  state = 'idle';
  /** 0 = exausto, 1 = elétrico. */
  energy: number;
  sleeping = false;
  onState: ((state: string, previous: string) => void) | null = null;

  private readonly cat: CatBody;
  private readonly weights: Record<BehaviorName, number>;
  private routine: Routine | null = null;
  private wait: Wait | null = null;
  private waitLeft = 0;
  private last: BehaviorName | null = null;
  private petting = false;

  private readonly done = (): boolean => this.cat.animDone();
  private readonly arrived = (): boolean => !this.cat.moving || !this.cat.grounded;
  private readonly landed = (): boolean => this.cat.grounded;
  private readonly stopped = (): boolean => !this.cat.moving || !this.cat.climbing;

  constructor(cat: CatBody, weights: BehaviorWeights = {}) {
    this.cat = cat;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.energy = cat.rng.range(0.65, 1);
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  update(dt: number): void {
    const drain = this.sleeping ? -0.05 : this.state === 'play' ? 0.02 : this.cat.moving ? 0.009 : 0.002;
    this.energy = clamp(this.energy - drain * dt, 0, 1);

    if (!this.routine) this.begin(this.pick());
    for (let guard = 0; guard < 16 && this.routine; guard++) {
      if (typeof this.wait === 'number') {
        this.wait -= dt;
        dt = 0;
        if (this.wait > 0) return;
      } else if (this.wait) {
        this.waitLeft -= dt;
        dt = 0;
        if (!this.wait()) {
          if (this.waitLeft > 0) return;
          this.end(); // esperou demais: o mundo mudou, escolhe outra coisa
          return;
        }
      }
      const step = this.routine.next();
      if (step.done) {
        this.end();
        return;
      }
      this.wait = step.value;
      this.waitLeft = WAIT_TIMEOUT;
    }
  }

  /** Força uma ação agora (interrompe a atual). */
  act(action: ActionName): void {
    const map: Record<ActionName, () => Routine> = {
      idle: () => this.idle(),
      sit: () => this.idle(),
      loaf: () => this.loaf(),
      wander: () => this.wander(),
      walk: () => this.wander(),
      explore: () => this.explore(false),
      jump: () => this.explore(false),
      climb: () => this.parkour(),
      groom: () => this.groom(),
      nap: () => this.nap(),
      sleep: () => this.sleepHere(),
      play: () => this.play(),
      stretch: () => this.stretch(),
      meow: () => this.meow(),
      bat: () => this.batNow(),
      social: () => this.social(),
    };
    const make = map[action];
    if (!make) return;
    const state = action === 'sit' ? 'idle' : action === 'walk' ? 'wander' : action === 'jump' ? 'explore' : action === 'sleep' ? 'nap' : action;
    this.run(make(), state);
  }

  // ── Reações a eventos do corpo e do usuário ───────────────────────────────

  /** Clique no gato. */
  clicked(): void {
    this.run(this.sleeping ? this.startled() : this.meow(), this.sleeping ? 'startled' : 'meow');
  }

  /** Começou a ser carregado. */
  grabbed(): void {
    this.run(this.held(), 'held');
  }

  /** Foi solto no ar (a física cuida da queda). */
  dropped(): void {
    this.run(this.afterDrop(), 'falling');
  }

  /** Perdeu o chão sem querer (o elemento sumiu ou mudou de lugar). */
  fell(): void {
    if (this.state === 'held') return;
    this.run(this.afterFall(), 'falling');
  }

  /** Chamado (dois cliques no container): vai até o ponto. */
  summoned(x: number, y: number): void {
    this.run(this.goTo(x, y), 'called');
  }

  /** Mouse parado em cima do gato. */
  pet(active: boolean): void {
    if (active === this.petting) return;
    this.petting = active;
    if (active && (this.state === 'idle' || this.state === 'loaf' || this.state === 'nap' || this.state === 'groom')) {
      this.run(this.petted(), 'petted');
    }
  }

  // ── Escolha do próximo comportamento ──────────────────────────────────────

  private pick(): BehaviorName {
    const c = this.cat;
    const tired = 1 - this.energy;
    const w: Record<BehaviorName, number> = { ...this.weights };
    w.nap *= this.energy > 0.8 ? 0 : 0.3 + tired * 5;
    w.loaf *= 0.6 + tired * 1.6;
    w.play *= 0.2 + this.energy;
    w.explore *= 0.3 + this.energy;
    w.climb *= 0.2 + this.energy * 1.2;
    w.wander *= 0.5 + this.energy * 0.6;
    if (c.reducedMotion) {
      w.climb = 0;
      w.explore *= 0.15;
      w.play *= 0.25;
      w.wander *= 0.5;
    }
    if (!this.findWalls().length) w.climb = 0;
    // Só faz sentido socializar se houver outro gato por perto.
    if (!c.neighbors(160 * c.scale).length) w.social = 0;
    if (this.last) w[this.last] *= 0.3; // evita repetir a mesma coisa em seguida
    return c.rng.weighted(w) ?? 'idle';
  }

  private begin(name: BehaviorName): void {
    this.last = name;
    const routines: Record<BehaviorName, () => Routine> = {
      idle: () => this.idle(),
      loaf: () => this.loaf(),
      wander: () => this.wander(),
      explore: () => this.explore(false),
      climb: () => this.parkour(),
      groom: () => this.groom(),
      nap: () => this.nap(),
      play: () => this.play(),
      stretch: () => this.stretch(),
      social: () => this.social(),
    };
    this.run(routines[name](), name);
  }

  private run(routine: Routine, state: string): void {
    this.routine?.return();
    this.sleeping = false;
    this.routine = routine;
    this.wait = null;
    this.setState(state);
  }

  private end(): void {
    this.routine?.return();
    this.routine = null;
    this.wait = null;
    this.sleeping = false;
  }

  private setState(state: string): void {
    if (state === this.state) return;
    const previous = this.state;
    this.state = state;
    this.onState?.(state, previous);
  }

  // ── Comportamentos ────────────────────────────────────────────────────────

  private *idle(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('sit');
    let t = c.rng.range(3, 8);
    while (t > 0) {
      const gap = c.rng.range(1.1, 2.6);
      yield gap;
      t -= gap;
      const r = c.rng.next();
      if (r < 0.42) c.anim('blink', true);
      else if (r < 0.68) c.anim('tailFlick', true);
      else if (r < 0.86) {
        c.face(c.facing === 1 ? -1 : 1); // olha para o outro lado
        continue;
      } else if (r < 0.95) c.anim('yawn', true);
      else {
        c.anim('meow', true);
        c.say();
      }
      yield this.done;
      c.anim('sit');
    }
  }

  private *loaf(): Routine {
    const c = this.cat;
    const resting: ClipName = c.rng.chance(0.65) ? 'loafWag' : 'loaf';
    c.stop();
    c.anim(resting);
    let t = c.rng.range(4, 10);
    while (t > 0) {
      const gap = c.rng.range(1.4, 3.4);
      yield gap;
      t -= gap;
      if (c.rng.chance(0.65)) {
        c.anim('loafBlink', true);
        yield this.done;
        c.anim(resting);
      }
    }
    if (this.energy < 0.45 && c.rng.chance(0.6)) {
      this.setState('nap');
      yield* this.sleepHere();
      return;
    }
    c.anim('sit');
    yield 0.5;
  }

  private *wander(): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const min = s.left + c.halfWidth;
    const max = s.right - c.halfWidth;
    if (max - min < 12 * c.scale) {
      yield* this.explore(false); // superfície pequena demais: melhor pular pra outra
      return;
    }
    let target = c.rng.range(min, max);
    if (Math.abs(target - c.x) < 14 * c.scale) {
      const dir = c.rng.chance(0.5) ? 1 : -1;
      target = clamp(c.x + dir * c.rng.range(20, 50) * c.scale, min, max);
    }
    const run = !c.reducedMotion && c.rng.chance(0.15 + this.energy * 0.2);
    c.walkTo(target, run);
    yield this.arrived;
    c.anim(c.rng.chance(0.55) ? 'sit' : 'stand');
    yield c.rng.range(0.5, 1.6);
  }

  private *explore(cozy: boolean): Routine {
    const plan = this.planJump(cozy);
    if (!plan) {
      if (!cozy) yield* this.wanderShort();
      return;
    }
    yield* this.jump(plan);
    const c = this.cat;
    c.anim(c.rng.chance(0.6) ? 'sit' : 'stand');
    yield c.rng.range(0.7, 1.8);
  }

  /** Um passeio curto (usado quando não há para onde pular). */
  private *wanderShort(): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const dir = c.rng.chance(0.5) ? 1 : -1;
    c.walkTo(clamp(c.x + dir * c.rng.range(15, 40) * c.scale, s.left + c.halfWidth, s.right - c.halfWidth));
    yield this.arrived;
    c.anim('sit');
    yield c.rng.range(0.8, 2);
  }

  private *jump(plan: JumpPlan): Routine {
    const c = this.cat;
    const distance = Math.abs(plan.launchX - c.x);
    if (distance > 2) {
      c.walkTo(plan.launchX, !c.reducedMotion && distance > 70 * c.scale && this.energy > 0.5);
      yield this.arrived;
    }
    // Compara por elemento: o mundo recria as superfícies quando relê o layout.
    if (!c.grounded || c.support?.el !== plan.from.el) return;
    c.face(plan.x >= c.x ? 1 : -1);
    c.anim('crouch');
    yield c.rng.range(0.22, 0.45);
    // Pega a versão atual do alvo (ele pode ter mudado enquanto o gato andava).
    const surfaces = c.world.surfaces;
    const to = plan.to.el === null ? surfaces[surfaces.length - 1] : surfaces.find((s) => s.el === plan.to.el);
    if (!to || !c.grounded) return;
    c.jumpTo(to, clamp(plan.x, to.left + c.halfWidth * 0.5, to.right - c.halfWidth * 0.5));
    yield this.landed;
    yield this.done;
  }

  // ── Parkour: escalar uma quina ────────────────────────────────────────────

  /** Quinas que dá para escalar de onde ele está: altas, coladas no chão dele e com topo. */
  private findWalls(): { wall: Wall; standX: number }[] {
    const c = this.cat;
    const from = c.support;
    if (!from || !c.grounded) return [];
    const options: { wall: Wall; standX: number }[] = [];
    for (const wall of c.world.walls) {
      if (wall.el !== null && wall.el === from.el) continue; // a quina do próprio lugar dele
      if (from.y - wall.top < c.bodyHeight * 1.2) continue; // degrau: um pulo resolve
      if (wall.bottom < from.y - 4) continue; // a parede acaba no ar, longe do pé dele
      const standX = clamp(
        wall.x + wall.side * c.halfWidth * 0.6, // do lado de fora da face
        from.left + c.halfWidth * 0.5,
        from.right - c.halfWidth * 0.5,
      );
      if (Math.abs(standX - wall.x) > c.halfWidth * 1.4) continue; // não dá para encostar nela
      options.push({ wall, standX });
    }
    return options;
  }

  /**
   * Chega na quina, se agarra, sobe trocando as patas, engancha na borda, se puxa
   * para cima — e, já que está lá em cima, muitas vezes emenda um pulo para outra
   * plataforma. É o parkour dele.
   */
  /**
   * Chega na quina, se agarra e sobe. A escalada é um atalho para o pulo: na maioria das
   * vezes ele solta a parede no meio do caminho e salta para uma plataforma que só de lá
   * dava para alcançar. Sem saída pelo meio, vai até o topo, engancha na borda e se puxa —
   * e se a parede for a do próprio container (que não tem topo), salta de lá para dentro.
   * `want` fixa a plataforma de saída (é assim que ele atende a um chamado).
   */
  private *scale(pick: { wall: Wall; standX: number }, want?: Surface): Routine {
    const c = this.cat;
    try {
      const distance = Math.abs(pick.standX - c.x);
      if (distance > 2) {
        c.walkTo(pick.standX, !c.reducedMotion && distance > 70 * c.scale && this.energy > 0.55);
        yield this.arrived;
      }
      if (!c.grounded) return;
      c.stop();
      c.face(pick.wall.side === 1 ? -1 : 1); // de frente para a parede
      c.anim('crouch');
      yield c.rng.range(0.2, 0.45);
      // Relê a quina: o layout pode ter mudado enquanto ele andava até lá.
      const wall = c.world.walls.find((w) => w.el === pick.wall.el && w.side === pick.wall.side);
      if (!wall || !c.grounded) return;
      c.anim('leap', true);
      yield 0.12;
      c.grabWall(wall);
      c.anim('wallGrab', true);
      c.fx('dust');
      yield c.rng.range(0.3, 0.7);
      c.anim('wallClimb', true);
      // A escalada é um atalho, não um destino: se houver uma plataforma alcançável no meio
      // do caminho, ele quase sempre solta a parede ali e salta para ela.
      const exits = this.wallExits(wall, c.y).filter((e) => !want || e.to.el === want.el);
      // Chamado para um lugar: sai na plataforma certa. Por conta própria: quase sempre sai.
      const exit = exits.length && (want !== undefined || c.rng.chance(0.78)) ? c.rng.pick(exits) : null;
      c.climbTo(exit ? exit.y : wall.top + 22 * c.scale); // 22 px é o gato deitado na parede
      yield this.stopped;
      if (!c.climbing) return;
      if (exit) {
        // Relê a plataforma (o layout pode ter mudado durante a subida) e salta.
        const to = c.world.surfaces.find((s) => s.el === exit.to.el);
        if (!to) {
          c.leapOffWall(wall.side);
        } else {
          c.anim('leap', true);
          c.letGoWall();
          c.jumpTo(to, clamp(exit.x, to.left + c.halfWidth * 0.6, to.right - c.halfWidth * 0.6));
        }
        yield this.landed;
        yield this.done;
        c.anim(c.rng.chance(0.5) ? 'sit' : 'stand');
        yield c.rng.range(0.4, 1.2);
        return;
      }
      c.anim('ledge', true); // se puxando pela borda
      yield 0.34;
      if (c.topOut()) {
        c.anim('land', true);
        yield this.done;
        c.anim('stand');
        yield c.rng.range(0.3, 0.9);
        return;
      }
      // Sem topo para pisar (a parede do container): sai de lá com um pulo para dentro.
      c.leapOffWall(wall.side);
      yield this.landed;
      yield this.done;
      c.anim('sit');
      yield c.rng.range(0.5, 1.2);
    } finally {
      // Interrompido no meio da escalada (clique, susto, o mundo mudando): solta e cai.
      if (c.climbing) c.letGoWall();
    }
  }

  /**
   * Chamado para um ponto: vai até lá. Anda no mesmo andar, pula para o vizinho e
   * escala a parede quando o ponto está alto demais — e desiste sem drama quando não
   * existe caminho, ficando embaixo do lugar chamado.
   */
  private *goTo(px: number, py: number): Routine {
    const c = this.cat;
    const far = (): number => Math.abs(c.x - px) + Math.abs(c.y - py);
    c.fx('alert');
    c.face(px >= c.x ? 1 : -1);
    yield 0.18;
    for (let step = 0; step < 4; step++) {
      const from = c.support;
      if (!from || !c.grounded) break;
      const before = far();
      const goal = c.world.landingBelow(px, py);
      if (goal.el === from.el) {
        // Mesmo andar: é só andar (correndo, se for longe).
        const target = clamp(px, from.left + c.halfWidth, from.right - c.halfWidth);
        if (Math.abs(target - c.x) > 2) {
          c.walkTo(target, !c.reducedMotion && Math.abs(target - c.x) > 45 * c.scale);
          yield this.arrived;
        }
        break;
      }
      const plan = this.planJump(false, goal);
      if (plan) {
        yield* this.jump(plan);
      } else {
        // Fora do alcance de um pulo: escala uma parede que leve para cima do alvo...
        const wall = this.findWalls()
          .filter((w) => w.wall.top <= goal.y + c.bodyHeight)
          .sort((a, b) => Math.abs(a.standX - px) - Math.abs(b.standX - px))[0];
        const floor = c.world.surfaces[c.world.surfaces.length - 1];
        if (wall && goal.y < from.y) {
          yield* this.scale(wall, goal);
        } else if (floor && from.el !== null && floor.y > from.y) {
          // ...ou desce para o chão, de onde dá para chegar em quase tudo.
          c.face(px >= c.x ? 1 : -1);
          c.jumpTo(floor, clamp(px, c.x - 80 * c.scale, c.x + 80 * c.scale));
          yield this.landed;
          yield this.done;
        } else {
          // Não há caminho: pelo menos fica embaixo do lugar chamado.
          const target = clamp(px, from.left + c.halfWidth, from.right - c.halfWidth);
          if (Math.abs(target - c.x) > 2) {
            c.walkTo(target, !c.reducedMotion);
            yield this.arrived;
          }
          break;
        }
      }
      if (far() >= before - 4) break; // não chegou mais perto: para de insistir
    }
    c.stop();
    c.face(px >= c.x ? 1 : -1);
    c.anim('sit');
    c.fx('heart');
    yield c.rng.range(0.8, 1.6);
  }

  /**
   * Plataformas que dá para alcançar saltando da parede no meio da subida: mais altas do
   * que o pé da escalada, abaixo do topo e do lado para onde ele salta. `y` é a altura em
   * que ele solta a quina.
   */
  private wallExits(wall: Wall, fromY: number): { to: Surface; y: number; x: number }[] {
    const c = this.cat;
    const out: { to: Surface; y: number; x: number }[] = [];
    for (const to of c.world.surfaces) {
      if (to.el !== null && to.el === wall.el) continue; // o topo da própria parede
      if (to.clearance < c.bodyHeight * 0.9) continue;
      if (to.y > fromY - c.bodyHeight) continue; // não é mais alto que o chão de onde saiu
      if (to.y < wall.top + c.bodyHeight) continue; // isso já é o topo da parede
      const lo = to.left + c.halfWidth;
      const hi = to.right - c.halfWidth;
      if (hi < lo) continue;
      const x = wall.side > 0 ? Math.max(lo, wall.x + 4 * c.scale) : Math.min(hi, wall.x - 4 * c.scale);
      if (x < lo || x > hi) continue; // a plataforma não está do lado para onde ele salta
      if (Math.abs(x - wall.x) > c.span) continue;
      out.push({ to, y: to.y - 6 * c.scale, x });
    }
    return out;
  }

  /** Escala uma quina qualquer e, lá de cima, quase sempre emenda um pulo. */
  private *parkour(): Routine {
    const c = this.cat;
    const options = this.findWalls();
    // Prefere a quina de um elemento (que tem topo para pisar) à parede do container.
    const withTop = options.filter((o) => o.wall.el !== null);
    const pick = c.rng.pick(withTop.length && c.rng.chance(0.75) ? withTop : options);
    if (!pick) {
      yield* this.wanderShort();
      return;
    }
    yield* this.scale(pick);
    if (c.grounded && c.rng.chance(0.6)) {
      yield* this.explore(false);
      return;
    }
    c.anim('sit');
    yield c.rng.range(0.6, 1.6);
  }

  private *groom(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('sit');
    yield 0.35;
    c.anim('groom', true);
    yield c.rng.range(3, 7);
    c.anim('sit');
    yield c.rng.range(0.5, 1.2);
  }

  private *nap(): Routine {
    const c = this.cat;
    // Às vezes procura um lugar mais aconchegante (em cima de um elemento) antes.
    if (c.support?.el === null && c.rng.chance(0.65)) {
      const plan = this.planJump(true);
      if (plan) yield* this.jump(plan);
    }
    yield* this.sleepHere();
  }

  private *sleepHere(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('sit');
    yield 0.3;
    c.anim('yawn', true);
    yield this.done;
    // Antes de fechar os olhos, fica deitado abanando o rabo.
    c.anim('loafWag');
    yield c.rng.range(1.8, 3.2);
    this.sleeping = true;
    c.anim('sleep');
    let t = c.rng.range(10, 26);
    while (t > 0) {
      yield 1.9;
      t -= 1.9;
      c.fx('zzz');
    }
    this.sleeping = false;
    c.anim('loafBlink', true);
    yield this.done;
    c.anim('loafWag');
    yield 0.9;
    yield* this.stretch();
  }

  private *stretch(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('stretch', true);
    yield this.done;
    c.anim('yawn', true);
    yield this.done;
    c.anim('sit');
    yield 0.6;
  }

  private *play(): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const p = c.pointer;
    const pointerNear =
      p !== null &&
      performance.now() - p.t < 3000 &&
      p.x > s.left && p.x < s.right &&
      Math.abs(p.y - (c.y - c.bodyHeight / 2)) < c.bodyHeight * 2;
    const toys = c.world.toysNear(s, c.x, 70 * c.scale, c.bodyHeight);
    const choice = c.rng.weighted({
      hunt: 3,
      bat: toys.length ? 3 : s.el ? 1.2 : 0,
      tail: 1.2,
      pointer: pointerNear ? 5 : 0,
    });
    if (choice === 'bat') yield* this.bat(toys);
    else if (choice === 'tail') yield* this.chaseTail();
    else if (choice === 'pointer' && p) yield* this.hunt(p.x);
    else yield* this.hunt();
  }

  /** Espreita, rebola e dá o bote. */
  private *hunt(targetX?: number): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const min = s.left + c.halfWidth;
    const max = s.right - c.halfWidth;
    let tx = targetX ?? c.x + (c.rng.chance(0.5) ? 1 : -1) * c.rng.range(22, 45) * c.scale;
    tx = clamp(tx, min, max);
    if (targetX !== undefined && Math.abs(tx - c.x) > 60 * c.scale) {
      // Longe demais para um bote: chega mais perto de fininho.
      const dir = tx > c.x ? 1 : -1;
      c.walkTo(tx - dir * 40 * c.scale);
      yield this.arrived;
    }
    if (Math.abs(tx - c.x) < 6 * c.scale) {
      yield* this.chaseTail();
      return;
    }
    c.stop();
    c.face(tx > c.x ? 1 : -1);
    c.anim('crouch');
    yield c.rng.range(0.35, 0.8);
    c.anim('wiggle');
    yield c.rng.range(0.6, 1.4);
    c.hop(tx - c.x, c.rng.range(8, 16) * c.scale);
    yield this.landed;
    yield this.done;
    c.anim('bat', true);
    yield c.rng.range(0.9, 1.7);
    c.anim('sit');
    yield 0.7;
  }

  /** Patada por encomenda: procura algo por perto e dá umas patadas. */
  private *batNow(): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    yield* this.bat(c.world.toysNear(s, c.x, 80 * c.scale, c.bodyHeight));
  }

  /** Dá patadas num brinquedo por perto (ou no elemento onde está sentado). */
  private *bat(toys: readonly { el: Element; left: number; right: number }[]): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const toy = c.rng.pick(toys);
    let target: Element | null = s.el;
    if (toy) {
      target = toy.el;
      const right = (toy.left + toy.right) / 2 > c.x;
      const standX = right ? toy.left - c.halfWidth * 0.9 : toy.right + c.halfWidth * 0.9;
      c.walkTo(clamp(standX, s.left + c.halfWidth, s.right - c.halfWidth));
      yield this.arrived;
      c.face(right ? 1 : -1);
    }
    c.stop();
    c.anim('bat', true);
    const swipes = c.rng.int(2, 5);
    for (let i = 0; i < swipes; i++) {
      yield 0.2;
      if (target) c.nudge(target);
      yield 0.38;
    }
    c.anim('sit');
    yield c.rng.range(0.6, 1.4);
  }

  private *chaseTail(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('walk');
    let t = c.rng.range(1.2, 2.2);
    while (t > 0) {
      c.face(c.facing === 1 ? -1 : 1);
      yield 0.16;
      t -= 0.16;
    }
    c.anim('tailFlick', true);
    yield this.done;
    c.anim('sit');
    yield 0.8;
  }

  private *meow(): Routine {
    const c = this.cat;
    c.stop();
    c.anim('meow', true);
    c.say();
    c.fx('heart', 2);
    yield this.done;
    c.anim('sit');
    yield c.rng.range(1, 2);
  }

  private *startled(): Routine {
    const c = this.cat;
    this.sleeping = false;
    c.fx('alert');
    c.anim('sit');
    c.hop(0, 10 * c.scale);
    yield this.landed;
    yield this.done;
    c.anim('sit');
    yield 1.2;
  }

  private *petted(): Routine {
    const c = this.cat;
    const asleep = this.state === 'nap' || this.sleeping;
    c.stop();
    c.anim(asleep ? 'sleep' : c.support ? 'blink' : 'sit', !asleep);
    while (this.petting) {
      c.fx('heart');
      yield 0.7;
    }
    if (!asleep) c.anim('sit');
    yield 0.4;
  }

  private *held(): Routine {
    this.cat.anim('dangle');
    for (;;) yield 1;
  }

  private *afterDrop(): Routine {
    const c = this.cat;
    yield this.landed;
    yield this.done;
    this.setState('idle'); // pousou: para de mostrar "caindo"
    c.anim('sit');
    yield 0.4;
    // Depois de ser carregado, gato que se preze se lambe.
    if (c.rng.chance(0.5)) yield* this.groom();
  }

  private *afterFall(): Routine {
    const c = this.cat;
    yield this.landed;
    yield this.done;
    this.setState('idle');
    c.anim('sit');
    yield c.rng.range(0.6, 1.2);
  }

  // ── Convívio com os outros gatos ──────────────────────────────────────────

  /** Chega perto de outro gato e apronta alguma coisa com ele. */
  private *social(): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const other = c.rng.pick(c.neighbors(150 * c.scale).filter((o) => !o.busy));
    if (!other) {
      yield* this.wander();
      return;
    }
    const side: 1 | -1 = other.x >= c.x ? 1 : -1;
    const spot = clamp(other.x - side * 12 * c.scale, s.left + c.halfWidth, s.right - c.halfWidth);
    if (Math.abs(spot - c.x) > 2) {
      c.walkTo(spot, Math.abs(spot - c.x) > 60 * c.scale);
      yield this.arrived;
    }
    if (!c.grounded) return;
    c.stop();
    c.face(other.x >= c.x ? 1 : -1);
    switch (c.rng.weighted({ greet: 3, swat: 1.6, chase: 1.5, rest: 1.2 })) {
      case 'swat':
        c.meet('swat', other);
        c.anim('bat', true);
        yield 0.45;
        other.spook(c.x);
        yield 0.9;
        c.anim('sit');
        yield c.rng.range(0.6, 1.2);
        break;
      case 'chase':
        c.meet('chase', other);
        yield* this.chase(other);
        break;
      case 'rest':
        // Deita do lado do outro.
        c.meet('rest', other);
        other.greet(c.x);
        c.anim('loafWag');
        yield c.rng.range(3, 6);
        c.anim('sit');
        yield 0.5;
        break;
      default:
        c.meet('greet', other);
        other.greet(c.x);
        c.anim('sit');
        c.fx('heart');
        yield 0.6;
        if (c.rng.chance(0.5)) {
          c.anim('meow', true);
          c.say();
          yield this.done;
          c.anim('sit');
        }
        yield c.rng.range(1, 2);
        break;
    }
  }

  /** Pega-pega: ele corre atrás e o outro sai de perto. */
  private *chase(other: Pet): Routine {
    const c = this.cat;
    const rounds = c.rng.int(2, 3);
    for (let i = 0; i < rounds; i++) {
      const s = c.support;
      if (!s || other.busy) break;
      other.flee(c.x);
      yield 0.35;
      const dir: 1 | -1 = other.x >= c.x ? 1 : -1;
      c.walkTo(clamp(other.x - dir * 12 * c.scale, s.left + c.halfWidth, s.right - c.halfWidth), true);
      yield this.arrived;
    }
    c.stop();
    c.anim('sit');
    yield c.rng.range(0.6, 1.2);
  }

  /** Foi cumprimentado: olha para quem chamou e retribui. */
  greeted(dir: 1 | -1): void {
    this.run(this.greetBack(dir), 'greet');
  }

  /** Levou uma patadinha de outro gato. */
  spooked(dir: 1 | -1): void {
    this.run(this.jumpBack(dir), 'startled');
  }

  /** Está sendo perseguido: sai correndo. */
  fleeFrom(dir: 1 | -1): void {
    this.run(this.runAway(dir), 'fleeing');
  }

  private *greetBack(dir: 1 | -1): Routine {
    const c = this.cat;
    c.stop();
    c.face(dir);
    c.anim('sit');
    yield 0.4;
    c.fx('heart');
    yield c.rng.range(1.2, 2.4);
  }

  private *jumpBack(dir: 1 | -1): Routine {
    const c = this.cat;
    c.stop();
    c.face(dir);
    c.fx('alert');
    c.hop(-dir * 10 * c.scale, 8 * c.scale);
    yield this.landed;
    yield this.done;
    c.anim('sit');
    yield c.rng.range(0.6, 1.2);
  }

  private *runAway(dir: 1 | -1): Routine {
    const c = this.cat;
    const s = c.support;
    if (!s) return;
    const away = clamp(c.x - dir * c.rng.range(30, 70) * c.scale, s.left + c.halfWidth, s.right - c.halfWidth);
    c.walkTo(away, true);
    yield this.arrived;
    c.anim('sit');
    yield c.rng.range(0.4, 1);
  }

  // ── Planejamento de pulos ─────────────────────────────────────────────────

  /**
   * Escolhe uma superfície alcançável e de onde pular. `cozy` = só elementos acima;
   * `only` = tenta apenas aquela superfície (é assim que ele vai ao ponto chamado).
   */
  private planJump(cozy: boolean, only?: Surface): JumpPlan | null {
    const c = this.cat;
    const from = c.support;
    if (!from || !c.grounded) return null;
    const maxUp = c.rise;
    const maxX = c.span;
    const fromMin = from.left + c.halfWidth;
    const fromMax = from.right - c.halfWidth;
    const options: { to: Surface; w: number }[] = [];
    let total = 0;

    for (const to of c.world.surfaces) {
      if (to === from || (to.el !== null && to.el === from.el)) continue;
      if (only && to.el !== only.el) continue;
      const lo = to.left + c.halfWidth;
      const hi = to.right - c.halfWidth;
      if (hi - lo < 2 || to.clearance < c.bodyHeight * 0.9) continue;
      const dy = from.y - to.y; // > 0: para cima
      if (dy > maxUp || Math.abs(dy) < 6) continue;
      if (cozy && (dy < 0 || to.el === null)) continue;
      const gap = Math.max(0, lo - fromMax, fromMin - hi);
      if (gap > maxX) continue;
      let w = dy > 0 ? 1.5 : 0.8;
      if (to.el) w *= 1.3;
      w /= 1 + gap / (c.span * 0.45) + Math.abs(dy) / (c.rise * 0.9); // perto é mais provável
      options.push({ to, w });
      total += w;
    }
    if (!options.length) return null;

    let roll = c.rng.next() * total;
    let chosen = options[0]!.to;
    for (const o of options) {
      roll -= o.w;
      if (roll < 0) {
        chosen = o.to;
        break;
      }
    }

    const x = c.rng.range(chosen.left + c.halfWidth, chosen.right - c.halfWidth);
    const dir = x >= c.x ? 1 : -1;
    let launchX = clamp(x - dir * c.rng.range(14, 34) * c.scale, fromMin, fromMax);
    if (Math.abs(x - launchX) > maxX) launchX = clamp(x - dir * maxX * 0.9, fromMin, fromMax);
    if (Math.abs(x - launchX) > maxX) return null;
    return { from, to: chosen, x, launchX };
  }
}
