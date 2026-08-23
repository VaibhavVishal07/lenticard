export { createLenticularCard } from './core/card';
export { LenticularRenderer } from './core/renderer';
export { FallbackRenderer } from './core/fallback';
export { MotionController } from './core/motion';
export { CARD_ASPECT, meanAspect, resolveAxis, resolveOrientation } from './core/aspect';
export { CARD_CSS, injectStyles } from './core/styles';
export { DEFAULTS, MAX_FRAMES } from './core/types';
export type {
  Axis,
  AxisOption,
  ImageSource,
  LenticularCardInstance,
  LenticularOptions,
  Motion,
  Orientation,
  OrientationOption,
} from './core/types';
