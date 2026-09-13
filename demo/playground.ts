import { Kitten, PALETTES, type ActionName, type PaletteName } from '../src';

type PieceKind = 'box' | 'button' | 'shelf' | 'toy';

const STATE_LABEL: Record<string, string> = {
  idle: 'sentado', loaf: 'deitado', wander: 'passeando', explore: 'explorando', climb: 'escalando a parede',
  called: 'indo até você',
  groom: 'se limpando',
  nap: 'dormindo', play: 'brincando', bat: 'dando patada', social: 'de olho no outro',
  greet: 'cumprimentando', fleeing: 'fugindo', stretch: 'se espreguiçando', meow: 'miando',
  held: 'no colo', falling: 'caindo', petted: 'ganhando carinho', startled: 'assustado',
};
const NAMES = ['Mingau', 'Paçoca', 'Tapioca', 'Cacau', 'Pipoca', 'Farofa', 'Quindim', 'Biscoito', 'Sushi', 'Nescau'];

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

const sandbox = $('#sandbox');
const overlay = $('#surfaces');
const coatSelect = $<HTMLSelectElement>('#coat');
const scaleSelect = $<HTMLSelectElement>('#scale');
const speedInput = $<HTMLInputElement>('#speed');
const speedOut = $<HTMLOutputElement>('#speed-out');
const seedInput = $<HTMLInputElement>('#seed');
const debug = $<HTMLInputElement>('#debug');
const interactive = $<HTMLInputElement>('#interactive');
const nudge = $<HTMLInputElement>('#nudge');
const summon = $<HTMLInputElement>('#summon');
const platforms = $<HTMLSelectElement>('#platforms');
const roster = $('#roster');

interface CatEntry {
  cat: Kitten;
  coat: PaletteName;
  scale: number;
  speed: number;
  seed: number | undefined;
}
const cats: CatEntry[] = [];
let named = 0;

for (const name of Object.keys(PALETTES)) {
  coatSelect.add(new Option(name, name));
}

// ── Gatos ────────────────────────────────────────────────────────────────

function spawn(entry: Omit<CatEntry, 'cat'>, name: string): void {
  const cat = new Kitten(sandbox, {
    coat: entry.coat,
    scale: entry.scale,
    speed: entry.speed,
    seed: entry.seed,
    name,
    interactive: interactive.checked,
    nudge: nudge.checked,
    summon: summon.checked,
    platforms: platforms.value,
  });
  cats.push({ ...entry, cat });
}

function addCat(): void {
  const seed = seedInput.value.trim() === '' ? undefined : Number(seedInput.value);
  spawn(
    {
      coat: coatSelect.value as PaletteName,
      scale: Number(scaleSelect.value),
      speed: Number(speedInput.value),
      seed,
    },
    NAMES[named++ % NAMES.length]!,
  );
  renderRoster();
}

function clearCats(): void {
  for (const entry of cats.splice(0)) entry.cat.destroy();
  renderRoster();
}

/** Opções de criação mudaram: recria cada gato com as mesmas escolhas. */
function recreate(): void {
  const previous = cats.splice(0);
  for (const { cat, ...entry } of previous) {
    cat.destroy();
    spawn(entry, cat.name);
  }
  renderRoster();
}

function renderRoster(): void {
  if (!cats.length) {
    roster.innerHTML = '<li class="empty">Nenhum gato. Adicione um acima.</li>';
    return;
  }
  roster.innerHTML = cats
    .map(({ cat, coat }) => {
      const state = STATE_LABEL[cat.state] ?? cat.state;
      return `<li><span><b>${cat.name}</b> · ${coat} · ${state}</span><span class="pct">${Math.round(cat.energy * 100)}%</span></li>`;
    })
    .join('');
}

// ── Elementos arrastáveis ────────────────────────────────────────────────

const rand = (min: number, max: number): number => Math.round(min + Math.random() * (max - min));

function addPiece(kind: PieceKind, at?: { x: number; y: number; w?: number; h?: number }): HTMLElement {
  const el = document.createElement(kind === 'button' ? 'button' : 'div');
  el.className = `piece ${kind}`;
  const W = sandbox.clientWidth;
  const H = sandbox.clientHeight;
  let w = at?.w ?? 0;
  let h = at?.h ?? 0;
  if (kind === 'box') {
    el.textContent = 'caixa';
    w ||= rand(110, 200);
    h ||= rand(56, 110);
  } else if (kind === 'shelf') {
    el.dataset.kittenPlatform = '';
    w ||= rand(140, 260);
    h ||= 12;
  } else if (kind === 'toy') {
    el.dataset.kittenToy = '';
    el.setAttribute('aria-label', 'Brinquedo');
  } else {
    el.textContent = 'Botão';
    (el as HTMLButtonElement).type = 'button';
  }
  if (w) el.style.width = `${w}px`;
  if (kind !== 'button' && kind !== 'toy' && h) el.style.height = `${h}px`;
  const x = at?.x ?? rand(16, Math.max(16, W - (w || 90) - 16));
  const y = at?.y ?? rand(60, Math.max(60, H - (h || 40) - 40));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  draggable(el);
  sandbox.insertBefore(el, overlay);
  return el;
}

function draggable(el: HTMLElement): void {
  let grab: { id: number; dx: number; dy: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    grab = { id: e.pointerId, dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop };
  });
  el.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const maxX = sandbox.clientWidth - el.offsetWidth;
    const maxY = sandbox.clientHeight - el.offsetHeight;
    el.style.left = `${Math.min(maxX, Math.max(0, e.clientX - grab.dx))}px`;
    el.style.top = `${Math.min(maxY, Math.max(0, e.clientY - grab.dy))}px`;
  });
  const drop = (e: PointerEvent): void => {
    if (grab?.id === e.pointerId) grab = null;
  };
  el.addEventListener('pointerup', drop);
  el.addEventListener('pointercancel', drop);
  el.addEventListener('dblclick', () => el.remove());
}

function clearPieces(): void {
  sandbox.querySelectorAll('.piece').forEach((p) => p.remove());
}

function initialScene(): void {
  clearPieces();
  const W = sandbox.clientWidth;
  const H = sandbox.clientHeight;
  addPiece('box', { x: Math.round(W * 0.08), y: H - 150, w: 170, h: 70 });
  addPiece('shelf', { x: Math.round(W * 0.3), y: H - 290, w: 220 });
  addPiece('box', { x: Math.round(W * 0.6), y: H - 200, w: 150, h: 96 });
  addPiece('shelf', { x: Math.round(W * 0.62), y: H - 390, w: 180 });
  addPiece('button', { x: Math.round(W * 0.12), y: H - 330 });
  addPiece('toy', { x: Math.round(W * 0.42), y: H - 60 });
}

// ── Superfícies (debug) ──────────────────────────────────────────────────

function drawSurfaces(): void {
  const cat = cats[0]?.cat;
  if (!debug.checked || !cat) {
    if (overlay.childElementCount) overlay.replaceChildren();
    return;
  }
  const lines = cat.world.surfaces.map((s) => {
    const line = document.createElement('div');
    line.className = s.el ? 'surf' : 'surf floor';
    line.style.left = `${s.left}px`;
    line.style.top = `${s.y}px`;
    line.style.width = `${s.right - s.left}px`;
    if (s.el) line.dataset.label = `${Math.round(s.clearance)}px livres`;
    return line;
  });
  overlay.replaceChildren(...lines);
}

// ── Controles ────────────────────────────────────────────────────────────

$('#add').addEventListener('click', addCat);
$('#clear-cats').addEventListener('click', clearCats);
$('#clear-pieces').addEventListener('click', clearPieces);
$('#reset').addEventListener('click', initialScene);

document.querySelectorAll<HTMLButtonElement>('[data-piece]').forEach((b) =>
  b.addEventListener('click', () => addPiece(b.dataset.piece as PieceKind)),
);
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) =>
  b.addEventListener('click', () => cats.forEach(({ cat }) => cat.do(b.dataset.action as ActionName))),
);

speedInput.addEventListener('input', () => (speedOut.value = `${speedInput.value}×`));
for (const input of [interactive, nudge, platforms]) input.addEventListener('change', recreate);

window.setInterval(drawSurfaces, 200);
window.setInterval(renderRoster, 600);

// ── Início ───────────────────────────────────────────────────────────────

initialScene();
addCat();

// Para testar pelo console: kittens[0].cat.do('jump'), kittens[0].cat.world.surfaces...
Object.assign(window, { kittens: cats });
