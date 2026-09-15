// Arquivos importados como texto pelo Vite (`import texto from './arquivo.md?raw'`).
declare module '*?raw' {
  const content: string;
  export default content;
}
