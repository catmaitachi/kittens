/**
 * O "mundo" de um container: lê os elementos que estão dentro dele e os transforma em
 * superfícies onde o gato pode pisar (o topo de cada elemento + o chão), quinas verticais
 * para escalar e brinquedos para dar patada.
 *
 * Um mundo é compartilhado por todos os gatos do mesmo container, e a leitura do layout
 * é preguiçosa: observers só marcam "sujo", e o recálculo acontece no máximo uma vez por
 * frame, quando algum gato precisa das superfícies.
 */

export interface Box {
  readonly el: Element;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  /** Pequeno o bastante para levar patada. */
  readonly toy: boolean;
}

/**
 * Uma quina vertical de um elemento: por onde o gato sobe. `x` é a face (a beirada
 * onde ele se abraça) e `side` diz de que lado do elemento ela está.
 */
export interface Wall {
  /** Elemento dono da face; `null` = a parede interna do próprio container. */
  readonly el: Element | null;
  /** Posição da face, em px do palco. */
  readonly x: number;
  /** -1 = face esquerda do elemento, 1 = face direita. */
  readonly side: 1 | -1;
  /** Topo da parede (onde dá para se puxar) e até onde ela desce. */
  readonly top: number;
  readonly bottom: number;
}

export interface Surface {
  /** Elemento dono do topo; `null` = chão do container. */
  readonly el: Element | null;
  readonly left: number;
  readonly right: number;
  /** Altura onde as patas pisam (topo do elemento), em px do palco. */
  readonly y: number;
  /** Espaço livre acima (até outro elemento ou o teto). */
  readonly clearance: number;
}

/**
 * Um gato visto pelos outros gatos. `Kitten` implementa esta interface, e é assim
 * que eles se cumprimentam, se perseguem e dão patadinha um no outro.
 */
export interface Pet {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly grounded: boolean;
  readonly support: Surface | null;
  /** No colo, caindo ou sem interação: não dá para chamar agora. */
  readonly busy: boolean;
  /** Alguém veio dizer oi (passa o x de quem chamou). */
  greet(fromX: number): void;
  /** Levou uma patadinha de brincadeira. */
  spook(fromX: number): void;
  /** Está sendo perseguido: sai de perto. */
  flee(fromX: number): void;
}

const petsByContainer = new WeakMap<Element, Set<Pet>>();
const NO_PETS: ReadonlySet<Pet> = new Set();

/** Entra na turma do container. Devolve a função que sai dela. */
export function joinContainer(container: Element, pet: Pet): () => void {
  let group = petsByContainer.get(container);
  if (!group) petsByContainer.set(container, (group = new Set()));
  group.add(pet);
  return () => {
    group!.delete(pet);
    if (group!.size === 0) petsByContainer.delete(container);
  };
}

/** Todos os gatos que moram no mesmo container. */
export function petsIn(container: Element): ReadonlySet<Pet> {
  return petsByContainer.get(container) ?? NO_PETS;
}

/** Tags que sempre contam como sólidas (têm "caixa" visível). */
const SOLID_TAGS = new Set([
  'IMG', 'PICTURE', 'CANVAS', 'VIDEO', 'IFRAME', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
  'HR', 'PROGRESS', 'METER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'svg',
]);

/** Camadas dos gatos e trechos marcados para ignorar: nunca viram plataforma. */
export const LAYER_ATTR = 'data-kitten-layer';
const IGNORED = `[${LAYER_ATTR}], [data-kitten-ignore]`;

const MAX_ELEMENTS = 600;
const MIN_WIDTH = 18;
/** Abaixo disso não é parede, é degrau: o gato pula e pronto. */
const MIN_WALL = 30;
const RESCAN_INTERVAL = 1500;
const MIN_INTERVAL = 80;

function isTransparent(color: string): boolean {
  // Só alfa zero: `rgb(255, 0, 0)` também termina em ", 0)" e é vermelho, não transparente.
  return color === 'transparent' || /^rgba\(.*,\s*0\)$|\/\s*0\)$/.test(color);
}

function isVisible(el: Element): boolean {
  const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (check) return check.call(el, { opacityProperty: true, visibilityProperty: true });
  const cs = getComputedStyle(el);
  return cs.visibility === 'visible' && Number(cs.opacity) > 0.05;
}

/** No modo automático, só conta o que tem borda de cima visível para o olho. */
function looksSolid(el: Element): boolean {
  if (SOLID_TAGS.has(el.tagName) || el.hasAttribute('data-kitten-platform')) return true;
  const cs = getComputedStyle(el);
  if (cs.backgroundImage !== 'none' || !isTransparent(cs.backgroundColor)) return true;
  if (cs.boxShadow !== 'none') return true;
  return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !isTransparent(cs.borderTopColor);
}

export class World {
  private static registry = new WeakMap<Element, Map<string, World>>();

  /** Mundo compartilhado para `container` + `selector`. Libere com `release()`. */
  static acquire(container: HTMLElement, selector: string): World {
    let bySelector = World.registry.get(container);
    if (!bySelector) World.registry.set(container, (bySelector = new Map()));
    let world = bySelector.get(selector);
    if (!world) bySelector.set(selector, (world = new World(container, selector)));
    world.refs++;
    return world;
  }

  readonly container: HTMLElement;
  /** `true` quando o container é a página inteira (camada `position: fixed`). */
  readonly page: boolean;
  /** Muda a cada recálculo; os gatos usam para saber se precisam se reencontrar. */
  version = 0;
  width = 0;
  height = 0;
  surfaces: Surface[] = [];
  /** Quinas verticais em que dá para se agarrar e subir. */
  walls: Wall[] = [];
  boxes: Box[] = [];

  private readonly selector: string;
  private refs = 0;
  private dirty = true;
  /** -Infinity garante que a primeira leitura sempre acontece, mesmo logo após a navegação. */
  private lastScan = Number.NEGATIVE_INFINITY;
  /** Rolagem que mexe nas superfícies: a da página inteira ou só a do container (e de dentro dele). */
  private readonly scrollTarget: EventTarget;
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  private readonly observed = new Set<Element>();
  private readonly markDirty = (): void => void (this.dirty = true);

  private constructor(container: HTMLElement, selector: string) {
    this.container = container;
    this.selector = selector;
    this.page = container === document.body || container === document.documentElement;

    this.resizeObserver = new ResizeObserver(this.markDirty);
    this.resizeObserver.observe(container);
    this.mutationObserver = new MutationObserver((records) => {
      // Ignora mudanças nas camadas dos gatos e em trechos marcados com data-kitten-ignore.
      if (records.some((r) => !(r.target instanceof Element && r.target.closest(IGNORED)))) this.dirty = true;
    });
    this.mutationObserver.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open', 'data-kitten-platform', 'data-kitten-ignore'],
    });
    window.addEventListener('resize', this.markDirty, { passive: true });
    // Num container, rolar a página não muda nada em coordenadas do palco (a origem é lida na
    // hora): só a rolagem dele ou de algo dentro dele. `scroll` não borbulha, daí o capture.
    this.scrollTarget = this.page ? window : container;
    this.scrollTarget.addEventListener('scroll', this.markDirty, { passive: true, capture: true });
  }

  release(): void {
    if (--this.refs > 0) return;
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
    window.removeEventListener('resize', this.markDirty);
    this.scrollTarget.removeEventListener('scroll', this.markDirty, { capture: true });
    World.registry.get(this.container)?.delete(this.selector);
  }

  /** Pede um recálculo no próximo frame. */
  invalidate(): void {
    this.dirty = true;
  }

  /** Converte coordenadas de viewport (eventos de mouse) para o palco. */
  toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const o = this.origin();
    return { x: clientX - o.x, y: clientY - o.y };
  }

  /** Recalcula se algo mudou (ou a cada ~1,5 s, para pegar animações CSS). */
  update(now: number): boolean {
    const elapsed = now - this.lastScan;
    // Sujo: no máximo um recálculo a cada MIN_INTERVAL (scroll dispara muitos eventos).
    if (this.dirty ? elapsed < MIN_INTERVAL : elapsed < RESCAN_INTERVAL) return false;
    this.scan();
    this.lastScan = now;
    this.dirty = false;
    return true;
  }

  /** Origem do palco (canto do padding box do container) em coordenadas de viewport. */
  private origin(): { x: number; y: number } {
    if (this.page) return { x: 0, y: 0 };
    const c = this.container;
    const r = c.getBoundingClientRect();
    return { x: r.left + c.clientLeft - c.scrollLeft, y: r.top + c.clientTop - c.scrollTop };
  }

  private scan(): void {
    const c = this.container;
    const auto = this.selector === 'auto';
    this.width = this.page ? document.documentElement.clientWidth : c.clientWidth;
    this.height = this.page ? window.innerHeight : c.clientHeight;
    const { x: ox, y: oy } = this.origin();

    const list = auto ? c.querySelectorAll('*') : c.querySelectorAll(this.selector);
    const found: Box[] = [];
    const set = new Set<Element>();

    // O limite conta caixas aceitas, não elementos lidos: numa página longa, o que está na tela
    // pode vir depois dos primeiros 600 do documento.
    // ponytail: um getBoundingClientRect por elemento a cada leitura; se DOMs de dezenas de
    // milhares de nós pesarem, podar subárvores fora do palco com um TreeWalker.
    for (const el of list) {
      if (found.length >= MAX_ELEMENTS) break;
      if (el instanceof SVGElement && el.tagName !== 'svg') continue;
      const r = el.getBoundingClientRect();
      if (r.width < MIN_WIDTH || r.height < 4) continue;
      const left = r.left - ox;
      const top = r.top - oy;
      const right = left + r.width;
      const bottom = top + r.height;
      if (right < 0 || left > this.width || bottom < 0 || top > this.height) continue;
      // Ignora "fundos": caixas que ocupam quase o palco inteiro.
      if (r.width > this.width * 0.97 && r.height > this.height * 0.85) continue;
      if (el.closest(IGNORED)) continue;
      if (auto && !looksSolid(el)) continue;
      if (!isVisible(el)) continue;
      const toy = el.hasAttribute('data-kitten-toy') || (r.width <= 180 && r.height <= 120);
      found.push({ el, left, right, top, bottom, toy });
      set.add(el);
    }

    // No modo automático, um elemento dentro de outro sólido fica "coberto":
    // o gato pisa no card, não no título dentro dele.
    const boxes = auto
      ? found.filter((b) => {
          for (let p = b.el.parentElement; p && p !== c; p = p.parentElement) if (set.has(p)) return false;
          return true;
        })
      : found;

    const surfaces: Surface[] = [];
    for (const b of boxes) {
      if (b.top < 8) continue;
      let clearance = b.top;
      for (const o of boxes) {
        if (o === b || o.right <= b.left + 4 || o.left >= b.right - 4) continue;
        if (o.bottom <= b.top + 2 && o.top < b.top) clearance = Math.min(clearance, b.top - o.bottom);
      }
      const left = Math.max(0, b.left);
      const right = Math.min(this.width, b.right);
      if (right - left >= MIN_WIDTH) surfaces.push({ el: b.el, left, right, y: b.top, clearance });
    }
    surfaces.push({ el: null, left: 0, right: this.width, y: this.height, clearance: this.height });

    // Paredes: as duas faces verticais de cada caixa alta o bastante para valer a escalada.
    const walls: Wall[] = [];
    for (const b of boxes) {
      if (b.top < 8) continue;
      const bottom = Math.min(this.height, b.bottom);
      if (bottom - b.top < MIN_WALL) continue;
      if (b.left > 2 && b.left < this.width - 2) walls.push({ el: b.el, x: b.left, side: -1, top: b.top, bottom });
      if (b.right > 2 && b.right < this.width - 2) walls.push({ el: b.el, x: b.right, side: 1, top: b.top, bottom });
    }
    // As duas paredes internas do container: dá para subir por elas e pular lá de cima.
    if (this.height >= MIN_WALL * 2) {
      walls.push({ el: null, x: 0, side: 1, top: 0, bottom: this.height });
      walls.push({ el: null, x: this.width, side: -1, top: 0, bottom: this.height });
    }

    // Observa o tamanho dos elementos relevantes para saber quando recalcular.
    for (const b of boxes) {
      if (!this.observed.has(b.el)) {
        this.resizeObserver.observe(b.el);
        this.observed.add(b.el);
      }
    }
    if (this.observed.size > boxes.length * 2 + 50) {
      for (const el of this.observed) if (!set.has(el) && el !== c) this.resizeObserver.unobserve(el);
      this.observed.clear();
      for (const b of boxes) this.observed.add(b.el);
    }

    this.boxes = boxes;
    this.surfaces = surfaces;
    this.walls = walls;
    this.version++;
  }

  /** Primeira superfície abaixo de `fromY` na coluna `x` (onde um gato caindo pousa). */
  landingBelow(x: number, fromY: number): Surface {
    let best: Surface | null = null;
    for (const s of this.surfaces) {
      if (x < s.left || x > s.right || s.y < fromY) continue;
      if (!best || s.y < best.y) best = s;
    }
    return best ?? this.surfaces[this.surfaces.length - 1]!;
  }

  /** Brinquedos ao alcance da pata de quem está em `s`, perto de `x`. */
  toysNear(s: Surface, x: number, reach: number, catHeight: number): Box[] {
    return this.boxes.filter(
      (b) =>
        b.toy &&
        b.el !== s.el &&
        b.bottom >= s.y - catHeight && b.top <= s.y + 2 &&
        b.right >= x - reach && b.left <= x + reach,
    );
  }
}
