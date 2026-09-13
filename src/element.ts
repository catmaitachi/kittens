/**
 * Web Component: `<kitten-pet>`. Coloque dentro do elemento onde o gato deve viver.
 *
 *   <section class="vitrine">
 *     ...seus elementos...
 *     <kitten-pet coat="calico" scale="3" name="Mingau"></kitten-pet>
 *   </section>
 *
 * Atributos: coat, scale, speed, name, platforms, interactive, summon (dois cliques
 * chamam o gato), nudge, seed, phrases ("miau!|prrr"), container (seletor de um
 * ancestral; padrão = o pai).
 * Os eventos saem como `kitten:statechange`, `kitten:meow`, `kitten:land`... e borbulham.
 */
import type { ActionName } from './brain';
import { Kitten, type KittenOptions } from './kitten';
import type { Coat } from './sprites/atlas';

const ATTRIBUTES = ['coat', 'scale', 'speed', 'name', 'platforms', 'interactive', 'summon', 'nudge', 'seed', 'phrases', 'container'];

// Em SSR (sem DOM) o módulo continua importável.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

export class KittenElement extends Base {
  static readonly observedAttributes = ATTRIBUTES;

  private cat: Kitten | null = null;
  private queued = false;

  /** A instância por trás do elemento (null enquanto desconectado). */
  get kitten(): Kitten | null {
    return this.cat;
  }

  connectedCallback(): void {
    this.schedule(false);
  }

  disconnectedCallback(): void {
    // Espera o microtask: mover o elemento de lugar desconecta e reconecta na sequência.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.cat?.destroy();
      this.cat = null;
    });
  }

  attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
    if (!this.cat || previous === value) return;
    if (name === 'coat') this.cat.setCoat((value || 'calico') as Coat);
    else this.schedule(true);
  }

  do(action: ActionName): void {
    this.cat?.do(action);
  }

  meow(text?: string): void {
    this.cat?.meow(text);
  }

  private schedule(recreate: boolean): void {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.isConnected) return;
      if (this.cat && !recreate) return;
      this.cat?.destroy();
      this.cat = this.create();
    });
  }

  private create(): Kitten | null {
    const selector = this.getAttribute('container');
    const container = (selector ? this.parentElement?.closest(selector) : this.parentElement) as HTMLElement | null;
    if (!container) return null;
    const num = (name: string): number | undefined => {
      const v = this.getAttribute(name);
      return v === null || v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Number(v);
    };
    const bool = (name: string): boolean | undefined => {
      const v = this.getAttribute(name);
      return v === null ? undefined : v !== 'false';
    };
    const options: KittenOptions = {
      layer: this,
      coat: (this.getAttribute('coat') || undefined) as Coat | undefined,
      scale: num('scale'),
      speed: num('speed'),
      seed: num('seed'),
      name: this.getAttribute('name') ?? undefined,
      platforms: this.getAttribute('platforms') ?? undefined,
      interactive: bool('interactive'),
      summon: bool('summon'),
      nudge: bool('nudge'),
      phrases: this.getAttribute('phrases')?.split('|').map((p) => p.trim()).filter(Boolean),
    };
    return new Kitten(container, options);
  }
}

/** Registra o elemento (idempotente). Chamado automaticamente pelo `index`. */
export function defineKitten(tag = 'kitten-pet'): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  customElements.define(tag, class extends KittenElement {});
}

declare global {
  interface HTMLElementTagNameMap {
    'kitten-pet': KittenElement;
  }
}
