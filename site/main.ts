import { Kitten } from '../src/index.ts';
import type { BehaviorWeights, KittenOptions, PaletteName } from '../src/index.ts';
import { lang, onLang, setLang, t, type Key, type Lang } from './i18n.ts';
import { iconSvg, paintIcons } from './icons.ts';

const byId = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} não existe na página`);
  return el;
};

/* ---------- papel rasgado ---------- */

/** Contorno rasgado em `clip-path`: posições em %, rasgo em px, então acompanha o tamanho. */
function tornClip(amp: number, n = 24): string {
  const j = (): string => (Math.random() * amp).toFixed(1);
  const side = Math.max(4, Math.round(n / 3));
  const pts: string[] = [];
  for (let i = 0; i < n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${j()}px`);
  for (let i = 0; i < side; i++) pts.push(`calc(100% - ${j()}px) ${((i / side) * 100).toFixed(2)}%`);
  for (let i = 0; i < n; i++) pts.push(`${(100 - (i / n) * 100).toFixed(2)}% calc(100% - ${j()}px)`);
  for (let i = 0; i < side; i++) pts.push(`${j()}px ${(100 - (i / side) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}

/**
 * Ruído de papel desenhado uma vez num canvas. Um SVG com feTurbulence no background seria
 * rasterizado de novo a cada pintura, e a página tem muito papel.
 */
function grain(): void {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random();
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v < 0.5 ? 0 : 255;
    img.data[i + 3] = Math.round(Math.abs(v - 0.5) * 34);
  }
  ctx.putImageData(img, 0, 0);
  canvas.toBlob((blob) => {
    if (blob) document.documentElement.style.setProperty('--grain', `url(${URL.createObjectURL(blob)})`);
  });
}

function tear(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('.cut')) {
    // Texto solto vira .ink para ficar por cima do papel.
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const ink = document.createElement('span');
        ink.className = 'ink';
        node.replaceWith(ink);
        ink.append(node);
      }
    }
    const fiber = document.createElement('i');
    fiber.className = 'fiber';
    fiber.style.clipPath = tornClip(6);
    const face = document.createElement('i');
    face.className = 'face';
    face.style.clipPath = tornClip(3);
    el.prepend(fiber, face);
  }
  for (const el of root.querySelectorAll<HTMLElement>('.torn')) {
    el.style.clipPath = tornClip(Number(el.dataset.amp ?? 7), 60);
    const shadow = el.previousElementSibling;
    if (shadow instanceof HTMLElement && shadow.classList.contains('sheet-shadow')) shadow.style.clipPath = el.style.clipPath;
  }
  for (const el of root.querySelectorAll<HTMLElement>('.tape')) el.style.clipPath = tornClip(2, 10);
}

/* ---------- código dos palcos ---------- */

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Realce mínimo: comentários, strings e algumas palavras-chave. */
function highlight(src: string): string {
  return esc(src).replace(
    /(\/\/.*)|('[^']*'|"[^"]*")|\b(import|from|const|new|for|of)\b/g,
    (m, comment?: string, str?: string) => `<span class="${comment ? 'c' : str ? 's' : 'k'}">${m}</span>`,
  );
}

const show = (id: string, src: string): void => {
  byId(id).innerHTML = highlight(src);
};

/* ---------- gatos ---------- */

const small = matchMedia('(max-width: 640px)').matches;
const SCALE = small ? 2 : 3;
const ONLY_MARKED = '[data-kitten-platform]';

function cat(stage: HTMLElement, opts: KittenOptions): Kitten {
  return new Kitten(stage, { scale: SCALE, platforms: ONLY_MARKED, ...opts });
}

const at = (stage: HTMLElement, fraction: number): number => stage.clientWidth * fraction;

function hero(): void {
  const stage = byId('hero');
  cat(stage, { coat: 'calico', name: 'Mingau', x: at(stage, 0.2) });
  cat(stage, { coat: 'orange', name: 'Paçoca', x: at(stage, 0.75) });
}

function coats(): void {
  const stage = byId('coats');
  const kitten = cat(stage, { coat: 'calico', x: at(stage, 0.4) });
  const buttons = [...stage.querySelectorAll<HTMLButtonElement>('.swatch')];
  let current: PaletteName = 'calico';
  const pick = (coat: PaletteName): void => {
    current = coat;
    kitten.setCoat(coat);
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.coat === coat));
    const comment = lang() === 'pt' ? '// ou troque depois, sem recriar o gato' : '// or switch later, without recreating the cat';
    show('coats-code', `<kitten-pet coat="${coat}"></kitten-pet>\n\n${comment}\ncat.setCoat('${coat}');`);
  };
  for (const b of buttons) {
    b.addEventListener('click', () => pick(b.dataset.coat as PaletteName));
  }
  onLang(() => pick(current));
  pick(current);
}

function summon(): void {
  const stage = byId('summon');
  const cats = [
    cat(stage, { coat: 'black', summon: true, x: at(stage, 0.3) }),
    cat(stage, { coat: 'calico', summon: true, x: at(stage, 0.6) }),
  ];
  let last = 0;
  for (const c of cats) {
    c.addEventListener('summon', (e) => {
      // Os dois gatos disparam o mesmo chamado; um alfinete basta.
      const now = performance.now();
      if (now - last < 80) return;
      last = now;
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const pin = document.createElement('i');
      pin.className = 'pin-drop';
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      stage.append(pin);
      pin.addEventListener('animationend', () => pin.remove());
      setTimeout(() => pin.remove(), 4000);
    });
  }
  const text = (l: Lang): string =>
    [
      `<kitten-pet summon></kitten-pet>`,
      '',
      l === 'pt' ? '// ou chame por código, em px dentro do container' : '// or call them from code, in px inside the container',
      `cat.summonTo(320, 120);`,
    ].join('\n');
  onLang((l) => show('summon-code', text(l)));
  show('summon-code', text(lang()));
}

function parkour(): void {
  const stage = byId('parkour');
  const behaviors: BehaviorWeights = { climb: 5, explore: 4, wander: 2, play: 1, idle: 1, social: 1, loaf: 0.2, nap: 0, groom: 0.3, stretch: 0.2 };
  cat(stage, { coat: 'calico', behaviors, x: at(stage, 0.15) });
  cat(stage, { coat: 'gray', behaviors, x: at(stage, 0.5) });
  const text = (l: Lang): string =>
    [
      `import { Kitten } from 'kittens';`,
      '',
      l === 'pt' ? '// mais escalada e exploração, nada de soneca' : '// more climbing and exploring, no naps',
      `new Kitten(stage, {`,
      `  behaviors: { climb: 5, explore: 4, nap: 0 },`,
      `});`,
    ].join('\n');
  onLang((l) => show('parkour-code', text(l)));
  show('parkour-code', text(lang()));
}

function crowd(): void {
  const stage = byId('crowd');
  const all: PaletteName[] = ['calico', 'orange', 'gray', 'black', 'siamese'];
  all.forEach((coat, i) => cat(stage, { coat, x: at(stage, 0.1 + i * 0.19) }));
  const text = (l: Lang): string =>
    [
      l === 'pt' ? '// gatos no mesmo container interagem sozinhos' : '// cats in the same container interact on their own',
      `for (const coat of ['calico', 'orange', 'gray', 'black', 'siamese']) {`,
      `  new Kitten(box, { coat });`,
      `}`,
    ].join('\n');
  onLang((l) => show('crowd-code', text(l)));
  show('crowd-code', text(lang()));
}

function footer(): void {
  const stage = byId('footer-perch');
  const sleepy: BehaviorWeights = { nap: 10, loaf: 1.5, groom: 0.4, stretch: 0.3, idle: 0, wander: 0, explore: 0, climb: 0, play: 0, social: 0 };
  cat(stage, { coat: 'siamese', behaviors: sleepy, x: at(stage, 0.7) });
}

/* ---------- topo: idioma, tema, copiar ---------- */

function languageTags(): void {
  const tags = [...document.querySelectorAll<HTMLButtonElement>('[data-lang]')];
  const mark = (l: Lang): void => {
    for (const tag of tags) tag.setAttribute('aria-pressed', String(tag.dataset.lang === l));
    for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
      el.setAttribute('aria-label', t(el.dataset.i18nLabel as Key));
    }
  };
  for (const tag of tags) tag.addEventListener('click', () => setLang(tag.dataset.lang as Lang));
  onLang(mark);
}

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'kittens-site:theme';

function themeButton(): void {
  const button = byId('theme');
  let theme: Theme = (document.documentElement.dataset.theme as Theme | undefined) ?? 'system';
  const label = button.querySelector('span');
  const icon = button.querySelector('.icon');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const paint = (): void => {
    if (label) label.textContent = t(`theme.${theme}`);
    const showingDark = theme === 'dark' || (theme === 'system' && dark.matches);
    if (icon) icon.innerHTML = iconSvg(showingDark ? 'moon' : 'sun');
  };
  dark.addEventListener('change', paint);
  button.addEventListener('click', () => {
    theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Sem storage: o tema vale só nesta visita.
    }
    paint();
  });
  onLang(paint);
}

function copyButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '');
        const label = button.querySelector<HTMLElement>('[data-i18n]');
        if (!label) return;
        label.textContent = t('copied');
        setTimeout(() => (label.textContent = t('copy')), 1400);
      } catch {
        // Sem permissão de área de transferência: o comando continua visível para copiar à mão.
      }
    });
  }
}

grain();
paintIcons();
tear();
languageTags();
themeButton();
copyButtons();
coats();
summon();
parkour();
crowd();
setLang(lang());

// Os gatos esperam a fonte do título: as letras mudam de tamanho quando ela carrega.
document.fonts.ready.finally(() => {
  hero();
  footer();
});
