/**
 * A matriz da pelagem (skin) e onde cada pixel de pelo de cada pose cai nela.
 *
 * Layout (35×27), em células:
 *
 *   x 0–10,  y 0–8    cabeça, 1:1 a partir do nariz (o nariz fica em 6,8): igual em toda pose
 *   x 12–19, y 8      rabo: x 12 é onde ele sai do corpo, x 19 a ponta; igual em toda pose
 *   corpo com as patas, 1:1, uma área para cada família de pose (pintar uma não mexe nas outras):
 *   x 12–19, y 0–7    no colo (de frente)
 *   x 0–13,  y 10–14  sentado
 *   x 15–34, y 10–17  em pé, andando e correndo
 *   x 0–8,   y 16–22  deitado
 *   x 15–34, y 19–26  espreguiçando
 *
 * Só a cabeça e o rabo seguem um padrão; o corpo muda de desenho entre as poses, então cada
 * família tem o dela, na posição relativa ao nariz (a cabeça não deforma, e é nela que o
 * corpo está preso: o pulinho da corrida não desalinha nada).
 *
 * A cor da célula é a cor que aparece: pixel de sombra do desenho (`g`) não escurece nada
 * sozinho, então o que se pinta é o que se vê. A sombra das pelagens prontas está na matriz.
 *
 * Sem DOM: roda no Node também.
 */
import { FRAMES } from './frames.ts';
import { resolveCoat, type KittenCoat } from './coats.ts';
import { hexToRgb } from './rasterize.ts';
import type { Coat } from './atlas.ts';

type FrameName = keyof typeof FRAMES;

export const SKIN_W = 35;
export const SKIN_H = 27;

const TAIL_X = 12;
const TAIL_Y = 8;
const TAIL_LEN = 8;

/** A cabeça, recortada do frame sentado: nariz na coluna 6 da última linha. */
const HEAD = FRAMES.sit.rows.slice(0, 9).map((row) => row.slice(9, 20));

/** Área do corpo de uma família na matriz: canto (`x`, `y`), tamanho e o deslocamento do
 * canto em relação ao nariz no frame (`dx`, `dy`). */
interface Region {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly dx: number;
  readonly dy: number;
}

interface Family {
  readonly body: Region;
  /** Onde o rabo sai do corpo: o pixel de rabo mais perto daqui é a distância 0. */
  readonly root: readonly [number, number];
  readonly tail: (x: number, y: number) => boolean;
}

const SIT: Family = {
  body: { x: 0, y: 10, w: 14, h: 5, dx: -8, dy: 1 }, root: [7, 12],
  tail: (x) => x <= 6,
};
const STAND: Family = {
  body: { x: 15, y: 10, w: 20, h: 8, dx: -16, dy: -2 }, root: [5, 8],
  tail: (x, y) => x <= 5 && y <= 7,
};
const LOAF: Family = {
  body: { x: 0, y: 16, w: 9, h: 7, dx: -14, dy: -6 }, root: [6, 8],
  tail: (x) => x <= 5,
};
const STRETCH: Family = {
  body: { x: 15, y: 19, w: 20, h: 8, dx: -15, dy: -6 }, root: [4, 5],
  tail: (x, y) => x <= 3 && y <= 4,
};
/** De frente: peito, barriga e patinhas. */
const DANGLE: Family = {
  body: { x: 12, y: 0, w: 8, h: 8, dx: -4, dy: 1 }, root: [8, 17],
  tail: (_, y) => y >= 18,
};

const FAMILY: Record<FrameName, Family> = {
  sit: SIT, sitBlink: SIT, sitTail: SIT, meow: SIT, yawn: SIT, lick: SIT, lickUp: SIT, wash: SIT, batUp: SIT, batDown: SIT,
  stand: STAND, walkA: STAND, walkB: STAND, gather: STAND, leap: STAND, runA: STAND, runB: STAND, runC: STAND, runD: STAND,
  loaf: LOAF, loafTail: LOAF, sleep: LOAF, sleepBreath: LOAF,
  stretch: STRETCH,
  dangleA: DANGLE, dangleB: DANGLE, dangleC: DANGLE, dangleD: DANGLE,
};

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** O primeiro rosa de cima para baixo é o nariz. */
function noseOf(rows: readonly string[]): { x: number; y: number } {
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y]!.indexOf('p');
    if (x >= 0) return { x, y };
  }
  return { x: -99, y: -99 };
}

interface FrameMap {
  readonly width: number;
  readonly nose: { x: number; y: number };
  /** Índice da célula (`v * SKIN_W + u`) de cada pixel, -1 fora do pelo. */
  readonly cells: Int16Array;
}

const maps = new Map<string, FrameMap>();

function mapOf(name: FrameName): FrameMap {
  let map = maps.get(name);
  if (map) return map;
  const { rows } = FRAMES[name];
  const family = FAMILY[name];
  const width = rows[0]!.length;
  const nose = noseOf(rows);
  const cells = new Int16Array(width * rows.length).fill(-1);
  const tail: number[] = [];
  const body = family.body;

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      if (row[x] !== 'w' && row[x] !== 'g') continue;
      const hx = x - nose.x + 6;
      const hy = y - nose.y + 8;
      let u: number;
      let v: number;
      if ((HEAD[hy]?.[hx] ?? '.') !== '.') [u, v] = [hx, hy];
      else if (family.tail(x, y)) {
        tail.push(y * width + x);
        continue;
      } else {
        u = body.x + clamp(x - nose.x - body.dx, 0, body.w - 1);
        v = body.y + clamp(y - nose.y - body.dy, 0, body.h - 1);
      }
      cells[y * width + x] = v * SKIN_W + u;
    }
  });

  // Rabo: distância (andando pelos 8 vizinhos) a partir do pixel mais perto da raiz.
  const [rx, ry] = family.root;
  const far = (i: number): number => Math.hypot((i % width) - rx, Math.floor(i / width) - ry);
  const start = tail.reduce((best, i) => (far(i) < far(best) ? i : best), tail[0] ?? -1);
  const dist = new Map<number, number>(start < 0 ? [] : [[start, 0]]);
  for (const i of dist.keys()) {
    const d = dist.get(i)!;
    for (const j of tail) {
      if (!dist.has(j) && Math.abs((j % width) - (i % width)) <= 1 && Math.abs(Math.floor(j / width) - Math.floor(i / width)) <= 1) {
        dist.set(j, d + 1);
      }
    }
  }
  for (const i of tail) {
    const d = dist.get(i) ?? Math.round(far(i)); // pedaço solto do rabo: vale a distância em linha reta
    cells[i] = TAIL_Y * SKIN_W + TAIL_X + Math.min(d, TAIL_LEN - 1);
  }

  map = { width, nose, cells };
  maps.set(name, map);
  return map;
}

/** Célula da matriz de um pixel de pelo (`w`/`g`) do frame; `null` para o resto. */
export function skinCellAt(frame: FrameName, x: number, y: number): { u: number; v: number } | null {
  const map = mapOf(frame);
  if (x < 0 || x >= map.width) return null;
  const i = map.cells[y * map.width + x] ?? -1;
  return i < 0 ? null : { u: i % SKIN_W, v: Math.floor(i / SKIN_W) };
}

/** Qual olho é o pixel `a` (relativo ao desenho virado para a direita); `null` se não é olho. */
export function eyeAt(frame: FrameName, x: number, y: number): 'left' | 'right' | null {
  if (FRAMES[frame].rows[y]?.[x] !== 'a') return null;
  return x < mapOf(frame).nose.x ? 'left' : 'right';
}

/** Cor de um pixel do frame com a pelagem; `null` é transparente. */
export function paintPixel(coat: KittenCoat, frame: FrameName, x: number, y: number): string | null {
  const symbol = FRAMES[frame].rows[y]?.[x];
  if (symbol === 'k') return coat.outline;
  if (symbol === 's') return coat.outlineSoft;
  if (symbol === 'p') return coat.nose;
  if (symbol === 'a') return coat.eyes[eyeAt(frame, x, y)!];
  if (symbol !== 'w' && symbol !== 'g') return null;
  const cell = skinCellAt(frame, x, y);
  return (cell && coat.colors[coat.skin[cell.v]?.[cell.u] ?? '.']) || null;
}

/** Um frame sozinho, no tamanho dele (as coordenadas batem com `skinCellAt`). */
export function renderFrame(coat: Coat, frame: FrameName): { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> } {
  const resolved = resolveCoat(coat);
  const { rows } = FRAMES[frame];
  const width = rows[0]!.length;
  const height = rows.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = paintPixel(resolved, frame, x, y);
      if (!color) continue;
      const [r, g, b] = hexToRgb(color);
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** Código pronto para colar que registra a pelagem (`registerCoat({...})`). */
export function coatToCode(coat: KittenCoat): string {
  return `registerCoat(${JSON.stringify(coat, null, 2)});`;
}
