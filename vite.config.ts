import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

// Respeita PORT quando alguém (ex.: um orquestrador de preview) escolhe a porta.
const server = process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {};

// `vite`                   → servidor de desenvolvimento (demo em /, playground em /playground.html)
// `vite build`             → biblioteca (ESM + UMD) em dist/
// `vite build --mode demo` → site estático da demo + playground em dist-demo/
export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
    return {
      base: './',
      server,
      build: {
        outDir: 'dist-demo',
        emptyOutDir: true,
        rolldownOptions: {
          input: { main: page('./index.html'), playground: page('./playground.html') },
        },
      },
    };
  }

  return {
    server,
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
