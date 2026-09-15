# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

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

[1.0.2]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.2
[1.0.1]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.1
[1.0.0]: https://github.com/catmaitachi/kittens/releases/tag/v1.0.0
[0.1.0]: https://www.npmjs.com/package/@catmaitachi/kittens/v/0.1.0
