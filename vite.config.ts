import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

// `vite build` → biblioteca (ESM + UMD) em dist/
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: page('./src/index.ts'),
      name: 'Kittens',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'kittens.js' : 'kittens.umd.cjs'),
    },
  },
});
