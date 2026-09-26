/**
 * Exporta a pixel art para PNG (uma spritesheet por pelagem + uma versão ampliada),
 * a matriz de cada pelagem (`skin-<nome>.png`) e um JSON com a posição de cada frame.
 * Não depende de nenhuma lib: o PNG é montado com zlib do Node (scripts/png.ts).
 *
 *   npm run sprites
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { FRAMES, FX_FRAMES } from '../src/sprites/frames.ts';
import { COATS } from '../src/sprites/coats.ts';
import { coatSheet, fxSheet, FX_PALETTE } from '../src/sprites/atlas.ts';
import { validateFrames, hexToRgb, CELL_W, CELL_H } from '../src/sprites/rasterize.ts';
import { SKIN_W, SKIN_H } from '../src/sprites/skin.ts';
import { encodePng } from './png.ts';

const OUT = new URL('../assets/', import.meta.url);

const problems = [...validateFrames(FRAMES, 'kswgap'), ...validateFrames(FX_FRAMES, Object.keys(FX_PALETTE), 8, 8)];
if (problems.length) {
  console.error('Pixel art com problemas:\n  ' + problems.join('\n  '));
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [name, coat] of Object.entries(COATS)) {
  const sheet = coatSheet(coat);
  writeFileSync(new URL(`kitten-${name}.png`, OUT), encodePng(sheet.width, sheet.height, sheet.data));

  const skin = new Uint8ClampedArray(SKIN_W * SKIN_H * 4);
  coat.skin.forEach((row, v) => {
    for (let u = 0; u < SKIN_W; u++) {
      const color = (coat.colors as Record<string, string>)[row[u] ?? '.'];
      if (!color) continue;
      const [r, g, b] = hexToRgb(color);
      skin.set([r, g, b, 255], (v * SKIN_W + u) * 4);
    }
  });
  writeFileSync(new URL(`skin-${name}.png`, OUT), encodePng(SKIN_W, SKIN_H, skin));

  if (name === 'calico') {
    writeFileSync(new URL('kitten-calico@6x.png', OUT), encodePng(sheet.width, sheet.height, sheet.data, 6));
    writeFileSync(
      new URL('kitten.json', OUT),
      JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, cols: sheet.cols, frames: sheet.index }, null, 2) + '\n',
    );
  }
}
const fx = fxSheet();
writeFileSync(new URL('kitten-fx.png', OUT), encodePng(fx.width, fx.height, fx.data));

console.log(`✔ ${Object.keys(FRAMES).length} frames × ${Object.keys(COATS).length} pelagens exportados em assets/`);
