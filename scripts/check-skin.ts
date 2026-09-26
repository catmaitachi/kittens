/**
 * Confere a matriz de pelagem (`npm run check`):
 *  - todo pixel de pelo (`w`/`g`) de todo frame cai numa célula da matriz, e toda pelagem pronta tem cor ali;
 *  - todo frame com olhos tem o esquerdo e o direito;
 *  - cabeça comum a todas as poses, corpo separado por família de pose;
 *  - `coatToCode` gera código que, avaliado, recria a mesma pelagem.
 * Depois compara cada pelagem com a spritesheet da 1.x (tag `v1.0.2` no git) e grava
 * antigo × novo lado a lado em `.dpc/skin/compare-<nome>.png`. A comparação só informa.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { FRAMES } from '../src/sprites/frames.ts';
import { COATS, type KittenCoat } from '../src/sprites/coats.ts';
import { coatSheet } from '../src/sprites/atlas.ts';
import { SKIN_W, SKIN_H, skinCellAt, eyeAt, coatToCode } from '../src/sprites/skin.ts';
import { decodePng, encodePng } from './png.ts';

const REFERENCE = 'v1.0.2';
const coats = Object.values(COATS) as KittenCoat[];
const problems: string[] = [];

for (const coat of coats) {
  if (coat.skin.length !== SKIN_H || coat.skin.some((row) => row.length !== SKIN_W)) {
    problems.push(`${coat.name}: a skin precisa ter ${SKIN_H} linhas de ${SKIN_W} caracteres`);
  }
}

for (const [name, frame] of Object.entries(FRAMES)) {
  const eyes = new Set<string>();
  frame.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const eye = eyeAt(name as keyof typeof FRAMES, x, y);
      if (eye) eyes.add(eye);
      if (row[x] !== 'w' && row[x] !== 'g') continue;
      const cell = skinCellAt(name as keyof typeof FRAMES, x, y);
      if (!cell || cell.u < 0 || cell.u >= SKIN_W || cell.v < 0 || cell.v >= SKIN_H) {
        problems.push(`${name} (${x},${y}): pelo fora da matriz`);
        continue;
      }
      for (const coat of coats) {
        if (!coat.colors[coat.skin[cell.v]?.[cell.u] ?? '.']) problems.push(`${coat.name}: sem cor na célula ${cell.u},${cell.v} (${name} ${x},${y})`);
      }
    }
  });
  if (frame.rows.some((row) => row.includes('a')) && eyes.size !== 2) problems.push(`${name}: achou ${[...eyes].join('+') || 'nenhum olho'}`);
}

// Cabeça e rabo são comuns a todas as poses; o corpo e as patas não (as áreas de corpo começam
// na linha 10 da matriz, exceto a do colo): pintar o gato sentado não pode mexer no andando.
const cellsOf = (frame: keyof typeof FRAMES): Set<string> => {
  const cells = new Set<string>();
  FRAMES[frame].rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const cell = skinCellAt(frame, x, y);
      if (cell) cells.add(`${cell.u},${cell.v}`);
    }
  });
  return cells;
};
const walking = cellsOf('walkA');
const shared = [...cellsOf('sit')].filter((c) => walking.has(c));
if (!shared.length) problems.push('sit e walkA não dividem nem a cabeça');
if (shared.some((c) => Number(c.split(',')[1]) >= 10)) problems.push('sit e walkA dividem células de corpo');

for (const coat of coats) {
  let back: KittenCoat | null = null;
  new Function('registerCoat', coatToCode(coat))((c: KittenCoat) => (back = c));
  if (JSON.stringify(back) !== JSON.stringify(coat)) problems.push(`${coat.name}: coatToCode não recria a pelagem`);
}

if (problems.length) {
  console.error('✘ Matriz de pelagem com problemas:\n  ' + [...new Set(problems)].join('\n  '));
  process.exit(1);
}
console.log(`✔ ${Object.keys(FRAMES).length} frames mapeados na matriz ${SKIN_W}×${SKIN_H}, olhos e coatToCode ok`);

// ── Comparação com a 1.x ────────────────────────────────────────────────────
const OUT = new URL('../.dpc/skin/', import.meta.url);
const GAP = 4;
const SCALE = 4;
for (const coat of coats) {
  let old: ReturnType<typeof decodePng>;
  try {
    old = decodePng(execFileSync('git', ['show', `${REFERENCE}:assets/kitten-${coat.name}.png`], { stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    console.log(`  ${coat.name}: sem referência ${REFERENCE} no git, comparação pulada`);
    continue;
  }
  const now = coatSheet(coat);
  let drawn = 0;
  let same = 0;
  let close = 0;
  for (let o = 0; o < now.data.length; o += 4) {
    const a = old.data;
    const b = now.data;
    if (!a[o + 3] && !b[o + 3]) continue;
    drawn++;
    if (a[o + 3] !== b[o + 3]) continue;
    const diff = Math.max(Math.abs(a[o]! - b[o]!), Math.abs(a[o + 1]! - b[o + 1]!), Math.abs(a[o + 2]! - b[o + 2]!));
    if (diff === 0) same++;
    if (diff <= 2) close++;
  }
  const pct = (n: number): string => ((n / drawn) * 100).toFixed(1) + '%';
  console.log(`  ${coat.name.padEnd(8)} ${pct(same)} idênticos à ${REFERENCE} (${pct(close)} com diferença ≤ 2 por canal)`);

  const width = now.width * 2 + GAP;
  const side = new Uint8ClampedArray(width * now.height * 4);
  for (let y = 0; y < now.height; y++) {
    side.set(old.data.subarray(y * now.width * 4, (y + 1) * now.width * 4), y * width * 4);
    side.set(now.data.subarray(y * now.width * 4, (y + 1) * now.width * 4), (y * width + now.width + GAP) * 4);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(`compare-${coat.name}.png`, OUT), encodePng(width, now.height, side, SCALE));
}
