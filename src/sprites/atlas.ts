/**
 * Gera a spritesheet em tempo de execução (canvas → data URL) a partir da pixel art.
 * Uma imagem por pelagem, criada na primeira vez e reaproveitada por todos os gatos.
 */
import { FRAMES, FX_FRAMES } from './frames.ts';
import { resolveCoat, type KittenCoat } from './coats.ts';
import { rasterizeSheet, type SheetLayout, type SheetPixels } from './rasterize.ts';
import { paintPixel } from './skin.ts';

export type FrameName = keyof typeof FRAMES;
export type FxName = keyof typeof FX_FRAMES;
/** Nome de uma pelagem (pronta ou registrada) ou a própria pelagem. */
export type Coat = string | KittenCoat;

export interface Atlas extends SheetLayout {
  /** Imagem pronta para `background-image`. */
  readonly url: string;
}

/** Tamanho das células de efeitos. */
export const FX_CELL = 8;

/** Cores fixas dos efeitos (as do calico, mais o vermelho do símbolo de raiva). */
export const FX_PALETTE: Readonly<Record<string, string>> = {
  k: '#111114', s: '#6f7173', w: '#e1e6e6', g: '#c4c7c8', d: '#1e2a32', o: '#d69058', a: '#dca157', p: '#e59aa8', r: '#d8433a',
};

/** Pelagem editada gera uma chave nova a cada pincelada: sem limite o cache cresceria para sempre. */
const CACHE_LIMIT = 32;
const cache = new Map<string, Atlas>();

function cacheSet(key: string, atlas: Atlas): void {
  cache.set(key, atlas);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
}

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

/** Pixels da spritesheet de uma pelagem (sem DOM). */
export function coatSheet(coat: KittenCoat): SheetPixels {
  return rasterizeSheet(FRAMES, (_, frame, x, y) => paintPixel(coat, frame as FrameName, x, y));
}

/** Pixels da spritesheet dos efeitos (sem DOM). */
export function fxSheet(): SheetPixels {
  return rasterizeSheet(FX_FRAMES, (symbol) => FX_PALETTE[symbol] ?? null, 8, FX_CELL, FX_CELL);
}

/** Spritesheet do gato para uma pelagem (cache pelo conteúdo: pelagem editada gera outra imagem). */
export function coatAtlas(coat: Coat = 'calico'): Atlas {
  const resolved = resolveCoat(coat);
  const key = JSON.stringify(resolved);
  let atlas = cache.get(key);
  if (!atlas) {
    atlas = toAtlas(coatSheet(resolved));
    cacheSet(key, atlas);
  }
  return atlas;
}

/** Spritesheet dos efeitos (coração, zzz, poeira, susto, raiva). */
export function fxAtlas(): Atlas {
  let atlas = cache.get('\0fx');
  if (!atlas) {
    atlas = toAtlas(fxSheet());
    cacheSet('\0fx', atlas);
  }
  return atlas;
}

/** Posição (em px da arte) da célula de um frame dentro da spritesheet. */
export function cellOf(atlas: Atlas, frame: string): { x: number; y: number } {
  const i = atlas.index[frame] ?? 0;
  return { x: (i % atlas.cols) * atlas.cellW, y: Math.floor(i / atlas.cols) * atlas.cellH };
}
