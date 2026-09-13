/**
 * Exporta a pixel art para PNG (uma spritesheet por pelagem + uma versão ampliada)
 * e um JSON com a posição de cada frame. Não depende de nenhuma lib: o PNG é
 * montado aqui mesmo com zlib do Node.
 *
 *   npm run sprites
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { FRAMES, FX_FRAMES } from '../src/sprites/frames.ts';
import { PALETTES, PATTERNS, type PaletteName } from '../src/sprites/palette.ts';
import { rasterizeSheet, validateFrames, CELL_W, CELL_H } from '../src/sprites/rasterize.ts';

const OUT = new URL('../assets/', import.meta.url);

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** PNG RGBA 8 bits, com ampliação "vizinho mais próximo" opcional. */
function encodePng(width: number, height: number, rgba: Uint8ClampedArray, scale = 1): Buffer {
  const w = width * scale;
  const h = height * scale;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < w; x++) {
      const s = (sy * width + Math.floor(x / scale)) * 4;
      const d = y * stride + 1 + x * 4;
      raw[d] = rgba[s]!;
      raw[d + 1] = rgba[s + 1]!;
      raw[d + 2] = rgba[s + 2]!;
      raw[d + 3] = rgba[s + 3]!;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

const problems = [...validateFrames(FRAMES, PALETTES.calico), ...validateFrames(FX_FRAMES, PALETTES.calico, 8, 8)];
if (problems.length) {
  console.error('Pixel art com problemas:\n  ' + problems.join('\n  '));
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [name, palette] of Object.entries(PALETTES)) {
  const sheet = rasterizeSheet(FRAMES, palette, 8, CELL_W, CELL_H, PATTERNS[name as PaletteName]);
  writeFileSync(new URL(`kitten-${name}.png`, OUT), encodePng(sheet.width, sheet.height, sheet.data));
  if (name === 'calico') {
    writeFileSync(new URL('kitten-calico@6x.png', OUT), encodePng(sheet.width, sheet.height, sheet.data, 6));
    writeFileSync(
      new URL('kitten.json', OUT),
      JSON.stringify({ cell: { w: CELL_W, h: CELL_H }, cols: sheet.cols, frames: sheet.index }, null, 2) + '\n',
    );
  }
}
const fx = rasterizeSheet(FX_FRAMES, PALETTES.calico, 8, 8, 8);
writeFileSync(new URL('kitten-fx.png', OUT), encodePng(fx.width, fx.height, fx.data));

console.log(`✔ ${Object.keys(FRAMES).length} frames × ${Object.keys(PALETTES).length} pelagens exportados em assets/`);
