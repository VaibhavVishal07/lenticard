import { DEFAULTS } from '../../src/core/types';
import type { LenticularOptions } from '../../src/core/types';

export type CardSettings = Pick<
  Required<LenticularOptions>,
  'orientation' | 'lenticules' | 'parallax' | 'blend' | 'sheen' | 'motion'
>;

/**
 * Tuned for an obvious flip rather than a tasteful one. A near-zero blend makes
 * the frames cut rather than dissolve, which is what a real lenticular card
 * does and what makes the effect legible on a first glance.
 */
export const INITIAL: CardSettings = {
  orientation: 'auto',
  lenticules: 84,
  parallax: 1.45,
  blend: 0.08,
  sheen: 0.5,
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
  interlace: 0.2,
  lens: 0.55,
  tilt: 15,
  float: 9,
  radius: 20,
  idleSweep: 2200,
  fit: 'cover',
} as const;
