/**
 * Pelagens.
 *
 * Uma pelagem é uma matriz de pixels (a "skin", como a do Minecraft) mais as cores que não
 * são pelo. Cada pixel de pelo de cada pose sabe em que célula da matriz ele cai
 * (`skinCellAt`, em skin.ts), então pintar uma célula muda aquele pedaço do gato em todas
 * as poses. Criar uma pelagem é só montar um objeto `KittenCoat` e chamar `registerCoat`.
 *
 * Só dados e funções puras: roda no Node também.
 */
import type { Coat } from './atlas.ts';

export interface KittenCoat {
  /** Identificador; depois de `registerCoat` vale em `coat="nome"`. */
  readonly name: string;
  /** `SKIN_H` linhas de `SKIN_W` caracteres. Cada caractere é uma cor de `colors`; `.` é célula sem uso. */
  readonly skin: readonly string[];
  /** Caractere da skin → cor `#rrggbb`, exatamente a que aparece (a sombra já vem pintada na matriz). */
  readonly colors: Readonly<Record<string, string>>;
  /** Contorno (`k`). */
  readonly outline: string;
  /** Contorno suave (`s`): dobras por dentro do corpo, como o pescoço. */
  readonly outlineSoft: string;
  /** Rosa (`p`): nariz, língua e almofadinhas. */
  readonly nose: string;
  /** Cada olho com a sua cor, olhando o desenho virado para a direita. */
  readonly eyes: { readonly left: string; readonly right: string };
}

/**
 * As pelagens prontas. Convertidas das regras de pintura da 1.x (cada célula com a cor que
 * aparecia em mais pixels) e depois limpas à mão; as células de sombra já têm a cor escura.
 */
export const COATS = {
  calico: {
    name: 'calico',
    skin: [
      '.............aabbaa................',
      '...e....c...aabbbbaa...............',
      '..ef...cb...aabbbbaa...............',
      '..bbaacbb...aabbbbaa...............',
      '.aaaaaccca..aabbbbaa...............',
      '.caaaaccaa...aabbaa................',
      '.ccaaaaaaa...aaaaaa................',
      '.dda.aaaaa....a...a................',
      '..deaa.aaa..baaddd.................',
      '...................................',
      '...aaaaaaaa.........aaaaa..........',
      '.caabbbbbaaaaa.....caaaaa..........',
      '.ca.bbbbaaa.......ccccaaaa.........',
      'caab...a.a.a......cccaaaaaaaaaaaaa.',
      '.babaa.a.a.aa.....ccaaaabbbbbbbaa..',
      '...................aabb.....bbbaa..',
      '....aaaaa......aaaabaa.a..b.aaaaaaa',
      '..aaaaaaa........aab.a.a..b.ab.aa..',
      '.cccaaaa...........................',
      '.ccaaaaa.......caaa................',
      'cccaaaaa.......cccaaa..............',
      'ccaaaabb.......ccaaaaa.............',
      'caabbbbbb......ccaaaaaaa...........',
      '...............cgaaaaaaa...........',
      '................bbbbbbbb...........',
      '................b.a.....a..........',
      '................b.a......aaaaaaaaaa',
    ],
    colors: { 'a': '#e1e6e6', 'b': '#c4c8c8', 'c': '#1e2a32', 'd': '#d69058', 'e': '#be8150', 'f': '#a57046', 'g': '#1a252c' },
    outline: '#111114',
    outlineSoft: '#6f7173',
    nose: '#e59aa8',
    eyes: { left: '#dca157', right: '#dca157' },
  },
  orange: {
    name: 'orange',
    skin: [
      '.............abbbbb................',
      '...a....a...aaffffaa...............',
      '..ae...ae...abffffba...............',
      '..deacade...abffffba...............',
      '.aaaaaaaaa..abffffba...............',
      '.ccaaaaaaa...abffba................',
      '.aaaaaaaaa...aaaaaa................',
      '.caa.bbbaa....b...b................',
      '..aabb.bba..acacba.................',
      '...................................',
      '...acabbbbb.........aacaa..........',
      '.acaaaddddaaaa.....caacaa..........',
      '.ac.aaaaaaa.......acaacaac.........',
      'caaa...b.b.a......acaacaacaaabbbbb.',
      '.ddabf.f.f.bb.....aaaaaaaaaaadddd..',
      '...................aaad.....aaaaa..',
      '....caaca......aaaabab.a..d.ababaaa',
      '..aacaaca........fbf.f.b..f.ff.bf..',
      '.caacaac...........................',
      '.caacaac.......aaca................',
      'acaacaac.......aacaca..............',
      'aaaaaaaa.......dacacac.............',
      'abfaaaabf......daaacacac...........',
      '...............ddaaaacac...........',
      '................ddddaaaa...........',
      '................b.b.....a..........',
      '................f.f......bfabbbbbaf',
    ],
    colors: { 'a': '#e79a51', 'b': '#fdfaf5', 'c': '#c97a30', 'd': '#c98646', 'e': '#af6a2a', 'f': '#dcdad5' },
    outline: '#35200f',
    outlineSoft: '#b8834b',
    nose: '#ee9aa4',
    eyes: { left: '#8cbf4f', right: '#8cbf4f' },
  },
  black: {
    name: 'black',
    skin: [
      '.............aabbaa................',
      '...a....a...aabbbbaa...............',
      '..ab...ab...aabbbbaa...............',
      '..bbaaabb...aabbbbaa...............',
      '.aaaaaaaaa..aabbbbaa...............',
      '.aaaaaaaaa...aabbaa................',
      '.aaaaaaaaa...aaaaaa................',
      '.aaa.aaaaa....a...a................',
      '..aaaa.aaa..baaaaa.................',
      '...................................',
      '...aaaaaaaa.........aaaaa..........',
      '.aaabbbbbaaaaa.....aaaaaa..........',
      '.aa.bbbbaaa.......aaaaaaaa.........',
      'aaab...a.a.a......aaaaaaaaaaaaaaaa.',
      '.babaa.a.a.aa.....aaaaaabbbbbbbaa..',
      '...................aabb.....bbbaa..',
      '....aaaaa......aaaabaa.a..b.aaaaaaa',
      '..aaaaaaa........aab.a.a..b.ab.aa..',
      '.aaaaaaa...........................',
      '.aaaaaaa.......aaaa................',
      'aaaaaaaa.......aaaaaa..............',
      'aaaaaabb.......aaaaaaa.............',
      'aaabbbbbb......aaaaaaaaa...........',
      '...............abaaaaaaa...........',
      '................bbbbbbbb...........',
      '................b.a.....a..........',
      '................b.a......aaaaaaaaaa',
    ],
    colors: { 'a': '#33333d', 'b': '#2c2c35' },
    outline: '#08080b',
    outlineSoft: '#1b1b22',
    nose: '#c48a96',
    eyes: { left: '#e8cb4a', right: '#e8cb4a' },
  },
  gray: {
    name: 'gray',
    skin: [
      '.............aaeeaa................',
      '...c....a...aaeeeeaa...............',
      '..af...af...aaeeeeaa...............',
      '..gfdadef...aaeeeeaa...............',
      '.aaaaadaaa..aaeeeeaa...............',
      '.daaaaaaaa...aaeeaa................',
      '.aaaaaaaaa...aaaaaa................',
      '.dda.aaaaa....a...a................',
      '..aaaa.aaa..gadaaa.................',
      '...................................',
      '...daaaaaaa.........aaaaa..........',
      '.daaeeeeeaaaaa.....aadaad..........',
      '.aa.ggeeaaa.......aaadaaad.........',
      'aabe...a.a.a......aaaaaaaaababaaaa.',
      '.gagaa.a.a.aa.....aaaaaaeeeeeeeaa..',
      '...................aaeg.....eeeaa..',
      '....aaaaa......aaaagaa.a..g.aaaaaaa',
      '..aaadaaa........aag.a.a..g.ag.aa..',
      '.adaadaa...........................',
      '.adadaba.......aaad................',
      'adaaaaaa.......aaddaa..............',
      'aaaaaaee.......aadaabd.............',
      'aaaeeeeee......aaaaaddaa...........',
      '...............agaaaaaaa...........',
      '................gggeeeeg...........',
      '................g.a.....a..........',
      '................g.a......aaaaaaaaaa',
    ],
    colors: { 'a': '#bcc5cc', 'b': '#c0cdd6', 'c': '#99a3ab', 'd': '#a2abb3', 'e': '#a7b2ba', 'f': '#858e95', 'g': '#a4abb1' },
    outline: '#171a1f',
    outlineSoft: '#61676d',
    nose: '#e39aa8',
    eyes: { left: '#7cc6e4', right: '#7cc6e4' },
  },
  siamese: {
    name: 'siamese',
    skin: [
      '.............akccka................',
      '...k....k...aaccccaa...............',
      '..kc...kc...abddddba...............',
      '..ccaaacc...abddddba...............',
      '.mmaaaaamm..abddddba...............',
      '.aaaaaaaaa...abddba................',
      '.aaakkkkaa...aaaaaa................',
      '.aam.kkkkm....k...k................',
      '..amkk.kkm..ekkkkk.................',
      '...................................',
      '...aaakkkkk.........aaaaa..........',
      '.aaafffffaaaaa.....aaaaaa..........',
      '.aa.ffffaaa.......aaaaaaaa.........',
      'aaaf...m.m.m......aaaaaaaaaaakkkkk.',
      '.ckckk.k.k.kk.....aaaaaafffffffaa..',
      '...................aafe.....fffaa..',
      '....aaaaa......mmmmemm.m..e.mmmmmmm',
      '..aaaaaaa........kkc.k.k..c.kc.kk..',
      '.aaaaaaa...........................',
      '.aaaaaaa.......aaaa................',
      'aaaaaaaa.......aaaaaa..............',
      'aaaaaaff.......aaaaaaa.............',
      'aaaffffff......aaaaaaaaa...........',
      '...............afaaaaaaa...........',
      '................ffffffff...........',
      '................e.m.....a..........',
      '................c.k......kaakkkkkak',
    ],
    colors: { 'a': '#f7f0e1', 'b': '#fffbe1', 'c': '#4f3d2f', 'd': '#dedac4', 'e': '#785c47', 'f': '#d7d1c4', 'k': '#5b4636', 'm': '#8a6a52' },
    outline: '#241a14',
    outlineSoft: '#a3907c',
    nose: '#dda3ad',
    eyes: { left: '#63b2dd', right: '#63b2dd' },
  },
} satisfies Record<string, KittenCoat>;

export type CoatName = keyof typeof COATS;

const registry = new Map<string, KittenCoat>(Object.entries(COATS));

/** Registra uma pelagem para ela valer por nome (`coat="nome"`). Registrar de novo substitui. */
export function registerCoat(coat: KittenCoat): void {
  registry.set(coat.name, coat);
}

/** Pelagem de um nome ou objeto; nome desconhecido (ou nada) vira calico. */
export function resolveCoat(coat?: Coat): KittenCoat {
  if (coat && typeof coat === 'object') return { ...COATS.calico, ...coat };
  return registry.get(coat ?? 'calico') ?? COATS.calico;
}
