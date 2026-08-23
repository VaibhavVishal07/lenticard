import { DEFAULTS } from '../../src/core/types';
import type { LenticularOptions } from '../../src/core/types';

export type CardSettings = Pick<
  Required<LenticularOptions>,
  'orientation' | 'lenticules' | 'parallax' | 'blend' | 'sheen' | 'motion'
>;

/**
 * Tuned so the card looks lenticular while it is standing still, not only while
 * it moves. The high interlace is what does that: each ridge reveals nearly
 * half the frame stack, so neighbouring frames are always woven into the
 * picture the way they are on a printed sheet. Coarse ridges keep the weave
 * visible at arm's length, and a low blend keeps each strip a clean cut.
 *
 * Ridges stay high. A coarse interlace reads as a printing fault rather than a
 * lens, so this is not something worth letting anyone dial down.
 */
export const INITIAL: CardSettings = {
  orientation: 'auto',
  lenticules: 160,
  parallax: 1.15,
  blend: 0.14,
  sheen: 0.62,
  motion: 'pointer',
};

/** Only what differs from the library defaults is worth sending. */
export function diffFromDefaults(settings: CardSettings): Partial<CardSettings> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value !== (DEFAULTS as Record<string, unknown>)[key]) out[key] = value;
  }
  return out as Partial<CardSettings>;
}

/** The lens settings the card is always built with, whatever the user picks. */
export const FIXED = {
  interlace: 0.46,
  lens: 0.72,
  tilt: 15,
  float: 9,
  radius: 20,
  idleSweep: 2200,
  fit: 'cover',
} as const;
