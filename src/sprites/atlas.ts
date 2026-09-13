/**
 * Gera a spritesheet em tempo de execução (canvas → data URL) a partir da pixel art.
 * Uma imagem por pelagem, criada na primeira vez e reaproveitada por todos os gatos.
 */
import { FRAMES, FX_FRAMES } from './frames';
import { PALETTES, PATTERNS, type Palette, type PaletteName, type PatternFn } from './palette';
import { rasterizeSheet, type SheetLayout, type SheetPixels } from './rasterize';

export type FrameName = keyof typeof FRAMES;
export type FxName = keyof typeof FX_FRAMES;
/** Nome de uma pelagem pronta ou uma paleta própria. */
export type Coat = PaletteName | Palette;

export interface Atlas extends SheetLayout {
  /** Imagem pronta para `background-image`. */
  readonly url: string;
}

/** Tamanho das células de efeitos. */
export const FX_CELL = 8;

const cache = new Map<string, Atlas>();

function toAtlas(sheet: SheetPixels): Atlas {
  const canvas = document.createElement('canvas');
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[kitten] canvas 2D indisponível neste navegador');
  ctx.putImageData(new ImageData(sheet.data, sheet.width, sheet.height), 0, 0);
  return {
    index: sheet.index,
    cols: sheet.cols,
    rows: sheet.rows,
    cellW: sheet.cellW,
    cellH: sheet.cellH,
    width: sheet.width,
    height: sheet.height,
    url: canvas.toDataURL('image/png'),
  };
}

export function resolvePalette(coat: Coat | undefined): Palette {
  if (!coat) return PALETTES.calico;
  if (typeof coat === 'string') return PALETTES[coat] ?? PALETTES.calico;
  return { ...PALETTES.calico, ...coat };
}

/** Regra de pintura da raça (listras, máscara, degradê). */
function resolvePattern(coat: Coat | undefined): PatternFn | null {
  return typeof coat === 'string' ? PATTERNS[coat] ?? null : null;
}

/** Spritesheet do gato para uma pelagem. */
export function coatAtlas(coat: Coat = 'calico'): Atlas {
  const key = typeof coat === 'string' ? coat : JSON.stringify(resolvePalette(coat));
  let atlas = cache.get(key);
  if (!atlas) {
    atlas = toAtlas(rasterizeSheet(FRAMES, resolvePalette(coat), 8, undefined, undefined, resolvePattern(coat)));
    cache.set(key, atlas);
  }
  return atlas;
}

/** Spritesheet dos efeitos (coração, zzz, poeira, susto). */
export function fxAtlas(): Atlas {
  let atlas = cache.get('\0fx');
  if (!atlas) {
    atlas = toAtlas(rasterizeSheet(FX_FRAMES, PALETTES.calico, 8, FX_CELL, FX_CELL));
    cache.set('\0fx', atlas);
  }
  return atlas;
}

/** Posição (em px da arte) da célula de um frame dentro da spritesheet. */
export function cellOf(atlas: Atlas, frame: string): { x: number; y: number } {
  const i = atlas.index[frame] ?? 0;
  return { x: (i % atlas.cols) * atlas.cellW, y: Math.floor(i / atlas.cols) * atlas.cellH };
}
