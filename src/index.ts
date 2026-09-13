export { Kitten } from './kitten';
export type { KittenOptions, KittenEventDetail } from './kitten';
export { KittenElement, defineKitten } from './element';
export { DEFAULT_WEIGHTS } from './brain';
export type { ActionName, BehaviorName, BehaviorWeights } from './brain';
export { CLIPS } from './animations';
export type { ClipName } from './animations';
export { FRAMES, FX_FRAMES } from './sprites/frames';
export type { FrameDef } from './sprites/frames';
export { PALETTES } from './sprites/palette';
export type { Palette, PaletteKey, PaletteName } from './sprites/palette';
export type { Coat, FrameName } from './sprites/atlas';

import { defineKitten } from './element';

defineKitten();
