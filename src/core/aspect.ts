import type { Axis, AxisOption, Orientation, OrientationOption } from './types';

/**
 * Card formats. A lenticular print is a physical object, so the card snaps to a
 * real card proportion rather than inheriting whatever the upload happened to be.
 */
export const CARD_ASPECT: Record<Orientation, number> = {
  landscape: 3 / 2,
  portrait: 5 / 7,  // the proportions of a playing card
  square: 1,
  circle: 1,
};

export function meanAspect(sizes: Array<{ width: number; height: number }>): number {
  const usable = sizes.filter((s) => s.width > 0 && s.height > 0);
  if (!usable.length) return 1;
  // Averaged in log space: 2:1 and 1:2 should cancel to square, not to 1.25:1.
  const sum = usable.reduce((acc, s) => acc + Math.log(s.width / s.height), 0);
  return Math.exp(sum / usable.length);
}

/**
 * Picks the card shape from the frames themselves. The dead band around 1
 * stops a 1.02:1 photo from producing a card that looks square but isn't.
 * `circle` is never inferred — a round crop is a decision, not a measurement.
 */
export function resolveOrientation(
  option: OrientationOption,
  aspect: number,
): Orientation {
  if (option !== 'auto') return option;
  if (aspect >= 1.15) return 'landscape';
  if (aspect <= 0.87) return 'portrait';
  return 'square';
}

/**
 * Vertical ridges, whatever the shape. A printed lenticular card is held in a
 * hand and turned side to side, so the lenticules run down it and the picture
 * changes left to right. Deriving the axis from the card's proportions read as
 * clever and produced portrait cards that only flipped when you nodded at them.
 * Pass 'horizontal' explicitly if you want that.
 */
export function resolveAxis(option: AxisOption, _orientation: Orientation): Axis {
  return option === 'auto' ? 'vertical' : option;
}
