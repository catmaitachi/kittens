import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

// Respeita PORT quando alguém (ex.: um orquestrador de preview) escolhe a porta.
const server = process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {};

// `vite`                   → landing page em desenvolvimento (site/)
// `vite build --mode site` → landing page estática em dist-site/
// `vite build`             → biblioteca (ESM + UMD) em dist/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve' || mode === 'site') {
    return {
      root: page('./site'),
      base: './',
      server,
      build: { outDir: page('./dist-site'), emptyOutDir: true },
    };
  }

  return {
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
  };
});
