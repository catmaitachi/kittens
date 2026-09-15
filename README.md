<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/hero-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/hero-light.gif" alt="The word kittens in torn paper cut-out letters, with two pixel-art cats walking on top" width="760">
</picture>

<br>

<img src="https://img.shields.io/badge/dependencies-0-e07b39?style=flat-square&labelColor=2b2321" alt="zero dependencies">
<img src="https://img.shields.io/badge/gzip-~18_kB-e07b39?style=flat-square&labelColor=2b2321" alt="about 18 kB gzipped">
<img src="https://img.shields.io/badge/TypeScript-types_included-e07b39?style=flat-square&labelColor=2b2321" alt="TypeScript types included">
<img src="https://img.shields.io/badge/license-MIT-e07b39?style=flat-square&labelColor=2b2321" alt="MIT license">

**[See the cats live](https://catmaitachi.github.io/kittens/)** · [Português](README.pt-BR.md) · [npm](https://www.npmjs.com/package/@catmaitachi/kittens) · [Report an issue](https://github.com/catmaitachi/kittens/issues)

</div>

<br>

<div align="center">

The cats walk, run, jump onto your cards, climb walls, play, sleep and groom themselves on their own.<br>
The [landing page](https://catmaitachi.github.io/kittens/) shows it all running. This README is the reference for using it.

</div>

## Install

```bash
npm i @catmaitachi/kittens
```

With the tag, the cat lives in the parent element:

```html
<section class="area">
  <article class="card">your usual elements</article>
  <kitten-pet coat="calico" summon></kitten-pet>
</section>

<script type="module">
  import '@catmaitachi/kittens'; // registers <kitten-pet>
</script>
```

Or with the class, pointing at the container:

```ts
import { Kitten } from '@catmaitachi/kittens';

const cat = new Kitten(document.querySelector('#area')!, { coat: 'orange', summon: true });
cat.addEventListener('statechange', (e) => console.log(e.detail.state));
```

The cat draws on its own layer over the container and never touches your layout.

<br>

<h2 align="center">01 · Five coats</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-light.gif" alt="A notebook page with coat swatches; picking one changes the cat's coat" width="760">
</picture>

<img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-walk.gif" alt="The five cats walking side by side: calico, orange, gray, black and siamese" width="520">

`calico` · `orange` · `gray` · `black` · `siamese`

</div>

Each coat has its own pattern (patches, stripes or dark points), not just a different color. You can switch it while the cat is already on the page:

```ts
cat.setCoat('siamese');
```

It also takes your own palette instead of a name. The `Palette` type and `PALETTES` show the shape.

<br>

<h2 align="center">02 · Double-click and they come</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/summon-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/summon-light.gif" alt="A cork board: each double-click drops a pin and the cats run to it" width="760">
</picture>

</div>

With `summon` on, a double-click inside the container calls the cats to that point. They jump and climb whatever is in the way. From code it works the same, in px inside the container:

```ts
cat.summonTo(320, 120);
cat.addEventListener('summon', (e) => console.log(e.detail.x, e.detail.y));
```

<br>

<h2 align="center">03 · Parkour across the page</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/parkour-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/parkour-light.gif" alt="A scrapbook page with polaroids at different heights; the cats hop from one to another" width="760">
</picture>

</div>

The cats read your actual layout. They stand on top of elements, climb their sides and often leap somewhere else halfway up. Jumps get bigger in bigger containers. You decide where they can go:

| I want…                                | Do this                                             |
| -------------------------------------- | --------------------------------------------------- |
| Only some elements as ground           | `platforms: '.card, img'` or `data-kitten-platform` |
| The cat to ignore a section            | `data-kitten-ignore` on the element                 |
| An element to become a toy             | `data-kitten-toy`                                   |
| An element that doesn't wobble on hits | `data-kitten-static`                                |
| More climbing and no naps              | `behaviors: { climb: 5, nap: 0 }`                   |

<br>

<h2 align="center">04 · A box full of cats</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/crowd-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/crowd-light.gif" alt="A cardboard box with five cats of different coats playing together" width="760">
</picture>

</div>

Cats in the same container notice each other. They say hi, bat at each other, play tag and lie down side by side. There's nothing to configure, just create more than one:

```ts
for (const coat of ['calico', 'orange', 'gray', 'black', 'siamese']) {
  const cat = new Kitten(box, { coat });
  cat.addEventListener('social', (e) => console.log(e.detail.kind));
}
```

<br>

<h2 align="center">Poses</h2>

<div align="center">

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-tailFlick.gif" width="96" alt=""><br><sub>sitting</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-walk.gif" width="96" alt=""><br><sub>walking</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-run.gif" width="96" alt=""><br><sub>running</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-wallClimb.gif" width="96" alt=""><br><sub>climbing</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-groom.gif" width="96" alt=""><br><sub>grooming</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-yawn.gif" width="96" alt=""><br><sub>yawning</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-stretch.gif" width="96" alt=""><br><sub>stretching</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-bat.gif" width="96" alt=""><br><sub>batting</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-loafWag.gif" width="96" alt=""><br><sub>loafing</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-sleep.gif" width="96" alt=""><br><sub>sleeping</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-dangle.gif" width="96" alt=""><br><sub>held</sub></td>
    <td align="center"><sub>click to meow,<br>hover to pet,<br>drag to pick up</sub></td>
  </tr>
</table>

</div>

The art is a text grid in [`src/sprites/frames.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/frames.ts): 28 frames drawn plain, with no patches at all. The coat comes from each breed's mask in [`src/sprites/palette.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/palette.ts), which paints pixel by pixel when the spritesheet is built. The ready-made spritesheets live in [`assets/`](https://github.com/catmaitachi/kittens/tree/main/assets).

<br>

<h2 align="center">Reference</h2>

### Options

On the tag, each option is an attribute with the same name (`<kitten-pet coat="black" scale="2" summon>`). The tag also takes `container="selector"` to live in an ancestor instead of the parent.

| Option        | Default    | What it does                                                         |
| ------------- | ---------- | -------------------------------------------------------------------- |
| `coat`        | `'calico'` | `calico`, `orange`, `gray`, `black`, `siamese` or your own palette   |
| `scale`       | `3`        | Size of each art pixel, in px. Whole numbers keep the art crisp      |
| `speed`       | `1`        | Walking and running speed multiplier                                 |
| `platforms`   | `'auto'`   | Where it can stand: `'auto'` or a CSS selector                       |
| `interactive` | `true`     | Click, petting and dragging                                          |
| `summon`      | `false`    | A double-click in the container calls the cat to that point          |
| `nudge`       | `true`     | Elements wobble a little when the cat bats them                      |
| `behaviors`   | —          | Weight of each behavior; `0` turns it off (e.g. `{ nap: 2, climb: 0 }`) |
| `phrases`     | `meow!`, … | Speech bubble lines                                                  |
| `name`        | `'Kitten'` | The cat's name, included in events                                   |
| `seed`        | random     | The same seed repeats the same choices, handy for tests              |
| `x`           | random     | Starting position on the floor, in px                                |

Behaviors accepted by `behaviors`: `idle`, `loaf`, `wander`, `explore`, `climb`, `groom`, `nap`, `play`, `stretch`, `social`.

### Methods and properties

| Call                 | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `do(action)`         | Asks for an action right now                          |
| `meow('hi!')`        | Meows with a speech bubble                            |
| `summonTo(x, y)`     | Calls the cat to a point in the container             |
| `setCoat('black')`   | Changes the coat without recreating the cat           |
| `pause()`/`resume()` | Freezes and resumes the animation                     |
| `destroy()`          | Removes the cat and cleans everything up              |
| `state`, `energy`    | What it's doing now and how energetic it is (0 to 1)  |
| `position`           | `{ x, y }` inside the container                       |

Actions for `do(...)`: `sit`, `walk`, `jump`, `climb`, `play`, `bat`, `groom`, `stretch`, `loaf`, `sleep`, `meow`, `explore`, `wander`, `social`.

### Events

The instance is an `EventTarget`. The layer also fires the same events with a `kitten:` prefix, and they bubble, so you can listen on the container. All of them carry `cat` in `detail`.

| Event                                     | `detail`                                           |
| ----------------------------------------- | -------------------------------------------------- |
| `statechange`                             | `{ state, previous }`                              |
| `meow`                                    | `{ text }`                                         |
| `land`                                    | `{ element, height }`, with `element` `null` on the floor |
| `nudge`                                   | `{ element }` that got batted                      |
| `summon`                                  | `{ x, y }` of the call                             |
| `social`                                  | `{ kind, other }`, what it did with another cat    |
| `click`, `pet`, `grab`, `drop`, `destroy` | only `cat`                                         |

With `prefers-reduced-motion`, the cats are calmer and skip particles. Animation stops while the tab is hidden.

### Development

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Landing page in development (`site/` folder)         |
| `npm run build`      | Library in `dist/` (ESM + UMD + types)               |
| `npm run build:site` | Static landing page in `dist-site/`                  |
| `npm run typecheck`  | Strict TypeScript, no output                         |
| `npm run sprites`    | Validates the pixel art and re-exports `assets/` PNGs |

<br>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-light.gif" alt="A siamese cat sitting on the edge of the footer" width="760">
</picture>

Made by [Lucas Spiazzi](https://github.com/catmaitachi) · Inspired by [VS Code Pets](https://github.com/tonybaloney/vscode-pets) · MIT license

</div>
