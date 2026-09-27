import { CLIPS, COATS, FRAMES, Kitten, SKIN_H, SKIN_W, coatToCode, eyeAt, renderFrame, skinCellAt } from '../src/index.ts';
import type { BehaviorWeights, ClipName, CoatName, FrameName, KittenCoat, KittenOptions } from '../src/index.ts';
import { Animator } from '../src/animations.ts';
import { lang, onLang, setLang, t, type Key, type Lang } from './i18n.ts';
import { iconSvg, paintIcons } from './icons.ts';
import AGENT_PROMPT from '../docs/agent-prompt.md?raw';

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

/* ---------- copiar com "copiado!" ---------- */

/** Troca o rótulo do botão por "copiado!" por 1,4s (mesma animação nos 3 botões de copiar). */
function flashCopied(button: HTMLButtonElement): void {
  const label = button.querySelector<HTMLElement>('[data-i18n]');
  if (!label) return;
  const key = label.dataset.i18n as Key;
  label.textContent = t('copied');
  setTimeout(() => (label.textContent = t(key)), 1400);
}

async function copyText(button: HTMLButtonElement, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(button);
  } catch {
    // Sem permissão de área de transferência: o conteúdo continua visível para copiar à mão.
  }
}

/* ---------- gatos ---------- */

const small = matchMedia('(max-width: 640px)').matches;
const SCALE = small ? 2 : 3;
// Móveis e objetos dos palcos usam a mesma escala dos gatos (ver .furniture no CSS).
document.documentElement.style.setProperty('--art', `${SCALE}px`);
const ONLY_MARKED = '[data-kitten-platform]';

function cat(stage: HTMLElement, opts: KittenOptions): Kitten {
  return new Kitten(stage, { scale: SCALE, platforms: ONLY_MARKED, ...opts });
}

const at = (stage: HTMLElement, fraction: number): number => stage.clientWidth * fraction;

/** Papel, cor da letra, contorno, giro e desnível de cada recorte do título, em ciclo. */
const LETTER_LOOKS: readonly (readonly [string, string, string | null, number, number])[] = [
  ['var(--orange)', 'var(--cream)', 'var(--ink)', -5, 6],
  ['var(--black)', 'var(--cream)', null, 3, -4],
  ['var(--cream)', 'var(--orange)', 'var(--ink)', -2, 10],
  ['var(--orange)', 'var(--black)', null, 4, 0],
  ['var(--cream)', 'var(--black)', null, -4, 8],
  ['var(--black)', 'var(--orange)', 'var(--ink)', 2, -2],
  ['var(--orange)', 'var(--cream)', 'var(--ink)', -3, 6],
  ['var(--cream)', 'var(--orange)', 'var(--ink)', 3, -3],
];

/** Monta o título em letras recortadas: KITTENS em inglês, GATINHOS em português. */
function title(l: Lang): void {
  const h1 = document.querySelector<HTMLElement>('.title');
  if (!h1) return;
  const word = l === 'pt' ? 'GATINHOS' : 'KITTENS';
  if (h1.dataset.word === word) return;
  h1.dataset.word = word;
  h1.setAttribute('aria-label', word.toLowerCase());
  h1.replaceChildren(
    ...[...word].map((char, i) => {
      const [c, fg, line, r, dy] = LETTER_LOOKS[i % LETTER_LOOKS.length]!;
      const span = document.createElement('span');
      span.className = 'cut letter';
      span.dataset.kittenPlatform = '';
      span.setAttribute('aria-hidden', 'true');
      span.style.cssText = `--c: ${c}; --fg: ${fg}; --r: ${r}deg; --dy: ${dy}px${line ? `; --line: ${line}` : ''}`;
      span.textContent = char;
      return span;
    }),
  );
  tear(h1);
}

function hero(): void {
  const stage = byId('hero');
  cat(stage, { coat: 'calico', name: 'Mingau', x: at(stage, 0.2) });
  cat(stage, { coat: 'orange', name: 'Paçoca', x: at(stage, 0.75) });
}

/* ---------- customizador de pelagem (01) ---------- */

const COAT_STORAGE = 'kittens-site:coat';
/** Cada pose usa um clipe já existente; junto elas cobrem as 5 famílias de `skin.ts`
 * (sentado, em pé, deitado, espreguiçando, no colo), então dá para pintar qualquer região. */
const POSES: readonly { clip: ClipName; label: Key }[] = [
  { clip: 'sit', label: 'customizer.poseSit' },
  { clip: 'walk', label: 'customizer.poseWalk' },
  { clip: 'loafWag', label: 'customizer.poseLoaf' },
  { clip: 'stretch', label: 'customizer.poseStretch' },
  { clip: 'dangle', label: 'customizer.poseDangle' },
];
const CANVAS_CELL = 16;
/** Caracteres livres para batizar cada cor nova pintada na skin (ver `KittenCoat.skin`). */
const CHAR_POOL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!$%&*+<=>?@^_~';

const cloneCoat = (coat: KittenCoat): KittenCoat => ({ ...coat, skin: [...coat.skin], colors: { ...coat.colors }, eyes: { ...coat.eyes } });

const uniqueFrames = (clip: ClipName): FrameName[] => [...new Set(CLIPS[clip].frames)];

/** Acha (ou cria) o caractere da skin que representa esta cor exata. */
function colorChar(colors: Readonly<Record<string, string>>, color: string): string {
  for (const [char, value] of Object.entries(colors)) if (value === color) return char;
  const used = new Set(Object.keys(colors));
  return [...CHAR_POOL].find((c) => !used.has(c)) ?? '?';
}

function paintSkinCell(coat: KittenCoat, u: number, v: number, color: string): KittenCoat {
  const char = colorChar(coat.colors, color);
  const row = coat.skin[v] ?? '';
  const skin = coat.skin.map((r, y) => (y === v ? row.slice(0, u) + char + row.slice(u + 1) : r));
  // Cor que saiu da skin não fica pra trás: senão o código exportado só cresce, e um
  // `CHAR_POOL` que se esgota cai em '?' e sobrescreve outra cor.
  const used = new Set(skin.join(''));
  const colors = Object.fromEntries(Object.entries({ ...coat.colors, [char]: color }).filter(([c]) => used.has(c)));
  return { ...coat, skin, colors };
}

const paintEye = (coat: KittenCoat, side: 'left' | 'right', color: string): KittenCoat => ({ ...coat, eyes: { ...coat.eyes, [side]: color } });

function loadSavedCoat(): KittenCoat | null {
  try {
    const raw = localStorage.getItem(COAT_STORAGE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Igual a `resolveCoat`: completa com a calico o que faltar, pra um storage de versão
    // antiga ou corrompido (ex.: `{"skin":[],"colors":{}}`) não derrubar a página inteira.
    const coat = { ...COATS.calico, ...(parsed as Partial<KittenCoat>) };
    // Matriz de outro tamanho (salva antes de o layout mudar) não bate com os frames: descarta.
    return coat.skin.length === SKIN_H && coat.skin.every((row) => row.length === SKIN_W) ? coat : null;
  } catch {
    return null;
  }
}

function saveCoat(coat: KittenCoat | null): void {
  try {
    if (coat) localStorage.setItem(COAT_STORAGE, JSON.stringify(coat));
    else localStorage.removeItem(COAT_STORAGE);
  } catch {
    // sem storage (aba privada etc.): a pelagem pintada vale só nesta visita
  }
}

const HISTORY_STORAGE = 'kittens-site:colors';
const HISTORY_MAX = 8;

function loadHistory(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_STORAGE) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

/** Silhueta de um frame (tudo que não é `.` vira pixel), recortada justa e sempre na mesma
 * escala: as poses ficam proporcionais entre si e o espaço entre elas no menu é igual. */
function silhouette(frame: FrameName, cell = 3): HTMLCanvasElement {
  const rows = FRAMES[frame].rows;
  const lit: [number, number][] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') lit.push([x, y]);
  });
  const left = Math.min(...lit.map(([x]) => x));
  const top = Math.min(...lit.map(([, y]) => y));
  const canvas = document.createElement('canvas');
  canvas.width = (Math.max(...lit.map(([x]) => x)) - left + 1) * cell;
  canvas.height = (Math.max(...lit.map(([, y]) => y)) - top + 1) * cell;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f6ecd9';
    for (const [x, y] of lit) ctx.fillRect((x - left) * cell, (y - top) * cell, cell, cell);
  }
  return canvas;
}

function customizer(): void {
  const canvas = byId('customizer-canvas') as HTMLCanvasElement;
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const stage = byId('customizer');
  const yoursBtn = byId('customizer-yours') as HTMLButtonElement;
  const coatButtons = [...byId('customizer-coats').querySelectorAll<HTMLButtonElement>('.coat')];
  const posesRow = byId('customizer-poses');
  const brush = byId('brush-color') as HTMLInputElement;
  const dropperBtn = byId('customizer-dropper') as HTMLButtonElement;
  const historyRow = byId('customizer-history');
  const poseLabel = byId('customizer-pose-label');
  const frameCount = byId('customizer-frame-count');
  const editBtn = byId('customizer-edit') as HTMLButtonElement;
  const editorPanel = byId('customizer-editor');
  const frameNav = byId('customizer-frame-nav');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = loadSavedCoat();
  let coat: KittenCoat = saved ?? cloneCoat(COATS.calico);
  // A última pelagem editada ("a sua"): fica guardada mesmo enquanto se olha uma pronta.
  let customCoat: KittenCoat | null = saved;
  let editing = false;
  let dropping = false;
  let history = loadHistory();
  let poseIndex = 0;
  let frameIndex = 0;
  const cursor = { x: 0, y: 0 };
  const animator = new Animator();
  animator.play(POSES[0]!.clip, true);

  const pressCoat = (b: HTMLButtonElement): void => {
    for (const other of coatButtons) other.setAttribute('aria-pressed', String(other === b));
  };
  yoursBtn.hidden = !saved;
  if (saved) pressCoat(yoursBtn);

  const poseButtons = POSES.map((pose, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pose';
    btn.setAttribute('aria-pressed', String(i === 0));
    btn.append(silhouette(CLIPS[pose.clip].frames[0]!));
    posesRow.append(btn);
    return btn;
  });

  const frames = (): FrameName[] => uniqueFrames(POSES[poseIndex]!.clip);
  const paintFrame = (): FrameName => frames()[frameIndex] ?? frames()[0]!;
  /** Fora da edição o gato brinca sozinho pelos frames do clipe; editando, pausa no frame
   * escolhido pelas setas. */
  const currentFrame = (): FrameName => (editing ? paintFrame() : animator.frame);

  function clampCursor(): void {
    const rows = FRAMES[currentFrame()].rows;
    cursor.x = Math.min(cursor.x, (rows[0]?.length ?? 1) - 1);
    cursor.y = Math.min(cursor.y, rows.length - 1);
  }

  /** Só os pixels: roda a cada pincelada e a cada frame da animação, então fica leve. */
  function renderCanvas(): void {
    const { width, height, data } = renderFrame(coat, currentFrame());
    const w = width * CANVAS_CELL;
    const h = height * CANVAS_CELL;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.parentElement?.style.setProperty('--cols', String(width));
      canvas.parentElement?.style.setProperty('--rows', String(height));
      canvas.parentElement?.style.setProperty('--ratio', `${w} / ${h}`);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (!data[i + 3]) continue;
        ctx.fillStyle = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
        ctx.fillRect(x * CANVAS_CELL, y * CANVAS_CELL, CANVAS_CELL, CANVAS_CELL);
      }
    }
    if (editing && canvas.matches(':focus-visible')) {
      ctx.strokeStyle = '#e07b39';
      ctx.lineWidth = 2;
      ctx.strokeRect(cursor.x * CANVAS_CELL + 1, cursor.y * CANVAS_CELL + 1, CANVAS_CELL - 2, CANVAS_CELL - 2);
    }
  }

  /** Rótulos e contador: só em ações deliberadas (pose, frame, idioma), nunca a cada frame. */
  function updateChrome(): void {
    poseLabel.textContent = t(POSES[poseIndex]!.label);
    for (const [i, b] of poseButtons.entries()) {
      b.setAttribute('aria-label', t(POSES[i]!.label));
      b.title = t(POSES[i]!.label);
    }
    frameCount.textContent = `${frameIndex + 1}/${frames().length}`;
  }

  function updateCode(): void {
    const comment = lang() === 'pt' ? '// cole isto no seu projeto (ver docs/agent-prompt.md)' : '// paste this into your project (see docs/agent-prompt.md)';
    show('customizer-code', `${comment}\n${coatToCode(coat)}`);
  }

  function draw(): void {
    renderCanvas();
    updateChrome();
    updateCode();
  }

  function renderHistory(): void {
    historyRow.replaceChildren(...history.map((color) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.style.setProperty('--c', color);
      b.setAttribute('aria-label', color);
      b.title = color;
      b.addEventListener('click', () => setBrush(color));
      return b;
    }));
  }

  function setBrush(color: string): void {
    brush.value = color;
    stage.style.setProperty('--brush', color);
  }

  /** Cor usada entra no começo do histórico (sem repetir) e fica salva no navegador. */
  function remember(color: string): void {
    history = [color, ...history.filter((c) => c !== color)].slice(0, HISTORY_MAX);
    try {
      localStorage.setItem(HISTORY_STORAGE, JSON.stringify(history));
    } catch {
      // sem storage: o histórico vale só nesta visita
    }
    renderHistory();
  }

  function markEdited(): void {
    // Uma vez editada, a pelagem não pode manter o nome do preset de origem: colar o
    // `registerCoat` copiado sobrescreveria esse preset embutido (ex.: "calico").
    if (coat.name in COATS) coat = { ...coat, name: 'custom' };
    customCoat = coat;
    yoursBtn.hidden = false;
    pressCoat(yoursBtn);
  }

  // Desfazer/refazer: cada pincelada (do apertar ao soltar) vira um passo. A pilha guarda a
  // pelagem inteira de antes; é pequena (35×27 + cores), então cópia simples basta.
  const undoBtn = byId('customizer-undo') as HTMLButtonElement;
  const redoBtn = byId('customizer-redo') as HTMLButtonElement;
  const undoStack: KittenCoat[] = [];
  const redoStack: KittenCoat[] = [];
  const syncUndo = (): void => {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  };
  function travel(from: KittenCoat[], to: KittenCoat[]): void {
    const target = from.pop();
    if (!target) return;
    to.push(coat);
    coat = target;
    markEdited();
    saveCoat(coat);
    syncUndo();
    renderCanvas();
    updateCode();
  }
  undoBtn.addEventListener('click', () => travel(undoStack, redoStack));
  redoBtn.addEventListener('click', () => travel(redoStack, undoStack));
  document.addEventListener('keydown', (e) => {
    if (!editing || !(e.ctrlKey || e.metaKey) || (e.target instanceof HTMLElement && e.target.matches('input, textarea'))) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) travel(undoStack, redoStack);
    else if ((key === 'z' && e.shiftKey) || key === 'y') travel(redoStack, undoStack);
    else return;
    e.preventDefault();
  });

  // Pintar arrastando não precisa salvar nem realçar o código a cada pixel: só ao soltar.
  let paintDirty = false;
  function commitPaint(): void {
    if (!paintDirty) return;
    paintDirty = false;
    saveCoat(coat);
    updateCode();
    remember(brush.value);
  }

  /** Conta-gotas: a cor que está na tela naquele pixel vira a cor do pincel. */
  function pickAt(x: number, y: number): void {
    const { width, data } = renderFrame(coat, paintFrame());
    const i = (y * width + x) * 4;
    if (x < 0 || x >= width || !data[i + 3]) return;
    setBrush('#' + [data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join(''));
    remember(brush.value);
    dropping = false;
    dropperBtn.setAttribute('aria-pressed', 'false');
    stage.classList.remove('dropping');
  }

  /** Pelo vai para a matriz; olho pinta aquele olho; contorno e nariz trocam a cor inteira. */
  function paintAt(x: number, y: number, commit = true): void {
    if (!editing) return;
    if (dropping) return pickAt(x, y);
    const color = brush.value;
    const before = coat;
    const symbol = FRAMES[paintFrame()].rows[y]?.[x];
    if (symbol === 'w' || symbol === 'g') {
      const cell = skinCellAt(paintFrame(), x, y);
      if (!cell) return;
      coat = paintSkinCell(coat, cell.u, cell.v, color);
    } else if (symbol === 'a') {
      const side = eyeAt(paintFrame(), x, y);
      if (!side) return;
      coat = paintEye(coat, side, color);
    } else if (symbol === 'k') coat = { ...coat, outline: color };
    else if (symbol === 's') coat = { ...coat, outlineSoft: color };
    else if (symbol === 'p') coat = { ...coat, nose: color };
    else return;
    if (JSON.stringify(coat) === JSON.stringify(before)) {
      coat = before; // mesma cor no mesmo lugar: nada mudou, não vira passo de desfazer
      return;
    }
    if (!paintDirty) {
      undoStack.push(before);
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
      syncUndo();
    }
    markEdited();
    paintDirty = true;
    renderCanvas();
    if (commit) commitPaint();
  }

  function cellFromEvent(e: PointerEvent): { x: number; y: number } {
    return {
      x: Math.floor((e.offsetX / canvas.clientWidth) * (canvas.width / CANVAS_CELL)),
      y: Math.floor((e.offsetY / canvas.clientHeight) * (canvas.height / CANVAS_CELL)),
    };
  }

  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!editing) return;
    dragging = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ponteiro sintético/inativo: segue sem captura.
    }
    const { x, y } = cellFromEvent(e);
    paintAt(x, y, false);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || dropping) return;
    const { x, y } = cellFromEvent(e);
    paintAt(x, y, false);
  });
  function endStroke(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    commitPaint();
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  canvas.addEventListener('keydown', (e) => {
    if (!editing) return;
    const cols = canvas.width / CANVAS_CELL;
    const rows = canvas.height / CANVAS_CELL;
    if (e.key === 'ArrowLeft') cursor.x = Math.max(0, cursor.x - 1);
    else if (e.key === 'ArrowRight') cursor.x = Math.min(cols - 1, cursor.x + 1);
    else if (e.key === 'ArrowUp') cursor.y = Math.max(0, cursor.y - 1);
    else if (e.key === 'ArrowDown') cursor.y = Math.min(rows - 1, cursor.y + 1);
    else if (e.key === 'Enter' || e.key === ' ') paintAt(cursor.x, cursor.y);
    else return;
    e.preventDefault();
    renderCanvas();
  });
  canvas.addEventListener('focus', renderCanvas);
  canvas.addEventListener('blur', renderCanvas);

  function pickPose(i: number): void {
    poseIndex = i;
    frameIndex = 0;
    animator.play(POSES[i]!.clip, true);
    clampCursor();
    for (const [j, b] of poseButtons.entries()) b.setAttribute('aria-pressed', String(j === i));
    draw();
  }
  for (const [i, b] of poseButtons.entries()) b.addEventListener('click', () => pickPose(i));

  const stepFrame = (delta: number): void => {
    frameIndex = (frameIndex + delta + frames().length) % frames().length;
    clampCursor();
    draw();
  };
  byId('customizer-prev').addEventListener('click', () => stepFrame(-1));
  byId('customizer-next').addEventListener('click', () => stepFrame(1));

  function showCoat(next: KittenCoat, button: HTMLButtonElement): void {
    coat = cloneCoat(next);
    undoStack.length = 0;
    redoStack.length = 0;
    syncUndo();
    pressCoat(button);
    draw();
  }
  for (const b of coatButtons) {
    if (b === yoursBtn) continue;
    // Trocar de pronta só troca o que está na tela: a pintada continua guardada em "a sua".
    b.addEventListener('click', () => showCoat(COATS[b.dataset.coat as CoatName], b));
  }
  yoursBtn.addEventListener('click', () => customCoat && showCoat(customCoat, yoursBtn));
  byId('customizer-reset').addEventListener('click', () => {
    // "Apagar e recomeçar": a pintada some de verdade (storage e botão "a sua").
    customCoat = null;
    saveCoat(null);
    yoursBtn.hidden = true;
    showCoat(COATS.calico, coatButtons[0]!);
  });

  dropperBtn.addEventListener('click', () => {
    dropping = !dropping;
    dropperBtn.setAttribute('aria-pressed', String(dropping));
    stage.classList.toggle('dropping', dropping);
  });
  brush.addEventListener('input', () => setBrush(brush.value));
  brush.addEventListener('change', () => remember(brush.value));

  // O lápis abre a edição: o lado esquerdo vira paleta, o gato pausa no frame que estava
  // mostrando e ganha a grade e as setas de quadro. Fechar volta à vitrine.
  function setEditing(open: boolean): void {
    editing = open;
    if (open) {
      frameIndex = Math.max(0, frames().indexOf(animator.frame));
      clampCursor();
    } else if (dropping) {
      dropperBtn.click();
    }
    editorPanel.hidden = !open;
    frameNav.hidden = !open;
    editBtn.setAttribute('aria-expanded', String(open));
    stage.classList.toggle('editing', open);
    draw();
  }
  editBtn.addEventListener('click', () => setEditing(!editing));

  byId('customizer-copy-agent').addEventListener('click', (e) => {
    // Pelagem pronta: só a instrução de uso (ela já vem na biblioteca). Editada ("a sua"):
    // o registerCoat vai junto, senão coat="custom" não existiria em outro projeto.
    const isPreset = coat.name in COATS;
    const pt = lang() === 'pt';
    const instruction = isPreset
      ? (pt ? `Use coat="${coat.name}" no elemento:` : `Use coat="${coat.name}" on the element:`)
      : (pt ? `Registre esta pelagem e use coat="${coat.name}" no elemento:` : `Register this coat and use coat="${coat.name}" on the element:`);
    const tag = `<kitten-pet coat="${coat.name}"></kitten-pet>`;
    const snippet = isPreset ? tag : `${coatToCode(coat)}\n\n${tag}`;
    void copyText(e.currentTarget as HTMLButtonElement, `${AGENT_PROMPT}\n\n${instruction}\n\n${snippet}`);
  });
  // O código abre no fluxo da página, logo abaixo da linha do prompt.
  const codeToggle = byId('customizer-code-toggle');
  const codePanel = byId('customizer-code-panel');
  codeToggle.addEventListener('click', () => {
    codePanel.hidden = !codePanel.hidden;
    codeToggle.setAttribute('aria-expanded', String(!codePanel.hidden));
  });
  byId('customizer-copy-code').addEventListener('click', (e) => {
    void copyText(e.currentTarget as HTMLButtonElement, coatToCode(coat));
  });

  setBrush(history[0] ?? brush.value);
  renderHistory();
  onLang(draw);
  draw();

  // Fora da edição a pose anima pelos frames do clipe; editando, pausa.
  // `prefers-reduced-motion` desliga o laço e deixa o primeiro frame parado.
  if (!reducedMotion) {
    let last = performance.now();
    const tick = (now: number): void => {
      requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (editing) return;
      const before = animator.frame;
      animator.update(dt);
      if (animator.frame !== before) renderCanvas();
    };
    requestAnimationFrame(tick);
  }
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
      pin.className = 'call-mark';
      pin.innerHTML =
        '<svg viewBox="0 0 60 60" aria-hidden="true"><path pathLength="1" d="M46 15C38 5 16 8 10 23s4 30 22 30 26-14 20-28c-3-7-12-11-21-9"/><path pathLength="1" d="M20 37c0-10 11-13 18-7l7 5-7 2zM30 28c-1-5 5-6 6-2M39 32h.1M20 37c-6 1-7-5-3-7M25 37v2M34 37v2"/></svg>';
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      stage.append(pin);
      // O traço de cada path também solta animationend; só o sumiço do todo remove.
      pin.addEventListener('animationend', (ev) => ev.target === pin && pin.remove());
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
      `import { Kitten } from '@catmaitachi/kittens';`,
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
  const all: CoatName[] = ['calico', 'orange', 'gray', 'black', 'siamese'];
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
    for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle as Key);
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
    button.addEventListener('click', () => void copyText(button, button.dataset.copy ?? ''));
  }
}

/* ---------- entrada das seções: "gruda na parede" + número carimbado ---------- */

function stampNum(el: HTMLElement, instant: boolean): void {
  const target = Number(el.dataset.num ?? el.textContent ?? 0);
  if (instant) {
    el.textContent = String(target).padStart(2, '0');
    return;
  }
  let n = 0;
  const id = setInterval(() => {
    n++;
    el.textContent = String(n).padStart(2, '0');
    if (n < target) return;
    clearInterval(id);
    el.classList.remove('thud');
    void el.offsetWidth;
    el.classList.add('thud');
  }, 120);
}

function revealSections(): void {
  const heads = [...document.querySelectorAll<HTMLElement>('.demo-head')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    for (const head of heads) {
      head.classList.add('stuck');
      const num = head.querySelector<HTMLElement>('.num');
      if (num) stampNum(num, true);
    }
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('stuck');
        const num = entry.target.querySelector<HTMLElement>('.num');
        if (num) stampNum(num, false);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.2 },
  );
  for (const head of heads) io.observe(head);
}

// `?capture` gera a página sem textura de papel: é assim que os GIFs do README são gravados,
// e o ruído aleatório em cada quadro deixaria os GIFs enormes.
if (!new URLSearchParams(location.search).has('capture')) grain();
paintIcons();
tear();
languageTags();
onLang(title);
themeButton();
copyButtons();
try {
  // Storage corrompido ou de uma versão antiga não pode travar o resto da página.
  customizer();
} catch (err) {
  console.error('customizador: falhou ao iniciar', err);
}
parkour();
summon();
crowd();
revealSections();
setLang(lang());

// Os gatos esperam a fonte do título: as letras mudam de tamanho quando ela carrega.
document.fonts.ready.finally(() => {
  hero();
  footer();
});
