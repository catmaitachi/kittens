/**
 * Transforma os frames ASCII em pixels RGBA de uma spritesheet.
 * Puro (sem DOM): roda no navegador para gerar a imagem em tempo de execução
 * e no Node para exportar o PNG. Só importa tipos, que o Node descarta.
 */
import type { FrameDef } from './frames';
import type { Palette, PaletteKey, PatternFn } from './palette';

/** Tamanho de cada célula da spritesheet do gato, em pixels da arte. */
export const CELL_W = 32;
export const CELL_H = 24;

export interface SheetLayout {
  /** Nome do frame → índice da célula (esquerda→direita, cima→baixo). */
  readonly index: Readonly<Record<string, number>>;
  readonly cols: number;
  readonly rows: number;
  readonly cellW: number;
  readonly cellH: number;
  /** Tamanho total em pixels da arte. */
  readonly width: number;
  readonly height: number;
}

export interface SheetPixels extends SheetLayout {
  /** RGBA, `width * height * 4` bytes. */
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

export function layoutSheet(names: readonly string[], cols = 8, cellW = CELL_W, cellH = CELL_H): SheetLayout {
  const index: Record<string, number> = {};
  names.forEach((name, i) => (index[name] = i));
  const rows = Math.max(1, Math.ceil(names.length / cols));
  return { index, cols, rows, cellW, cellH, width: cols * cellW, height: rows * cellH };
}

function parseHex(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Caixa do bicho e posição do nariz dentro de um frame (as regras de pelagem usam). */
function measure(frame: FrameDef): {
  box: { left: number; right: number; top: number; bottom: number };
  nose: { x: number; y: number } | null;
  /** Primeira linha desenhada de cada coluna: a silhueta de cima (lombo, cabeça, rabo). */
  tops: number[];
} {
  let left = Number.POSITIVE_INFINITY;
  let right = 0;
  let top = Number.POSITIVE_INFINITY;
  let bottom = 0;
  let nose: { x: number; y: number } | null = null;
  const tops: number[] = [];
  frame.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (tops[x] === undefined) tops[x] = y;
      if (ch === 'p' && !nose) nose = { x, y }; // o primeiro rosa de cima para baixo é o nariz
    }
  });
  return { box: { left, right, top, bottom }, nose, tops };
}

/**
 * Pinta todos os frames numa grade de células. Cada frame é alinhado pela âncora:
 * a coluna `ax` cai no meio da célula e a última linha encosta no fundo dela.
 * `pattern` é a regra de pelagem da raça (listras, máscara, degradê); sem ela,
 * cada símbolo recebe direto a cor da paleta.
 */
export function rasterizeSheet(
  frames: Readonly<Record<string, FrameDef>>,
  palette: Palette,
  cols = 8,
  cellW = CELL_W,
  cellH = CELL_H,
  pattern?: PatternFn | null,
): SheetPixels {
  const names = Object.keys(frames);
  const layout = layoutSheet(names, cols, cellW, cellH);
  const data = new Uint8ClampedArray(layout.width * layout.height * 4);
  const cache = new Map<string, [number, number, number]>();
  const rgb = (color: string): [number, number, number] => {
    let parsed = cache.get(color);
    if (!parsed) cache.set(color, (parsed = parseHex(color)));
    return parsed;
  };
  const known = new Set<string>(Object.keys(palette));

  names.forEach((name, i) => {
    const frame = frames[name]!;
    const cellX = (i % cols) * cellW;
    const cellY = Math.floor(i / cols) * cellH;
    const originX = cellX + cellW / 2 - frame.ax;
    const originY = cellY + cellH - frame.rows.length;
    const { box, nose, tops } = measure(frame);
    const at = (px: number, py: number): string => frame.rows[py]?.[px] ?? '.';

    frame.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const symbol = row[x]!;
        if (!known.has(symbol)) continue; // '.' e símbolos sem cor ficam transparentes
        const key = symbol as PaletteKey;
        const custom = pattern
          ? pattern({ symbol: key, frame: name, x, y, box, nose, palette, columnTop: tops[x] ?? y, at })
          : null;
        const color = rgb(custom ?? palette[key]);
        const px = originX + x;
        const py = originY + y;
        if (px < cellX || px >= cellX + cellW || py < cellY) continue;
        const o = (py * layout.width + px) * 4;
        data[o] = color[0];
        data[o + 1] = color[1];
        data[o + 2] = color[2];
        data[o + 3] = 255;
      }
    });
  });

  return { ...layout, data };
}

/** Valida as grades (linhas do mesmo tamanho, cabem na célula, símbolos conhecidos). */
export function validateFrames(
  frames: Readonly<Record<string, FrameDef>>,
  palette: Palette,
  cellW = CELL_W,
  cellH = CELL_H,
): string[] {
  const known = new Set<string>(['.', ...Object.keys(palette)]);
  const problems: string[] = [];
  for (const [name, frame] of Object.entries(frames)) {
    const width = frame.rows[0]?.length ?? 0;
    frame.rows.forEach((row, y) => {
      if (row.length !== width) problems.push(`${name}: linha ${y} tem ${row.length} colunas (esperado ${width})`);
      for (const ch of row) if (!known.has(ch)) problems.push(`${name}: símbolo desconhecido "${ch}" na linha ${y}`);
    });
    if (frame.rows.length > cellH) problems.push(`${name}: ${frame.rows.length} linhas não cabem na célula (${cellH})`);
    const left = cellW / 2 - frame.ax;
    if (left < 0 || left + width > cellW) {
      problems.push(`${name}: com ax=${frame.ax} o frame (${width}px) sai da célula de ${cellW}px`);
    }
  }
  return problems;
}
