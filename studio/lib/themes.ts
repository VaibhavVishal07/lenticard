/**
 * Card themes.
 *
 * Modelled on how a real trading card is actually laid out: a name plate with a
 * stage line and a value at the top right, an illustration window, numbered
 * move rows with energy costs, a weakness / resistance / retreat strip, flavour
 * text, and a footer carrying the illustrator credit, set symbol, card number
 * and rarity. The template chooses the palette; the words are typed.
 *
 * None of this is drawn into the image. The art is lenticular; the printing is
 * DOM on top of it, because text pushed through a lens array is text nobody can
 * read.
 */

export interface Move {
  /** Energy pips shown to the left of the move name. */
  cost: number;
  name: string;
  value: string;
  text: string;
}

export interface CardTheme {
  id: string;
  label: string;
  /** Printed beside the name, the way a stage line is. */
  stage: string;
  /** The number at the top right, and what it is called. */
  statLabel: string;
  statValue: string;
  badge: string;
  glyph: string;
  plate: [string, string];
  board: string;
  ink: string;
  accent: string;
  title: string;
  moves: [Move, Move];
  strip: [string, string, string];
  flavour: string;
  set: string;
  rarity: string;
}

/**
 * One palette per template, keyed to the template's own id.
 *
 * These used to be occasions — Valentine, Birthday — which set both the colours
 * and the words. That made picking an occasion overwrite anything you had
 * typed, and it was doing the job the Words step already does properly. The
 * palette belongs to the template, because a chrome card and a rookie card are
 * not the same object in two colours. The words belong to you.
 */
export const THEMES: CardTheme[] = [
  {
    id: 'fullart',
    label: 'Full bleed',
    stage: 'One of one',
    statLabel: 'NO',
    statValue: '01',
    badge: 'FULL ART',
    glyph: '\u2726',
    plate: ['#e7e2ff', '#2b1a63'],
    board: '#05060a',
    ink: '#f2eeff',
    accent: '#a855ff',
    title: 'Your Card',
    moves: [
      { cost: 1, name: 'First Look', value: '40', text: 'Before anyone has tilted it.' },
      { cost: 3, name: 'Full Turn', value: '120', text: 'All three frames, one movement.' },
    ],
    strip: ['Glare x2', 'Still -30', '\u2022\u2022'],
    flavour: 'Three photographs that only make sense when it moves.',
    set: 'FULL BLEED',
    rarity: '\u2605\u2605\u2605',
  },
  {
    id: 'rookie',
    label: 'Rookie',
    stage: 'Rookie card',
    statLabel: 'HP',
    statValue: '180',
    badge: 'ROOKIE',
    glyph: '\u2605',
    plate: ['#f2f4ff', '#ff2d78'],
    board: '#140b3d',
    ink: '#fdf2ff',
    accent: '#00e5ff',
    title: 'Your Card',
    moves: [
      { cost: 1, name: 'First Look', value: '40', text: 'Before anyone has tilted it.' },
      { cost: 3, name: 'Full Turn', value: '120', text: 'All three frames, one movement.' },
    ],
    strip: ['Glare x2', 'Still -30', '\u2022\u2022'],
    flavour: 'Three photographs that only make sense when it moves.',
    set: 'ROOKIE',
    rarity: '\u2605\u2605',
  },
  {
    id: 'chrome',
    label: 'Chrome',
    stage: 'Refractor parallel',
    statLabel: 'PWR',
    statValue: '200',
    badge: 'CHROME',
    glyph: '\u25c8',
    plate: ['#dfe6ee', '#0b0f14'],
    board: '#07090d',
    ink: '#eaf7ff',
    accent: '#c8ff1f',
    title: 'Your Card',
    moves: [
      { cost: 1, name: 'First Look', value: '40', text: 'Before anyone has tilted it.' },
      { cost: 3, name: 'Full Turn', value: '120', text: 'All three frames, one movement.' },
    ],
    strip: ['Glare x2', 'Still -30', '\u2022\u2022'],
    flavour: 'Three photographs that only make sense when it moves.',
    set: 'CHROME',
    rarity: '\u2605\u2605\u2605\u2605',
  },
  {
    id: 'refractor',
    label: 'Refractor',
    stage: 'Foil parallel',
    statLabel: 'NO',
    statValue: '24',
    badge: 'REFRACTOR',
    glyph: '\u2756',
    plate: ['#ffe0f5', '#ff4fd8'],
    board: '#0b0c0f',
    ink: '#0b0c0f',
    accent: '#ff4fd8',
    title: 'Your Card',
    moves: [
      { cost: 1, name: 'First Look', value: '40', text: 'Before anyone has tilted it.' },
      { cost: 3, name: 'Full Turn', value: '120', text: 'All three frames, one movement.' },
    ],
    strip: ['Glare x2', 'Still -30', '\u2022\u2022'],
    flavour: 'Three photographs that only make sense when it moves.',
    set: 'REFRACTOR',
    rarity: '\u2605\u2605\u2605',
  },
];

export const DEFAULT_THEME = THEMES[0];

export function findTheme(id: string | undefined): CardTheme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

/** Everything the maker lets you rewrite. */
export interface CardCopy {
  title: string;
  stage: string;
  statLabel: string;
  statValue: string;
  moves: [Move, Move];
  strip: [string, string, string];
  flavour: string;
}

export function copyFor(theme: CardTheme): CardCopy {
  return {
    title: theme.title,
    stage: theme.stage,
    statLabel: theme.statLabel,
    statValue: theme.statValue,
    moves: [{ ...theme.moves[0] }, { ...theme.moves[1] }],
    strip: [...theme.strip] as [string, string, string],
    flavour: theme.flavour,
  };
}

// ---------------------------------------------------------------- templates

export type CardLayout = 'fullart' | 'rookie' | 'chrome' | 'refractor';

export interface Template {
  id: CardLayout;
  label: string;
  hint: string;
  /** Two colours for the picker's miniature, so the strip reads at a glance. */
  swatch: [string, string];
}

/**
 * Four templates, each taken from a real card rather than invented.
 *
 * They differ in the ways cards actually differ: what the stock is (foil,
 * coated board, black acrylic-look chrome), whether there is a border and how
 * thick, how the window is cut, and where the name is struck. A recolour would
 * not be a template — these are four objects.
 */
export const TEMPLATES: Template[] = [
  {
    id: 'fullart',
    label: 'Full bleed',
    hint: 'Picture to all four edges, foil trim line, name struck over the foot',
    swatch: ['#12131a', '#a855ff'],
  },
  {
    id: 'rookie',
    label: 'Rookie',
    hint: 'Thick colour border, coated inner stock, name on a banner',
    swatch: ['#ff2d78', '#00e5ff'],
  },
  {
    id: 'chrome',
    label: 'Chrome',
    hint: 'Black board, cut-corner window, outline wordmark and a stat plaque',
    swatch: ['#0b0f14', '#c8ff1f'],
  },
  {
    id: 'refractor',
    label: 'Refractor',
    hint: 'Foil stock that swings with the angle, octagon window, white plate',
    swatch: ['#ff4fd8', '#7ce8ff'],
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];
