/**
 * Clipes de animação (sequências de frames com duração) e o tocador que avança o tempo.
 */
import type { FrameName } from './sprites/atlas';

export interface Clip {
  readonly frames: readonly FrameName[];
  /** Duração de cada frame em ms (um número só vale para todos). */
  readonly ms: number | readonly number[];
  readonly loop?: boolean;
}

export const CLIPS = {
  sit: { frames: ['sit'], ms: 1000, loop: true },
  blink: { frames: ['sitBlink'], ms: 150 },
  tailFlick: { frames: ['sitTail', 'sit', 'sitTail', 'sit'], ms: [170, 170, 170, 300] },
  meow: { frames: ['meow'], ms: 850 },
  yawn: { frames: ['sitBlink', 'yawn', 'yawn', 'sitBlink'], ms: [140, 520, 420, 220] },
  stand: { frames: ['stand'], ms: 1000, loop: true },
  walk: { frames: ['walkA', 'stand', 'walkB', 'stand'], ms: 150, loop: true },
  /** Galope: empurra, voa esticado, aterrissa e voa recolhido — com o pulinho em cada voo. */
  run: { frames: ['runA', 'runB', 'runC', 'runD'], ms: 85, loop: true },
  /** Deitado pronto para o bote: o mesmo desenho de quando ele descansa. */
  crouch: { frames: ['loaf'], ms: 1000, loop: true },
  wiggle: { frames: ['loaf', 'loafTail'], ms: 150, loop: true },
  leap: { frames: ['leap'], ms: 1000, loop: true },
  fall: { frames: ['walkA'], ms: 1000, loop: true },
  // Na parede o gato é o mesmo de sempre, só que deitado de lado: o componente gira o
  // sprite 90° enquanto ele está agarrado, então escalar é literalmente andar na parede.
  /** Agarrado: patas recolhidas, sem subir. */
  wallGrab: { frames: ['gather'], ms: 420, loop: true },
  /** Subindo: a caminhada, girada para a parede. */
  wallClimb: { frames: ['walkA', 'stand', 'walkB', 'stand'], ms: 145, loop: true },
  /** Se puxando pela borda: as dianteiras esticadas, como no espreguiçar. */
  ledge: { frames: ['stretch'], ms: 340 },
  land: { frames: ['loaf'], ms: 150 },
  groom: {
    frames: ['lick', 'lickUp', 'lick', 'lickUp', 'lick', 'lickUp', 'wash', 'sitBlink', 'wash', 'sitBlink'],
    ms: [230, 230, 230, 230, 230, 260, 320, 200, 320, 320],
    loop: true,
  },
  loaf: { frames: ['loaf'], ms: 1000, loop: true },
  /** Deitado de olhos abertos, abanando o rabo. */
  loafWag: { frames: ['loaf', 'loafTail'], ms: [520, 460], loop: true },
  loafBlink: { frames: ['sleep'], ms: 160 },
  sleep: { frames: ['sleep', 'sleepBreath'], ms: [1400, 1150], loop: true },
  stretch: { frames: ['stretch'], ms: 1500 },
  bat: { frames: ['batUp', 'batDown', 'sit'], ms: [170, 150, 260], loop: true },
  /** No colo: visto de frente, com o rabo indo e voltando feito pêndulo. */
  dangle: { frames: ['dangleA', 'dangleB', 'dangleC', 'dangleD', 'dangleC', 'dangleB'], ms: 190, loop: true },
} satisfies Record<string, Clip>;

export type ClipName = keyof typeof CLIPS;

/** Toca um clipe por vez; `done` fica `true` quando um clipe sem loop termina. */
export class Animator {
  name: ClipName = 'sit';
  done = false;
  /** Multiplicador de velocidade (ex.: andar mais rápido = pernas mais rápidas). */
  rate = 1;
  private clip: Clip = CLIPS.sit;
  private index = 0;
  private elapsed = 0;

  get frame(): FrameName {
    return this.clip.frames[this.index]!;
  }

  play(name: ClipName, restart = false): void {
    if (name === this.name && !restart && !this.done) return;
    this.name = name;
    this.clip = CLIPS[name];
    this.index = 0;
    this.elapsed = 0;
    this.done = false;
    this.rate = 1;
  }

  /** Avança `dtMs` e devolve o frame atual. */
  update(dtMs: number): FrameName {
    if (this.done) return this.frame;
    this.elapsed += dtMs * this.rate;
    const { frames, ms, loop } = this.clip;
    for (;;) {
      const duration = typeof ms === 'number' ? ms : ms[this.index] ?? 200;
      if (this.elapsed < duration) break;
      this.elapsed -= duration;
      if (this.index + 1 < frames.length) this.index++;
      else if (loop) this.index = 0;
      else {
        this.done = true;
        break;
      }
    }
    return this.frame;
  }
}
