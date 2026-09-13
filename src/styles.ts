/**
 * CSS do Shadow DOM de cada camada. Uma única folha de estilo construída é
 * compartilhada por todas as camadas (adoptedStyleSheets); onde isso não existe,
 * cai para um <style> por camada.
 *
 * Personalização pelo lado de fora:
 *   --kitten-z            z-index da camada (padrão 20)
 *   --kitten-font         fonte do balão de fala
 *   --kitten-bubble-bg    fundo do balão
 *   --kitten-bubble-fg    texto e contorno do balão
 *   ::part(cat) e ::part(bubble)
 */
export const CSS: string = /* css */ `
:host {
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  contain: strict;
  pointer-events: none;
  z-index: var(--kitten-z, 20);
}
.cat {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--w);
  height: var(--h);
  will-change: transform;
  pointer-events: none;
}
.sprite {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-size: var(--sheet-w) var(--sheet-h);
  image-rendering: pixelated;
  transform-origin: 50% 24%;
}
.hit {
  position: absolute;
  left: 22%;
  right: 22%;
  bottom: 0;
  height: 62%;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}
.cat[data-dragging] .hit { cursor: grabbing; }
.cat[data-passive] .hit { display: none; }

.p {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--fx);
  height: var(--fx);
  background-image: var(--fx-url);
  background-repeat: no-repeat;
  background-size: var(--fx-sheet-w) var(--fx-sheet-h);
  image-rendering: pixelated;
  pointer-events: none;
  will-change: transform, opacity;
  animation-fill-mode: forwards;
}
.p.heart { animation: g-heart 1.5s cubic-bezier(.2,.7,.3,1) forwards; }
.p.zzz   { animation: g-zzz 2.6s linear forwards; }
.p.dust  { animation: g-dust .5s ease-out forwards; }
.p.alert { animation: g-alert .8s ease-out forwards; }

@keyframes g-heart {
  0%   { opacity: 0; transform: translate(var(--x), var(--y)) scale(.5); }
  15%  { opacity: 1; transform: translate(var(--x), calc(var(--y) - var(--u) * 3)) scale(1); }
  100% { opacity: 0; transform: translate(calc(var(--x) + var(--dx)), calc(var(--y) - var(--u) * 16)) scale(1); }
}
@keyframes g-zzz {
  0%   { opacity: 0; transform: translate(var(--x), var(--y)) scale(.6); }
  20%  { opacity: 1; }
  50%  { transform: translate(calc(var(--x) + var(--u) * 4), calc(var(--y) - var(--u) * 7)) scale(.9); }
  100% { opacity: 0; transform: translate(calc(var(--x) + var(--u) * 2), calc(var(--y) - var(--u) * 15)) scale(1.1); }
}
@keyframes g-dust {
  0%   { opacity: .9; transform: translate(var(--x), var(--y)) scale(.7); }
  100% { opacity: 0; transform: translate(calc(var(--x) + var(--dx)), calc(var(--y) - var(--u))) scale(1.2); }
}
@keyframes g-alert {
  0%   { opacity: 0; transform: translate(var(--x), calc(var(--y) + var(--u) * 2)); }
  20%  { opacity: 1; transform: translate(var(--x), calc(var(--y) - var(--u))); }
  35%  { transform: translate(var(--x), var(--y)); }
  80%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x), var(--y)); }
}

.bubble {
  position: absolute;
  bottom: 68%;
  left: 58%;
  padding: calc(var(--u) * 1.5) calc(var(--u) * 2) calc(var(--u) * 1.2);
  font: 700 calc(var(--u) * 4) / 1 var(--kitten-font, ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace);
  letter-spacing: .02em;
  white-space: nowrap;
  color: var(--kitten-bubble-fg, #111114);
  background: var(--kitten-bubble-bg, #fff);
  box-shadow:
    0 calc(var(--u) * -1) 0 0 var(--kitten-bubble-fg, #111114),
    0 var(--u) 0 0 var(--kitten-bubble-fg, #111114),
    calc(var(--u) * -1) 0 0 0 var(--kitten-bubble-fg, #111114),
    var(--u) 0 0 0 var(--kitten-bubble-fg, #111114);
  transform-origin: 0 100%;
  animation: g-bubble 1.4s ease-out forwards;
  pointer-events: none;
}
.bubble::after {
  content: '';
  position: absolute;
  left: calc(var(--u) * 1);
  bottom: calc(var(--u) * -2);
  width: var(--u);
  height: var(--u);
  background: var(--kitten-bubble-fg, #111114);
  box-shadow: var(--u) calc(var(--u) * -1) 0 0 var(--kitten-bubble-fg, #111114);
}
.bubble[data-side='left'] { left: auto; right: 58%; transform-origin: 100% 100%; }
.bubble[data-side='left']::after { left: auto; right: calc(var(--u) * 1); box-shadow: calc(var(--u) * -1) calc(var(--u) * -1) 0 0 var(--kitten-bubble-fg, #111114); }
@keyframes g-bubble {
  0%   { opacity: 0; transform: scale(.4); }
  12%  { opacity: 1; transform: scale(1.08); }
  20%  { transform: scale(1); }
  82%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(calc(var(--u) * -2)); }
}

@media (prefers-reduced-motion: reduce) {
  .p, .bubble { animation-duration: .01s; animation-delay: 0s; }
  .p { display: none; }
  .bubble { animation: none; }
}
`;

let shared: CSSStyleSheet | null | undefined;

/** Aplica o CSS a um shadow root, reaproveitando a mesma folha quando possível. */
export function adoptStyles(root: ShadowRoot): void {
  if (shared === undefined) {
    try {
      shared = new CSSStyleSheet();
      shared.replaceSync(CSS);
    } catch {
      shared = null;
    }
  }
  if (shared && 'adoptedStyleSheets' in root) {
    if (!root.adoptedStyleSheets.includes(shared)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, shared];
  } else if (!root.querySelector('style[data-kitten]')) {
    const style = document.createElement('style');
    style.setAttribute('data-kitten', '');
    style.textContent = CSS;
    root.prepend(style);
  }
}
