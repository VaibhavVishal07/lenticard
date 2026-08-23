/**
 * The loading screen. Rather than a spinner, it is the product doing its own
 * trick: three panels of copy interlaced into one lenticular card, sweeping on
 * its own. By the time it settles you have read the pitch and watched the
 * effect that makes it.
 */

const WIDTH = 1440;
const HEIGHT = 900;

export interface IntroPanel {
  index: string;
  headline: string;
  kicker: string;
}

export const INTRO_PANELS: IntroPanel[] = [
  { index: '01', headline: 'THREE\nPICTURES', kicker: 'Any size. Any shape. Drag them in.' },
  { index: '02', headline: 'ONE\nCARD', kicker: 'It flips as you tilt it. Like the real thing.' },
  { index: '03', headline: 'ANY\nWEBSITE', kicker: 'React, a web component, or one file.' },
];

/** Playful, on-theme steps that cycle under the card while it loads. */
export const LOADING_STEPS = [
  'mixing the ink',
  'cutting the lenses',
  'interlacing the frames',
  'laminating the sheet',
  'buffing the gloss',
];

interface Skin {
  bg: [string, string];
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
}

const LIGHT: Skin = {
  bg: ['#f4f6f2', '#e2e6dc'],
  ink: '#0f120c',
  muted: 'rgba(15, 18, 12, 0.55)',
  accent: '#5f8f0a',
  accentInk: '#f7ffea',
};

const DARK: Skin = {
  bg: ['#12140f', '#050607'],
  ink: '#f2f6ee',
  muted: 'rgba(242, 246, 238, 0.58)',
  accent: '#c3f53c',
  accentInk: '#0b1004',
};

const sans = (weight: number, size: number) =>
  `${weight} ${size}px Satoshi, ui-sans-serif, system-ui, -apple-system, sans-serif`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(panel: IntroPanel, index: number, dark: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const skin = dark ? DARK : LIGHT;

  const bg = ctx.createLinearGradient(0, 0, WIDTH * 0.5, HEIGHT);
  bg.addColorStop(0, skin.bg[0]);
  bg.addColorStop(1, skin.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A big accent slab that slides across the three panels, so the flip is
  // obvious from the far side of the room before you read a word.
  ctx.save();
  ctx.translate(WIDTH * (-0.15 + index * 0.42), 0);
  ctx.rotate(-0.13);
  ctx.fillStyle = skin.accent;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(WIDTH * 0.52, -HEIGHT, WIDTH * 0.55, HEIGHT * 3);
  ctx.restore();

  // Ridge texture over the slab: the card is showing you its own lenticules.
  ctx.save();
  ctx.globalAlpha = dark ? 0.1 : 0.14;
  ctx.fillStyle = dark ? '#000' : '#fff';
  for (let x = 0; x < WIDTH; x += 8) ctx.fillRect(x, 0, 3, HEIGHT);
  ctx.restore();

  const pad = 96;
  ctx.textBaseline = 'top';

  // Index chip.
  ctx.fillStyle = skin.ink;
  roundRect(ctx, pad, pad, 78, 40, 20);
  ctx.fill();
  ctx.fillStyle = dark ? '#0b1004' : '#f7ffea';
  ctx.font = sans(700, 20);
  ctx.textAlign = 'center';
  ctx.fillText(panel.index, pad + 39, pad + 10);
  ctx.textAlign = 'left';

  // Headline: heavy, tight, and big enough to carry through the interlace.
  ctx.font = sans(900, 148);
  ctx.fillStyle = skin.ink;
  ctx.letterSpacing = '-0.045em';
  panel.headline.split('\n').forEach((line, i) => {
    ctx.fillText(line, pad - 6, pad + 82 + i * 142);
  });
  ctx.letterSpacing = '0px';

  // Kicker.
  ctx.font = sans(500, 30);
  ctx.fillStyle = skin.muted;
  ctx.fillText(panel.kicker, pad, pad + 82 + 142 * 2 + 34);

  // Progress ticks.
  INTRO_PANELS.forEach((_, i) => {
    ctx.fillStyle = i === index ? skin.ink : skin.muted;
    ctx.globalAlpha = i === index ? 1 : 0.28;
    roundRect(ctx, pad + i * 46, HEIGHT - pad, i === index ? 34 : 22, 6, 3);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function buildIntroFrames(dark: boolean): string[] {
  return INTRO_PANELS.map((panel, i) => drawPanel(panel, i, dark));
}
