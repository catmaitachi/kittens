/**
 * Pelagens.
 *
 * O desenho é um modelo genérico e liso: os frames só marcam pelo, sombra, contorno,
 * olho e nariz — nenhuma mancha. Quem dá a pelagem é a máscara da raça: uma função que
 * recebe cada pixel (onde ele cai no bicho, onde está o focinho, onde começa o lombo) e
 * devolve a cor. Trocar de raça troca o padrão, não só as cores.
 *
 * Só importa dados (a máscara do calico), para o script de exportação poder lê-lo no Node.
 */
import { CALICO_PATCHES } from './patches.ts';


export type PaletteKey = 'k' | 's' | 'w' | 'g' | 'd' | 'o' | 'a' | 'p';

/** Cores em `#rrggbb` para cada região do modelo. */
export type Palette = Readonly<Record<PaletteKey, string>>;

/** Onde o pixel está dentro do frame — é o que as máscaras usam. */
export interface PatternContext {
  readonly symbol: PaletteKey;
  /** Nome do frame que está sendo pintado (para máscaras desenhadas à mão). */
  readonly frame: string;
  readonly x: number;
  readonly y: number;
  /** Caixa que o gato ocupa no frame (o desenho muda de pose). */
  readonly box: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
  /** Posição do nariz, quando o frame mostra o rosto (para máscaras). */
  readonly nose: { readonly x: number; readonly y: number } | null;
  /** Linha em que o desenho começa nesta coluna: a silhueta de cima (lombo, cabeça, rabo). */
  readonly columnTop: number;
  /** Símbolo do desenho em qualquer posição do frame (`.` fora dele) — para regras de borda. */
  readonly at: (x: number, y: number) => string;
  readonly palette: Palette;
}

/** Devolve a cor do pixel ou `null` para deixar a cor da paleta. */
export type PatternFn = (ctx: PatternContext) => string | null;

/** O modelo genérico: o gato liso de onde todas as raças herdam. */
export const BASE_PALETTE: Palette = {
  k: '#141418', // contorno
  s: '#737377', // contorno suave: dobras por dentro do corpo (pescoço), sem peso de silhueta
  w: '#e8e8ea', // pelo
  g: '#cbcbd2', // sombra do pelo
  d: '#3a3a44', // mancha escura, à disposição da máscara
  o: '#bcbcc4', // mancha clara, à disposição da máscara
  a: '#d8b25a', // olho
  p: '#e59aa8', // rosa: nariz, língua e as almofadinhas das patas
};

function channels(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura duas cores (`t` = 0 fica na primeira, 1 na segunda). */
function mix(from: string, to: string, t: number): string {
  const a = channels(from);
  const b = channels(to);
  const amount = Math.max(0, Math.min(1, t));
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * amount));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Cor base de um pixel de pelo (contorno, olho e nariz ficam de fora). */
function fur(ctx: PatternContext): string | null {
  return ctx.symbol === 'w' || ctx.symbol === 'g' ? ctx.palette[ctx.symbol] : null;
}

/** O pixel está na sombra do desenho? A mancha pintada ali também escurece. */
function shaded(ctx: PatternContext): boolean {
  return ctx.symbol === 'g';
}

/** Altura relativa do pixel: 0 nas costas, 1 nas patas. */
function depth(ctx: PatternContext): number {
  return (ctx.y - ctx.box.top) / Math.max(1, ctx.box.bottom - ctx.box.top);
}

/** Quanto o pixel está abaixo da silhueta de cima — 0 é o fio do lombo. */
function rise(ctx: PatternContext): number {
  return ctx.y - ctx.columnTop;
}

/** Distância do pixel até o focinho, em pixels: 0 no nariz e crescendo rumo ao rabo. */
function behind(ctx: PatternContext): number {
  return ctx.nose ? ctx.nose.x - ctx.x : 0;
}

/**
 * Calico: as manchas dele são desenhadas à mão, frame a frame, em `CALICO_PATCHES` — é o
 * único padrão que não dá para descrever com uma regra, e ele é a cara do bichinho.
 */
const calicoPattern: PatternFn = (ctx) => {
  const base = fur(ctx);
  if (base === null) return null;
  const mark = CALICO_PATCHES[ctx.frame]?.[ctx.y]?.[ctx.x];
  if (mark === 'd') return ctx.palette.d; // mancha grafite
  if (mark === 'o') return ctx.palette.o; // mancha alaranjada
  if (mark === 'O') return mix(ctx.palette.o, ctx.palette.k, 0.12); // a última linha da mancha
  return base;
};

/** Uma pelagem de pelo curto: tom único, listras curtas e, se quiser, branco embaixo. */
interface Shorthair {
  /** Cor das listras. */
  readonly stripe: string;
  /** O quanto a listra escurece o pelo, de 0 a 1. */
  readonly strength?: number;
  /** Colunas entre uma listra e a seguinte. */
  readonly spacing?: number;
  /** Comprimento da listra a partir do lombo, em pixels — ela nunca cruza o corpo. */
  readonly reach?: number;
  /** Branco do peito, da barriga, das patas e do focinho (gato bicolor). */
  readonly belly?: string;
}

/** Focinho, peito, barriga e a ponta das patas: as partes brancas de um gato bicolor. */
function underside(ctx: PatternContext): boolean {
  if (ctx.nose) {
    const dx = ctx.x - ctx.nose.x;
    const dy = ctx.y - ctx.nose.y;
    if (Math.sqrt(dx * dx + dy * dy) <= 3) return true; // a máscara branca do rosto vem antes de tudo
  }
  const paw = ctx.box.bottom - 1;
  if (ctx.y >= paw) return true; // as meias brancas na ponta das patas
  if (ctx.y > paw - 2) return false; // o resto da perna fica na cor do pelo
  const edge = 0.7 + ((ctx.x >> 1) % 2 ? -0.03 : 0.05); // a divisa sobe e desce, sem virar uma régua
  return depth(ctx) >= edge;
}

/**
 * Pelo curto: o bicho fica num tom só e as listras são riscos curtos caindo do lombo —
 * seguem a silhueta e param no meio do caminho, em vez de atravessar o corpo.
 */
function shorthair({ stripe, strength = 0.3, spacing = 3, reach = 3, belly }: Shorthair): PatternFn {
  return (ctx) => {
    const coat = fur(ctx);
    if (coat === null) return null;
    if (belly && underside(ctx)) return shaded(ctx) ? mix(belly, ctx.palette.g, 0.22) : belly;
    const down = rise(ctx);
    if (down < 1 || down > reach || ctx.x % spacing !== 0) return coat;
    return mix(coat, stripe, strength * (1 - (down - 1) / (reach + 1)));
  };
}

/** Rampa linear: 0 em `from`, 1 em `to`, presa nas pontas (aceita `from` maior que `to`). */
function ramp(value: number, from: number, to: number): number {
  return Math.max(0, Math.min(1, (value - from) / (to - from)));
}

/**
 * Siamês: corpo claro com as pontas escuras. Cada ponta — orelhas, focinho, traseira com o
 * rabo e patas — entra como um degradê e o mais forte é o que vale, então não existe linha
 * dura em lugar nenhum, é tudo dissolvido no creme.
 */
const siamesePattern: PatternFn = (ctx) => {
  const base = fur(ctx);
  if (base === null) return null;
  const v = depth(ctx);

  let t = Math.max(0, 0.5 - v * 1.3); // costas escurecendo até a barriga
  t = Math.max(t, ramp(v, 0.36, 0) * 1); // orelhas bem escuras, dissolvendo testa abaixo
  t = Math.max(t, ramp(behind(ctx), 7, 16) * 0.88); // traseira, ficando mais escura rumo ao rabo
  if (ctx.y >= ctx.box.bottom - 1) t = Math.max(t, 0.42); // patas
  if (ctx.nose) {
    const dx = ctx.x - ctx.nose.x;
    const dy = (ctx.y - ctx.nose.y) * 1.2;
    t = Math.max(t, ramp(Math.sqrt(dx * dx + dy * dy), 3.6, 1.6) * 0.85); // máscara do focinho
  }
  return t > 0.02 ? mix(base, ctx.palette.d, t) : base;
};

export const PALETTES = {
  /** O gato original: branco com manchas laranja e grafite, olhos âmbar. */
  calico: { ...BASE_PALETTE, k: '#111114', s: '#6f7173', w: '#e1e6e6', g: '#c4c7c8', d: '#1e2a32', o: '#d69058', a: '#dca157', p: '#e59aa8' },
  /** Laranjinha bicolor: laranja em cima com listras discretas, branco embaixo. */
  orange: { ...BASE_PALETTE, k: '#35200f', s: '#b8834b', w: '#e79a51', g: '#d1853d', d: '#a85c22', o: '#e79a51', a: '#8cbf4f', p: '#ee9aa4' },
  /** Pretinho: preto inteiro, só os olhos amarelos aparecem. */
  black: { ...BASE_PALETTE, k: '#08080b', s: '#1b1b22', w: '#33333d', g: '#2b2b35', d: '#24242e', o: '#2f2f39', a: '#e8cb4a', p: '#c48a96' },
  /** Cinza liso: um tom só, com listras bem discretas caindo do lombo. */
  gray: { ...BASE_PALETTE, k: '#171a1f', s: '#61676d', w: '#bcc5cc', g: '#a7b2ba', d: '#68737e', o: '#bcc5cc', a: '#7cc6e4', p: '#e39aa8' },
  /** Siamês: creme com pontas escuras, máscara no rosto e degradê nas costas. */
  siamese: { ...BASE_PALETTE, k: '#241a14', s: '#a3907c', w: '#f7f0e1', g: '#e7dac4', d: '#6b4b37', o: '#dccbb2', a: '#63b2dd', p: '#dda3ad' },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/**
 * A máscara de cada raça. Quem não aparece aqui fica com o gato liso na cor da paleta —
 * é o caso do preto, que é preto inteiro.
 */
export const PATTERNS: Partial<Record<PaletteName, PatternFn>> = {
  calico: calicoPattern,
  orange: shorthair({ stripe: '#a85c22', strength: 0.34, belly: '#fdfaf5' }),
  gray: shorthair({ stripe: '#68737e', strength: 0.42 }),
  siamese: siamesePattern,
};
