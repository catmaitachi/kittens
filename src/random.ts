/**
 * Aleatório com semente (mulberry32). Com a mesma semente o gato repete as mesmas
 * escolhas, o que ajuda a testar e a reproduzir um comportamento.
 */
export class Random {
  private state: number;

  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.state = seed >>> 0;
  }

  /** Número em [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Inteiro em [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T | undefined {
    return list.length ? list[Math.floor(this.next() * list.length)] : undefined;
  }

  /** Sorteia uma chave com probabilidade proporcional ao peso. */
  weighted<K extends string>(weights: Partial<Record<K, number>>): K | undefined {
    let total = 0;
    for (const k in weights) total += Math.max(0, weights[k] ?? 0);
    if (total <= 0) return undefined;
    let roll = this.next() * total;
    for (const k in weights) {
      roll -= Math.max(0, weights[k] ?? 0);
      if (roll < 0) return k;
    }
    return undefined;
  }
}
