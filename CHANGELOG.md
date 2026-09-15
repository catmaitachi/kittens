# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.0
[0.1.0]: https://www.npmjs.com/package/@catmaitachi/kittens/v/0.1.0
