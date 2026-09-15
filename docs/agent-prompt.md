You are helping me add kittens to a web project. Read this before writing code.

## What it is

`@catmaitachi/kittens` (npm) draws pixel-art cats inside any HTML element. The cats read the real layout and behave on their own: they walk, run, jump onto elements, climb walls, play, groom and sleep. No dependencies, about 18 kB gzipped, TypeScript types included. Docs: https://github.com/catmaitachi/kittens · Live demo: https://luuspz.dev/kittens/

## Install

```bash
npm i @catmaitachi/kittens
```

## Two ways to use it

Web Component. The cat lives in the tag's parent element (or in `container="css selector"`, an ancestor). Importing the package once registers `<kitten-pet>`:

```html
<section class="area">
  <article class="card">existing content</article>
  <kitten-pet coat="calico" summon></kitten-pet>
</section>
<script type="module">import '@catmaitachi/kittens';</script>
```

Class, pointing at a container element:

```ts
import { Kitten } from '@catmaitachi/kittens';
const cat = new Kitten(document.querySelector('#area')!, { coat: 'orange', summon: true });
// later: cat.destroy();
```

The cat draws on its own layer over the container and does not change the layout. If the container is `position: static`, the library sets it to `relative`. Only run it in the browser: in SSR frameworks (Next.js, Nuxt, SvelteKit, Astro) create cats in a client-only effect (`useEffect`, `onMounted`, `onMount`) and call `destroy()` on unmount. Importing on the server is safe.

## Options (tag attributes use the same names)

- `coat`: `'calico'` (default), `'orange'`, `'gray'`, `'black'`, `'siamese'`, or a custom palette object
- `scale`: size of each art pixel in px, default `3` (whole numbers keep it crisp)
- `speed`: walk/run multiplier, default `1`
- `platforms`: `'auto'` (default, visible boxes) or a CSS selector limiting where cats can stand
- `interactive`: click to meow, hover to pet, drag to pick up; default `true`
- `summon`: double-click inside the container calls the cats there; default `false`
- `nudge`: elements wobble when batted; default `true`
- `behaviors`: weights, `0` disables one. Keys: `idle`, `loaf`, `wander`, `explore`, `climb`, `groom`, `nap`, `play`, `stretch`, `social`. Example: `{ climb: 5, nap: 0 }`
- `phrases`: speech bubble lines (on the tag: `phrases="meow!|prrr"`)
- `name`, `seed` (same seed repeats choices), `x` (starting x in px)

## Methods and properties

`do(action)` with `sit`, `walk`, `jump`, `climb`, `play`, `bat`, `groom`, `stretch`, `loaf`, `sleep`, `meow`, `explore`, `wander`, `social` · `meow(text?)` · `summonTo(x, y)` (px inside the container) · `setCoat(coat)` · `pause()` / `resume()` · `destroy()` · `state`, `energy` (0 to 1), `position` (`{ x, y }`). On the tag, the instance is `element.kitten`.

## Events

The instance is an `EventTarget`: `statechange` `{ state, previous }`, `meow` `{ text }`, `land` `{ element, height }`, `nudge` `{ element }`, `summon` `{ x, y }`, `social` `{ kind, other }`, plus `click`, `pet`, `grab`, `drop`, `destroy`. Every `detail` includes `cat`. The same events bubble from the layer with a `kitten:` prefix (for example `kitten:land`), so you can listen on the container.

## Controlling how cats see the page

- `data-kitten-platform`: always a surface the cat can stand on
- `data-kitten-ignore`: the cat ignores this element and its children
- `data-kitten-toy`: treat the element as a toy
- `data-kitten-static`: the element never wobbles when batted

Several cats in the same container notice each other and interact. The library respects `prefers-reduced-motion` and stops animating while the tab is hidden.

## How to apply

1. Ask me which element should host the cats if it isn't obvious, and how many cats and which coats I want.
2. Install the package and add the smallest working code for my stack.
3. Tell me which options or data attributes are worth tuning for my layout.
