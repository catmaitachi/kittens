export { Kitten } from './kitten';
export type { KittenOptions, KittenEventDetail } from './kitten';
export { KittenElement, defineKitten } from './element';
export { DEFAULT_WEIGHTS } from './brain';
export type { ActionName, BehaviorName, BehaviorWeights } from './brain';
export { CLIPS } from './animations';
export type { ClipName } from './animations';
export { FRAMES, FX_FRAMES } from './sprites/frames';
export type { FrameDef } from './sprites/frames';
export { COATS, registerCoat, resolveCoat } from './sprites/coats';
export type { KittenCoat, CoatName } from './sprites/coats';
export { SKIN_W, SKIN_H, skinCellAt, eyeAt, renderFrame, coatToCode } from './sprites/skin';
export type { Coat, FrameName } from './sprites/atlas';

import { defineKitten } from './element';

defineKitten();
