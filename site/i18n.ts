export type Lang = 'pt' | 'en';

const pt = {
  'lang.label': 'Idioma',
  'theme.system': 'tema: sistema',
  'theme.light': 'tema: claro',
  'theme.dark': 'tema: escuro',
  tagline: 'Gatinhos em pixel art que moram dentro da sua página.',
  copy: 'copiar',
  copied: 'copiado!',
  'hero.hint': 'Eles já estão andando nas letras. Clique num deles ou arraste.',
  'coats.title': 'Cinco pelagens',
  'coats.text': 'Escolha uma amostra de papel e o gato troca de pelagem na hora, sem ser recriado. As manchas mudam junto com as cores.',
  'summon.title': 'Dois cliques e eles vêm',
  'summon.text': 'Com a opção summon ligada, dois cliques em qualquer ponto chamam os gatos. Eles pulam e escalam o que estiver no caminho.',
  'summon.hint': 'clique duas vezes em qualquer lugar do mural',
  'summon.note1': 'comprar ração',
  'summon.note2': 'vet quinta 14h',
  'summon.note3': 'não subir na mesa',
  'parkour.title': 'Parkour pela página',
  'parkour.text': 'Os gatos leem o layout de verdade. Pisam no topo dos elementos, escalam as laterais e, no meio da subida, costumam pular para outro lugar.',
  'parkour.photo1': 'mingau, 2026',
  'parkour.photo2': 'o sofá',
  'parkour.photo3': 'a estante',
  'crowd.title': 'Uma caixa cheia',
  'crowd.text': 'Gatos no mesmo container se enxergam. Eles se cumprimentam, brincam de pega-pega e dormem lado a lado.',
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
  'footer.copyright': '© 2026 Lucas Spiazzi. Código aberto sob a licença MIT.',
  'footer.top': 'voltar ao topo',
};

const en: Record<keyof typeof pt, string> = {
  'lang.label': 'Language',
  'theme.system': 'theme: system',
  'theme.light': 'theme: light',
  'theme.dark': 'theme: dark',
  tagline: 'Pixel-art kittens that live inside your page.',
  copy: 'copy',
  copied: 'copied!',
  'hero.hint': "They're already walking on the letters. Click one or drag it around.",
  'coats.title': 'Five coats',
  'coats.text': 'Pick a paper swatch and the cat changes its coat on the spot, without being recreated. The patches change along with the colors.',
  'summon.title': 'Double-click and they come',
  'summon.text': 'With the summon option on, a double-click anywhere calls the cats over. They jump and climb whatever is in the way.',
  'summon.hint': 'double-click anywhere on the board',
  'summon.note1': 'buy cat food',
  'summon.note2': 'vet thursday 2pm',
  'summon.note3': 'stay off the table',
  'parkour.title': 'Parkour across the page',
  'parkour.text': 'The cats read your actual layout. They stand on top of elements, climb their sides and often leap somewhere else halfway up.',
  'parkour.photo1': 'mingau, 2026',
  'parkour.photo2': 'the couch',
  'parkour.photo3': 'the bookshelf',
  'crowd.title': 'A box full of cats',
  'crowd.text': 'Cats in the same container notice each other. They say hi, play tag and sleep side by side.',
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
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n as Key);
  }
  for (const fn of listeners) fn(next);
}
