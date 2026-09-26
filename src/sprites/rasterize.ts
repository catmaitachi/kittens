/**
 * Transforma os frames ASCII em pixels RGBA de uma spritesheet.
 * Puro (sem DOM): roda no navegador para gerar a imagem em tempo de execução
 * e no Node para exportar o PNG. Só importa tipos, que o Node descarta.
 */
import type { FrameDef } from './frames';

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

/** Cor de um pixel do frame (símbolo na grade, nome do frame, x, y); `null` é transparente. */
export type Painter = (symbol: string, frame: string, x: number, y: number) => string | null;

/** `'#rrggbb'` → `[r, g, b]` (0–255 cada). */
export function hexToRgb(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/**
 * Pinta todos os frames numa grade de células. Cada frame é alinhado pela âncora:
 * a coluna `ax` cai no meio da célula e a última linha encosta no fundo dela.
 * `paint` diz a cor de cada pixel (a pelagem, ou a paleta fixa dos efeitos).
 */
export function rasterizeSheet(
  frames: Readonly<Record<string, FrameDef>>,
  paint: Painter,
  cols = 8,
  cellW = CELL_W,
  cellH = CELL_H,
): SheetPixels {
  const names = Object.keys(frames);
  const layout = layoutSheet(names, cols, cellW, cellH);
  const data = new Uint8ClampedArray(layout.width * layout.height * 4);

  names.forEach((name, i) => {
    const frame = frames[name]!;
    const cellX = (i % cols) * cellW;
    const cellY = Math.floor(i / cols) * cellH;
    const originX = cellX + cellW / 2 - frame.ax;
    const originY = cellY + cellH - frame.rows.length;

    frame.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = row[x] === '.' ? null : paint(row[x]!, name, x, y);
        const px = originX + x;
        const py = originY + y;
        if (!color || px < cellX || px >= cellX + cellW || py < cellY) continue;
        const [r, g, b] = hexToRgb(color);
        data.set([r, g, b, 255], (py * layout.width + px) * 4);
      }
    });
  });

  return { ...layout, data };
}

/** Valida as grades (linhas do mesmo tamanho, cabem na célula, símbolos conhecidos). */
export function validateFrames(
  frames: Readonly<Record<string, FrameDef>>,
  symbols: Iterable<string>,
  cellW = CELL_W,
  cellH = CELL_H,
): string[] {
  const known = new Set<string>(['.', ...symbols]);
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
