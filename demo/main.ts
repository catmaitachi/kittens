import { FRAMES, Kitten, PALETTES, type ActionName, type KittenEventDetail, type PaletteName } from '../src';

const STATE_LABEL: Record<string, string> = {
  idle: 'sentado',
  loaf: 'deitado',
  wander: 'passeando',
  explore: 'explorando',
  climb: 'escalando a parede',
  called: 'indo até você',
  groom: 'se limpando',
  nap: 'dormindo',
  play: 'brincando',
  bat: 'dando patada',
  social: 'de olho no outro',
  greet: 'cumprimentando',
  fleeing: 'fugindo',
  stretch: 'se espreguiçando',
  meow: 'miando',
  held: 'no colo',
  falling: 'caindo',
  petted: 'ganhando carinho',
  startled: 'assustado',
};

const COAT_LABEL: Record<PaletteName, string> = {
  calico: 'Calico',
  laranja: 'Laranja',
  preto: 'Preto',
  cinza: 'Cinza',
  siames: 'Siamês',
};

const NAMES = ['Mingau', 'Paçoca', 'Tapioca', 'Cacau', 'Pipoca', 'Farofa', 'Quindim', 'Biscoito'];

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

const stage = $('#stage');
const stateEl = $('#state');
const energyEl = $('#energy');
const logEl = $('#log');
const countEl = $('#count');

let scale = 3;
let coat: PaletteName = 'calico';
const cats: Kitten[] = [];
const coats = new WeakMap<Kitten, PaletteName>();
let watched: Kitten | null = null;

// ── Gatos ────────────────────────────────────────────────────────────────

function adopt(withCoat: PaletteName = coat, name = NAMES[cats.length % NAMES.length]): Kitten {
  const cat = new Kitten(stage, { coat: withCoat, scale, name, summon: true });
  coats.set(cat, withCoat);
  cats.push(cat);
  if (!watched) watch(cat);
  updateCount();
  return cat;
}

function watch(cat: Kitten | null): void {
  watched = cat;
  stateEl.textContent = cat ? (STATE_LABEL[cat.state] ?? cat.state) : '—';
}

function updateCount(): void {
  countEl.textContent = cats.length === 1 ? '1 gato' : `${cats.length} gatos`;
  $<HTMLButtonElement>('#release').disabled = cats.length === 0;
}

function describe(el: unknown): string {
  if (!(el instanceof Element)) return 'o chão';
  const named = el.closest<HTMLElement>('[data-name]');
  return named ? `“${named.dataset.name}”` : `<${el.tagName.toLowerCase()}>`;
}

// ── Registro de eventos (os eventos `kitten:*` borbulham até o palco) ───

function log(html: string): void {
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  li.innerHTML = `<time>${time}</time><span>${html}</span>`;
  logEl.prepend(li);
  while (logEl.children.length > 30) logEl.lastElementChild?.remove();
}

const on = (type: string, fn: (d: KittenEventDetail) => void): void =>
  stage.addEventListener(type, (e) => fn((e as CustomEvent<KittenEventDetail>).detail));

on('kitten:statechange', (d) => {
  const label = STATE_LABEL[String(d.state)] ?? String(d.state);
  if (d.cat === watched) stateEl.textContent = label;
  log(`<b>${d.cat.name}</b> ${label}`);
});
on('kitten:meow', (d) => log(`<b>${d.cat.name}</b> disse “${String(d.text)}”`));
on('kitten:nudge', (d) => log(`<b>${d.cat.name}</b> deu uma patada em ${describe(d.element)}`));
on('kitten:land', (d) => {
  if (Number(d.height) > 60 && d.element) log(`<b>${d.cat.name}</b> pousou em ${describe(d.element)}`);
});
const SOCIAL: Record<string, string> = {
  greet: 'foi dizer oi para',
  swat: 'deu uma patadinha em',
  chase: 'saiu correndo atrás de',
  rest: 'foi deitar do lado de',
};
on('kitten:social', (d) => log(`<b>${d.cat.name}</b> ${SOCIAL[String(d.kind)] ?? 'interagiu com'} <b>${String(d.other)}</b>`));
on('kitten:pet', (d) => log(`<b>${d.cat.name}</b> está ronronando`));
on('kitten:grab', (d) => log(`<b>${d.cat.name}</b> foi pego no colo`));

window.setInterval(() => {
  const level = Math.round((watched?.energy ?? 0) * 100);
  energyEl.style.setProperty('--level', `${level}%`);
  energyEl.setAttribute('aria-valuenow', String(level));
}, 500);

// ── Controles ────────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    for (const cat of cats) cat.do(button.dataset.action as ActionName);
  });
});

const coatsEl = $('#coats');
for (const [name, palette] of Object.entries(PALETTES) as [PaletteName, (typeof PALETTES)[PaletteName]][]) {
  const label = document.createElement('label');
  label.className = 'coat';
  label.innerHTML = `
    <input type="radio" name="coat" value="${name}" ${name === coat ? 'checked' : ''} />
    <span class="swatch" aria-hidden="true"><i style="background:${palette.w}"></i><i style="background:${palette.o}"></i><i style="background:${palette.d}"></i></span>
    ${COAT_LABEL[name]}`;
  coatsEl.append(label);
}
coatsEl.addEventListener('change', (e) => {
  coat = (e.target as HTMLInputElement).value as PaletteName;
});

$('#adopt').addEventListener('click', () => {
  const cat = adopt();
  log(`<b>${cat.name}</b> chegou`);
});

$('#release').addEventListener('click', () => {
  const cat = cats.pop();
  if (!cat) return;
  cat.destroy();
  log(`<b>${cat.name}</b> foi embora`);
  if (cat === watched) watch(cats[0] ?? null);
  updateCount();
});

document.querySelectorAll<HTMLInputElement>('input[name="scale"]').forEach((input) => {
  input.addEventListener('change', () => {
    scale = Number(input.value);
    // O tamanho muda a física (pulo, velocidade), então os gatos renascem.
    const previous = cats.splice(0).map((cat) => {
      cat.destroy();
      return { coat: coats.get(cat) ?? 'calico', name: cat.name };
    });
    watched = null;
    for (const p of previous) adopt(p.coat, p.name);
  });
});

$('#shuffle').addEventListener('click', () => stage.classList.toggle('is-shuffled'));

const stats = $('#stats');
const toggle = $<HTMLButtonElement>('#toggle');
toggle.addEventListener('click', () => {
  stats.hidden = !stats.hidden;
  toggle.textContent = stats.hidden ? 'Mostrar “Sonecas”' : 'Esconder “Sonecas”';
});

stage.querySelectorAll('.toy').forEach((toy) =>
  toy.addEventListener('click', () => watched?.do('play')),
);

// ── Favicon: a cabeça do gato, tirada dos mesmos frames ──────────────────

function favicon(): void {
  const rows = FRAMES.sit.rows.slice(0, 9).map((r) => r.slice(9, 20));
  const canvas = document.createElement('canvas');
  const px = 4;
  canvas.width = canvas.height = 12 * px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const palette = PALETTES.calico as Record<string, string>;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect((x + 0.5) * px, (y + 1.5) * px, px, px);
    }),
  );
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = canvas.toDataURL('image/png');
  document.head.append(link);
}

// ── Início ───────────────────────────────────────────────────────────────

favicon();
adopt('calico', 'Mingau');
// Dois gatos já de cara: eles se cumprimentam, se perseguem e cochilam juntos.
adopt('siames', 'Jade');

// Para brincar pelo console: kittens[0].do('sleep')
Object.assign(window, { kittens: cats });
