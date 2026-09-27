export type Lang = 'pt' | 'en';

const pt = {
  brand: 'Gatinhos',
  'lang.label': 'Idioma',
  'theme.system': 'tema: sistema',
  'theme.light': 'tema: claro',
  'theme.dark': 'tema: escuro',
  tagline: 'Gatinhos em pixel art que moram dentro da sua página.',
  copy: 'copiar',
  copied: 'copiado!',
  'hero.hint': 'Eles já estão andando nas letras. Clique num deles ou arraste.',
  'customizer.title': 'Pinte o gato do seu jeito',
  'customizer.text': 'A pelagem vem de uma grade de cores, como a skin de um boneco. Cabeça e rabo valem para todas as poses; o corpo e as patas, você pinta pose por pose.',
  'customizer.canvasLabel': 'O gato no palco. Com a edição aberta, use as setas para escolher um pixel e Enter para pintar.',
  'customizer.framePrev': 'quadro anterior',
  'customizer.frameNext': 'próximo quadro',
  'customizer.coatLabel': 'pelagem',
  'customizer.poseLabel': 'pose',
  'customizer.edit': 'editar o gato',
  'customizer.brush': 'cor do pincel',
  'customizer.reset': 'apagar a sua e recomeçar',
  'customizer.dropper': 'conta-gotas',
  'customizer.history': 'cores usadas',
  'customizer.undo': 'desfazer (Ctrl+Z)',
  'customizer.redo': 'refazer (Ctrl+Shift+Z)',
  'customizer.yours': 'a sua',
  'customizer.poseSit': 'sentado',
  'customizer.poseWalk': 'andando',
  'customizer.poseLoaf': 'deitado',
  'customizer.poseStretch': 'espreguiçando',
  'customizer.poseDangle': 'no colo',
  'customizer.adopt': 'Gostou? Peça para o seu agente adotar.',
  'customizer.copyAgent': 'Prompt',
  'customizer.codeSummary': 'código da pelagem',
  'customizer.copyCode': 'copiar código',
  'summon.title': 'Dois cliques e eles vêm',
  'summon.text': 'Com o clique duplo ligado, chame os gatos para qualquer ponto do quadro: eles pulam e escalam o que estiver no caminho. Dá para pegar um gato no colo, mas chacoalhar demais assusta ele, e ele foge até se acalmar.',
  'summon.hint': 'clique duas vezes em qualquer lugar do mural',
  'parkour.title': 'Parkour pela página',
  'parkour.text': 'Os gatos enxergam os elementos da página de verdade: sobem no que encontram, escalam as bordas e, no meio do caminho, decidem pular para outro lugar.',
  'crowd.title': 'Uma caixa cheia',
  'crowd.text': 'Gatos na mesma caixa notam uns aos outros: se cumprimentam, brincam de pega-pega e dormem encostados.',
  'crowd.stamp': 'FRÁGIL',
  'parkour.sticker': 'miau!',
  'footer.deps': 'sem dependências',
  'footer.license': 'licença MIT',
  'footer.project': 'Projeto',
  'footer.repo': 'Código no GitHub',
  'footer.npm': 'Pacote no npm',
  'footer.docs': 'Documentação',
  'footer.issues': 'Relatar um problema',
  'footer.page': 'Nesta página',
  'footer.creditsTitle': 'Créditos',
  'footer.madeBy': 'Feito por Lucas Spiazzi',
  'footer.credits': 'Inspirado no VS Code Pets',
  'footer.font': 'Fonte Jersey 10',
  'footer.claude': 'Feito com Claude',
  'footer.copyright': '© 2026 Lucas Spiazzi. Código aberto sob a licença MIT.',
  'footer.top': 'voltar ao topo',
};

const en: Record<keyof typeof pt, string> = {
  brand: 'Kittens',
  'lang.label': 'Language',
  'theme.system': 'theme: system',
  'theme.light': 'theme: light',
  'theme.dark': 'theme: dark',
  tagline: 'Pixel-art kittens that live inside your page.',
  copy: 'copy',
  copied: 'copied!',
  'hero.hint': "They're already walking on the letters. Click one or drag it around.",
  'customizer.title': 'Paint the cat your way',
  'customizer.text': 'The coat comes from one grid of colors, like a character skin. Head and tail carry over to every pose; the body and paws you paint pose by pose.',
  'customizer.canvasLabel': 'The cat on stage. With editing open, use the arrow keys to pick a pixel and Enter to paint it.',
  'customizer.framePrev': 'previous frame',
  'customizer.frameNext': 'next frame',
  'customizer.coatLabel': 'coat',
  'customizer.poseLabel': 'pose',
  'customizer.edit': 'edit the cat',
  'customizer.brush': 'brush color',
  'customizer.reset': 'delete yours and start over',
  'customizer.dropper': 'eyedropper',
  'customizer.history': 'recent colors',
  'customizer.undo': 'undo (Ctrl+Z)',
  'customizer.redo': 'redo (Ctrl+Shift+Z)',
  'customizer.yours': 'yours',
  'customizer.poseSit': 'sitting',
  'customizer.poseWalk': 'walking',
  'customizer.poseLoaf': 'curled up',
  'customizer.poseStretch': 'stretching',
  'customizer.poseDangle': 'in your arms',
  'customizer.adopt': 'Like it? Ask your agent to adopt it.',
  'customizer.copyAgent': 'Prompt',
  'customizer.codeSummary': 'coat code',
  'customizer.copyCode': 'copy code',
  'summon.title': 'Double-click and they come',
  'summon.text': "With double-click on, call the cats to any spot on the board: they jump and climb over whatever is in the way. You can also pick a cat up, but shake it too much and it gets scared off until it calms back down.",
  'summon.hint': 'double-click anywhere on the board',
  'parkour.title': 'Parkour across the page',
  'parkour.text': 'The cats read your actual page elements: they climb onto whatever they find, scale the edges and, partway up, often leap somewhere else.',
  'crowd.title': 'A box full of cats',
  'crowd.text': 'Cats sharing a box notice each other: they say hi, play tag and sleep curled up together.',
  'crowd.stamp': 'FRAGILE',
  'parkour.sticker': 'meow!',
  'footer.deps': 'zero dependencies',
  'footer.license': 'MIT license',
  'footer.project': 'Project',
  'footer.repo': 'Source on GitHub',
  'footer.npm': 'Package on npm',
  'footer.docs': 'Documentation',
  'footer.issues': 'Report an issue',
  'footer.page': 'On this page',
  'footer.creditsTitle': 'Credits',
  'footer.madeBy': 'Made by Lucas Spiazzi',
  'footer.credits': 'Inspired by VS Code Pets',
  'footer.font': 'Jersey 10 typeface',
  'footer.claude': 'Made with Claude',
  'footer.copyright': '© 2026 Lucas Spiazzi. Open source under the MIT license.',
  'footer.top': 'back to top',
};

export type Key = keyof typeof pt;

const DICT: Record<Lang, Record<Key, string>> = { pt, en };
const STORE = 'kittens-site:lang';
const listeners = new Set<(lang: Lang) => void>();

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORE);
    return v === 'pt' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

let current: Lang = readStored() ?? (navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en');

export const lang = (): Lang => current;
export const t = (key: Key): string => DICT[current][key];

export function onLang(fn: (lang: Lang) => void): void {
  listeners.add(fn);
}

export function setLang(next: Lang): void {
  current = next;
  try {
    localStorage.setItem(STORE, next);
  } catch {
    // Sem storage (aba privada etc.): a escolha vale só nesta visita.
  }
  document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
  document.title = t('brand');
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n as Key);
  }
  for (const fn of listeners) fn(next);
}
