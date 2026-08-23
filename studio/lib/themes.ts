/**
 * Card themes.
 *
 * Modelled on how a real trading card is actually laid out: a name plate with a
 * stage line and a value at the top right, an illustration window, numbered
 * move rows with energy costs, a weakness / resistance / retreat strip, flavour
 * text, and a footer carrying the illustrator credit, set symbol, card number
 * and rarity. Choosing an occasion rewrites all of it, not just the palette.
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

export const THEMES: CardTheme[] = [
  {
    id: 'valentine',
    label: 'Valentine',
    stage: 'Stage 2 · evolves from Crush',
    statLabel: 'HP',
    statValue: '180',
    badge: 'DEVOTION',
    glyph: '♥',
    plate: ['#ffd9e4', '#c2185b'],
    board: '#2a0813',
    ink: '#ffe8ef',
    accent: '#ff6f9c',
    title: 'Yours, Obviously',
    moves: [
      { cost: 1, name: 'Shared Blanket', value: '40', text: 'Neither of you moves for two hours.' },
      { cost: 3, name: 'Airport Pickup', value: '120', text: 'Works even at four in the morning.' },
    ],
    strip: ['Distance ×2', 'Silence −30', '••'],
    flavour: 'Still the best decision I have made without thinking about it.',
    set: 'HEARTLAND',
    rarity: '★★★',
  },
  {
    id: 'birthday',
    label: 'Birthday',
    stage: 'Stage 30 · evolves from Twenty-nine',
    statLabel: 'HP',
    statValue: '210',
    badge: 'ANOTHER LAP',
    glyph: '✦',
    plate: ['#ffe9b8', '#c98a12'],
    board: '#241804',
    ink: '#fff2d6',
    accent: '#ffc247',
    title: 'Thirty, Somehow',
    moves: [
      { cost: 1, name: 'Blow Out Candles', value: '30', text: 'Discard one wish. Do not say it aloud.' },
      { cost: 4, name: 'Second Slice', value: '150', text: 'Nobody at the table objects.' },
    ],
    strip: ['Mondays ×2', 'Hangover −20', '•••'],
    flavour: 'Older, marginally wiser, still terrible at pretending to be surprised.',
    set: 'ANOTHER YEAR',
    rarity: '★★',
  },
  {
    id: 'friend',
    label: 'Friendship',
    stage: 'Basic · emergency contact',
    statLabel: 'HP',
    statValue: '160',
    badge: 'RELIABLE',
    glyph: '◈',
    plate: ['#c9f2e4', '#0f8f74'],
    board: '#04211b',
    ink: '#e6fff7',
    accent: '#4fe3b8',
    title: 'Picks Up At 3am',
    moves: [
      { cost: 1, name: 'No Questions', value: '50', text: 'Asks where, not why.' },
      { cost: 2, name: 'Spare Keys', value: '90', text: 'Has had them for years. Never mentioned it.' },
    ],
    strip: ['Distance ×1', 'Awkwardness −40', '•'],
    flavour: 'Has never once asked why. Just picked up the keys and drove.',
    set: 'LONG HAUL',
    rarity: '★★★',
  },
  {
    id: 'congrats',
    label: 'Congratulations',
    stage: 'Stage 1 · evolves from Long Shot',
    statLabel: 'HP',
    statValue: '200',
    badge: 'ACHIEVEMENT',
    glyph: '★',
    plate: ['#d9dcff', '#4a4ecf'],
    board: '#0d0f2b',
    ink: '#ecedff',
    accent: '#8a8dff',
    title: 'Called It',
    moves: [
      { cost: 2, name: 'Told You So', value: '70', text: 'May be used once, quietly.' },
      { cost: 3, name: 'Take The Room', value: '130', text: 'Everyone who doubted it applauds anyway.' },
    ],
    strip: ['Doubt ×2', 'Nerves −30', '••'],
    flavour: 'Everyone agreed it was a long shot. You went anyway, and here we are.',
    set: 'FIRST PRINT',
    rarity: '★★★★',
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
    swatch: ['#12131a', '#7d5cff'],
  },
  {
    id: 'rookie',
    label: 'Rookie',
    hint: 'Thick colour border, coated inner stock, name on a banner',
    swatch: ['#e8483c', '#2b6fd1'],
  },
  {
    id: 'chrome',
    label: 'Chrome',
    hint: 'Black board, cut-corner window, outline wordmark and a stat plaque',
    swatch: ['#0e1116', '#c6ff2e'],
  },
  {
    id: 'refractor',
    label: 'Refractor',
    hint: 'Foil stock that swings with the angle, octagon window, white plate',
    swatch: ['#ffd9ec', '#cfe3ff'],
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];
