import { DEFAULTS } from '../../src/core/types';
import type { LenticularOptions } from '../../src/core/types';

export type CardSettings = Pick<
  Required<LenticularOptions>,
  | 'orientation'
  | 'axis'
  | 'lenticules'
  | 'parallax'
  | 'interlace'
  | 'blend'
  | 'sheen'
  | 'lens'
  | 'tilt'
  | 'float'
  | 'radius'
  | 'motion'
  | 'idleSweep'
  | 'fit'
>;

export const INITIAL: CardSettings = {
  orientation: DEFAULTS.orientation,
  axis: DEFAULTS.axis,
  lenticules: DEFAULTS.lenticules,
  parallax: DEFAULTS.parallax,
  interlace: DEFAULTS.interlace,
  blend: DEFAULTS.blend,
  sheen: DEFAULTS.sheen,
  lens: DEFAULTS.lens,
  tilt: DEFAULTS.tilt,
  float: DEFAULTS.float,
  radius: DEFAULTS.radius,
  motion: DEFAULTS.motion,
  idleSweep: DEFAULTS.idleSweep,
  fit: DEFAULTS.fit,
};

export interface Preset {
  id: string;
  label: string;
  hint: string;
  values: Partial<CardSettings>;
}

export const PRESETS: Preset[] = [
  {
    id: 'classic',
    label: 'Classic flip',
    hint: 'Coarse ridges, hard cut between frames',
    values: { lenticules: 64, interlace: 0.3, blend: 0.12, sheen: 0.4, lens: 0.6, parallax: 1.15 },
  },
  {
    id: 'depth',
    label: 'Depth',
    hint: 'Fine ridges, frames dissolve into each other',
    values: { lenticules: 150, interlace: 0.14, blend: 0.7, sheen: 0.2, lens: 0.3, parallax: 0.85 },
  },
  {
    id: 'holo',
    label: 'Holo foil',
    hint: 'Heavy sheen, strong refraction',
    values: { lenticules: 190, interlace: 0.42, blend: 0.4, sheen: 0.85, lens: 0.9, parallax: 1.3 },
  },
  {
    id: 'trading',
    label: 'Trading card',
    hint: 'Portrait, restrained motion, printed feel',
    values: {
      orientation: 'portrait',
      lenticules: 110,
      interlace: 0.2,
      blend: 0.3,
      sheen: 0.45,
      lens: 0.5,
      tilt: 11,
      radius: 16,
    },
  },
  {
    id: 'flat',
    label: 'Print',
    hint: 'No sheen, no float — just the interlace',
    values: { sheen: 0, lens: 0.35, float: 0, tilt: 9, interlace: 0.18, blend: 0.5 },
  },
];

/** Only the values that differ from the library defaults are worth emitting. */
export function diffFromDefaults(settings: CardSettings): Partial<CardSettings> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value !== (DEFAULTS as Record<string, unknown>)[key]) out[key] = value;
  }
  return out as Partial<CardSettings>;
}
