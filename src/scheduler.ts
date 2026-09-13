/**
 * Um único `requestAnimationFrame` para todos os gatos da página.
 * Com 1 ou 100 gatos existe um só loop; ele para sozinho quando ninguém está
 * inscrito ou quando a aba fica em segundo plano.
 */

export interface Tickable {
  /** `dt` em segundos (limitado para não "teleportar" depois de travadas). */
  tick(dt: number, now: number): void;
}

const MAX_DT = 1 / 20;

const subscribers = new Set<Tickable>();
let rafId = 0;
let last = 0;
let visibilityBound = false;

function loop(now: number): void {
  const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
  last = now;
  for (const s of subscribers) {
    try {
      s.tick(dt, now);
    } catch (err) {
      // Um gato com erro não derruba os outros.
      subscribers.delete(s);
      console.error('[kitten] erro no tick, gato removido do loop:', err);
    }
  }
  rafId = subscribers.size > 0 ? requestAnimationFrame(loop) : 0;
}

function start(): void {
  if (rafId || subscribers.size === 0 || document.hidden) return;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stop(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function bindVisibility(): void {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

/** Inscreve no loop compartilhado. Retorna a função que cancela a inscrição. */
export function subscribe(target: Tickable): () => void {
  bindVisibility();
  subscribers.add(target);
  start();
  return () => {
    subscribers.delete(target);
    if (subscribers.size === 0) stop();
  };
}
