# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- A hard shake now takes 50 patience instead of 35, so two in a row make the cat grumpy.

## [2.0.0] - 2026-09-25

This release changes how a coat is described. In 1.x a coat was a handful of flat colors plus a
pattern rule that only the built-in coats could use. In 2.0 a coat is a grid of pixels, like a
Minecraft skin: every fur pixel of every pose reads its color from one cell of that grid, so you
can paint your own cat and hand it to the library as plain data. The landing page now opens with
a customizer that does exactly that. Cats also got a patience bar, and a cat shaken too hard
stays grumpy for a while.

### Added

- Coats are a 35×27 grid of characters (`skin`) plus a `colors` map from each character to a
  `#rrggbb` color. The head and the tail have one area each and look the same in every pose.
  The body, paws included, has its own area for each kind of pose (sitting, standing and
  walking, curled up, stretching, held), mapped pixel for pixel, so painting the sitting cat
  leaves the walking one alone. A cell holds the exact color you see, shadows included.
- The outline, the soft outline, the nose and each eye (`eyes.left`, `eyes.right`) are separate
  colors on the coat, so a cat can have one blue eye and one green.
- `KittenCoat` is the interface for a coat. `COATS` holds the five built-in ones,
  `registerCoat()` makes yours available by name (`coat="my-cat"`), and `resolveCoat()` fills in
  whatever a partial coat leaves out, using `calico`.
- For editors and custom renderers: `skinCellAt(frame, x, y)` says which grid cell a pixel of a
  pose uses, `eyeAt(frame, x, y)` says whether a pixel is the left or the right eye,
  `renderFrame(coat, frame)` paints a single pose, and `coatToCode(coat)` returns a
  `registerCoat({...})` call ready to paste. `SKIN_W` and `SKIN_H` give the grid size.
- Patience, a bar from 0 to 100. Holding a cat costs nothing. Each hard shake (a sharp change of
  direction at speed) takes 35, and the next shake only counts a second later, so it takes some
  insistence. At zero the cat wriggles free and gets grumpy: a patience bar shows up over its
  head, it huffs every so often, won't be picked up and runs from the cursor. The bar refills in
  about 12 seconds; once it's full the cat calms down and the bar goes away. Read it with the
  `patience` and `angry` getters, or listen for the `angry` and `calm` events (`kitten:angry` and
  `kitten:calm` on the layer).
- `npm run check` makes sure every fur pixel of every frame lands on a valid cell and that each
  built-in coat has a color there.

### Changed

- `coat` takes a coat name or a `KittenCoat` object (a partial one is fine).
- The orange, siamese and gray coats were redrawn on the grid. Orange has even stripes with a
  white chest and white socks, the siamese has a cream forehead and a dark mask centered on the
  muzzle, and gray is one tone with soft stripes. Calico and black look the same as before.
- The landing page opens with the coat customizer. Pick a coat and a pose, click the pencil to
  paint any pixel (with an eyedropper, recent colors and undo), then copy the coat code or a
  prompt that asks your AI agent to adopt that exact cat. The other demos were rearranged: cats
  exploring a living room, cats you call with a double click on a notebook page, and a box full
  of cats.

### Removed

- `PALETTES`, `Palette`, `PaletteKey` and `PaletteName`. See "Migrating from 1.x" below.

### Migrating from 1.x

A 1.x coat was a `Palette`: flat colors for eight regions (`k` outline, `s` soft outline, `w`
fur, `g` fur shadow, `d` dark patch, `o` light patch, `a` eye, `p` nose), plus an optional
pattern function baked into `PALETTES`/`PATTERNS` that only the built-in coats could use. A
2.0 coat is a `KittenCoat`: the pattern lives directly in the `skin` grid, so there's no
separate pattern function, and the outline, soft outline, nose and each eye are colors on the
coat object itself rather than palette entries.

If you passed a coat name (`coat: 'siamese'`, `coat="black"`), nothing changes.

If you passed a custom palette object, rebuild it as a `KittenCoat`. There's no automatic
converter, since a flat palette has no patches or stripes to place on the grid. The fastest
path is to start from a built-in coat and edit its `skin` and `colors`:

```ts
// 1.x
const cat = new Kitten(el, { coat: { w: '#e8e8ea', a: '#d8b25a', p: '#e59aa8' } });

// 2.0
import { COATS } from '@catmaitachi/kittens';
const cat = new Kitten(el, {
  coat: { ...COATS.calico, name: 'my-coat', colors: { ...COATS.calico.colors, a: '#e8e8ea' } },
});
```

To paint a coat from scratch instead of adapting one, use the
[customizer on the landing page](https://luuspz.dev/kittens/) and copy the `registerCoat({...})`
call it generates.

## [1.0.2] - 2026-09-15

### Fixed

- In `auto` mode, elements whose color has a zero blue channel (red, orange, yellow...) were
  treated as transparent and never became platforms. Only colors with zero alpha count now.
- On pages with more than 600 elements, anything after the first 600 in document order was
  ignored, even when it was on screen. The limit now counts accepted platforms instead.

### Changed

- Scrolling the page no longer forces every container's layout to be read again; only
  scrolling inside the container does (full-page cats still follow the page scroll).
- Cat layers are marked with `data-kitten-layer` and skipped with a single `closest()`, instead
  of checking every layer for every element.
- Removed dead code (`World.supportAt`) and duplicate behavior tables in the brain.
- CI actions updated to their current major versions (no more Node 20 deprecation warnings).

## [1.0.1] - 2026-09-15

### Added

- `docs/agent-prompt.md`: a ready-to-paste prompt that explains the library, its API and how
  to add it to a project, for AI coding agents. The landing page has a button next to the
  install command that copies it, and both READMEs link to it.
- The package is also published to GitHub Packages, so it shows up on the repository page.

### Changed

- The release workflow can be run by hand for an existing tag, and re-running it no longer
  fails when the GitHub release or the npm version already exists.

## [1.0.0] - 2026-09-15

First stable release. From here on, breaking changes only land in a new major version.

### Added

- `<kitten-pet>` Web Component and `Kitten` class, with no dependencies (~18 kB gzipped).
- Five coats with their own patterns: `calico`, `orange`, `gray`, `black` and `siamese`,
  plus support for custom palettes and `setCoat()` at runtime.
- Cats read the page layout: they stand on elements, climb walls (including the container's
  inner walls) and often leap to another surface halfway up. Jumps scale with the container.
- `summon` option and `summonTo(x, y)`: a double-click calls the cats to a point.
- Cats in the same container interact with each other (`social` event).
- `data-kitten-platform`, `data-kitten-ignore`, `data-kitten-toy` and `data-kitten-static`
  attributes to control how the cats see your elements.
- Landing page at https://catmaitachi.github.io/kittens/, in English and Portuguese.
- `CITATION.cff`.

### Changed

- Published as `@catmaitachi/kittens`, since `kittens` is taken on npm.
- Coat names and default speech bubble phrases are in English.
- The package no longer ships sourcemaps.

## [0.1.0] - 2026-09-15

- First version published to npm.

[2.0.0]: https://github.com/catmaitachi/kittens/releases/tag/v2.0.0
[1.0.2]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.2
[1.0.1]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.1
[1.0.0]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.0
[0.1.0]: https://www.npmjs.com/package/@catmaitachi/kittens/v/0.1.0
