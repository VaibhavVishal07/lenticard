/**
 * Card themes.
 *
 * The thing being made is a trading card, not a photo with ridges on it. The
 * photos supply the art; the theme supplies everything printed around them —
 * plate colours, the type badge, what the two attributes are called, and the
 * voice of the flavour line. Choosing "Valentine" should change what the card
 * *says about itself*, not just its hue.
 *
 * Every frame is composed on a canvas, so a card is three finished trading
 * cards that differ only in their art window. That is what makes the flip read
 * as one object turning rather than three pictures cross-fading.
 */

export interface Attribute {
  label: string;
  value: string;
}

export interface CardTheme {
  id: string;
  label: string;
  /** Printed on the type badge. */
  badge: string;
  glyph: string;
  /** Card stock, from outer border inward. */
  plate: [string, string];
  board: string;
  ink: string;
  accent: string;
  /** Defaults the maker starts from. */
  title: string;
  attributes: [Attribute, Attribute];
  flavour: string;
}

export const THEMES: CardTheme[] = [
  {
    id: 'valentine',
    label: 'Valentine',
    badge: 'DEVOTION',
    glyph: '♥',
    plate: ['#ffd9e4', '#c2185b'],
    board: '#2a0813',
    ink: '#ffe8ef',
    accent: '#ff6f9c',
    title: 'Yours, Obviously',
    attributes: [
      { label: 'Together', value: '4 yrs' },
      { label: 'Arguments won', value: '0' },
    ],
    flavour: 'Still the best decision I have made without thinking.',
  },
  {
    id: 'birthday',
    label: 'Birthday',
    badge: 'ANOTHER LAP',
    glyph: '✦',
    plate: ['#ffe9b8', '#c98a12'],
    board: '#241804',
    ink: '#fff2d6',
    accent: '#ffc247',
    title: 'Thirty, Somehow',
    attributes: [
      { label: 'Candles', value: '30' },
      { label: 'Wishes left', value: '1' },
    ],
    flavour: 'Older, marginally wiser, still terrible at surprises.',
  },
  {
    id: 'friend',
    label: 'Friendship',
    badge: 'RELIABLE',
    glyph: '◈',
    plate: ['#c9f2e4', '#0f8f74'],
    board: '#04211b',
    ink: '#e6fff7',
    accent: '#4fe3b8',
    title: 'Emergency Contact',
    attributes: [
      { label: 'Called at 3am', value: '11×' },
      { label: 'Judgement', value: 'None' },
    ],
    flavour: 'Has never once asked why. Just picked up the keys.',
  },
  {
    id: 'congrats',
    label: 'Congratulations',
    badge: 'ACHIEVEMENT',
    glyph: '★',
    plate: ['#d9dcff', '#4a4ecf'],
    board: '#0d0f2b',
    ink: '#ecedff',
    accent: '#8a8dff',
    title: 'Called It',
    attributes: [
      { label: 'Doubters', value: 'Many' },
      { label: 'Result', value: 'Yours' },
    ],
    flavour: 'Everyone said it was a long shot. You went anyway.',
  },
];

export const DEFAULT_THEME = THEMES[0];

export function findTheme(id: string | undefined): CardTheme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

export interface CardCopy {
  title: string;
  attributes: [Attribute, Attribute];
  flavour: string;
}

export function copyFor(theme: CardTheme): CardCopy {
  return {
    title: theme.title,
    attributes: [{ ...theme.attributes[0] }, { ...theme.attributes[1] }],
    flavour: theme.flavour,
  };
}

// ------------------------------------------------------------------ layouts

export type CardLayout = 'trading' | 'full' | 'instant' | 'minimal';

export const LAYOUTS: Array<{ id: CardLayout; label: string; hint: string }> = [
  { id: 'trading', label: 'Trading card', hint: 'Name plate, type badge, attributes, flavour line' },
  { id: 'full', label: 'Full bleed', hint: 'Art edge to edge, one holo strip along the foot' },
  { id: 'instant', label: 'Instant photo', hint: 'White border and a wide caption margin' },
  { id: 'minimal', label: 'Minimal', hint: 'Thin frame, title only' },
];

// -------------------------------------------------------------- composition

const W = 900;
const H = 1260;

/**
 * Type sizes are set against the card's *displayed* width, not its pixel width.
 * A card renders around 350 CSS px wide, so anything under about 20px here
 * lands below 8px on screen and stops being readable. Nothing prints smaller.
 */
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

function fitCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  lines: number,
): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
      if (out.length === lines) return out;
    } else {
      line = next;
    }
  }
  if (line && out.length < lines) out.push(line);
  return out;
}

/** Faint diagonal foil, so the lens sheen has something to catch. */
function foil(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.5);
  for (let i = -30; i < 30; i++) {
    ctx.fillStyle = `rgba(255,255,255,${i % 3 === 0 ? 0.07 : 0.02})`;
    ctx.fillRect(i * 46, -H, 20, H * 2);
  }
  ctx.restore();
}

/** Halftone dots, for printed texture rather than digital flatness. */
function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000';
  for (let j = y; j < y + h; j += 7) {
    for (let i = x; i < x + w; i += 7) ctx.fillRect(i, j, 1.6, 1.6);
  }
  ctx.restore();
}

function art(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  theme: CardTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  fitCover(ctx, photo, x, y, w, h);
  // A wash in the theme's accent ties the photo to the card it sits in.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  halftone(ctx, x, y, w, h);
  ctx.restore();
}

function frameCounter(
  ctx: CanvasRenderingContext2D,
  theme: CardTheme,
  x: number,
  y: number,
  index: number,
  total: number,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  roundRect(ctx, x, y, 84, 38, 9);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.font = sans(700, 20);
  ctx.textBaseline = 'middle';
  ctx.fillText(`${index + 1} / ${total}`, x + 17, y + 20);
}

// ------------------------------------------------------------------ layouts

function drawTrading(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  theme: CardTheme,
  copy: CardCopy,
  index: number,
  total: number,
): void {
  const pad = 32;
  ctx.fillStyle = theme.board;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 24);
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}66`;
  ctx.lineWidth = 3;
  ctx.stroke();

  const plateY = pad + 22;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, pad + 20, plateY, W - pad * 2 - 40, 80, 14);
  ctx.fill();

  ctx.textBaseline = 'middle';
  const badgeW = 196;
  ctx.fillStyle = theme.ink;
  ctx.font = sans(800, 44);
  ctx.fillText(truncate(ctx, copy.title, W - pad * 2 - 96 - badgeW), pad + 44, plateY + 41);

  ctx.fillStyle = theme.accent;
  roundRect(ctx, W - pad - 20 - badgeW, plateY + 17, badgeW, 46, 23);
  ctx.fill();
  ctx.fillStyle = theme.board;
  ctx.font = sans(800, 20);
  ctx.textAlign = 'center';
  ctx.fillText(
    `${theme.glyph}  ${truncate(ctx, theme.badge, badgeW - 46)}`,
    W - pad - 20 - badgeW / 2,
    plateY + 41,
  );
  ctx.textAlign = 'left';

  const winX = pad + 24;
  const winY = plateY + 98;
  const winW = W - (pad + 24) * 2;
  const winH = 654;
  art(ctx, photo, theme, winX, winY, winW, winH, 12);
  ctx.strokeStyle = `${theme.accent}55`;
  ctx.lineWidth = 2;
  roundRect(ctx, winX, winY, winW, winH, 12);
  ctx.stroke();
  frameCounter(ctx, theme, winX + 16, winY + 16, index, total);

  const attrY = winY + winH + 48;
  copy.attributes.forEach((attr, i) => {
    const x = winX + i * (winW / 2);
    ctx.fillStyle = `${theme.ink}99`;
    ctx.font = sans(600, 21);
    ctx.letterSpacing = '0.12em';
    ctx.fillText(truncate(ctx, attr.label.toUpperCase(), winW / 2 - 24), x, attrY);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = theme.ink;
    ctx.font = sans(800, 38);
    ctx.fillText(truncate(ctx, attr.value, winW / 2 - 24), x, attrY + 40);
  });

  const flavY = attrY + 78;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, winX, flavY, winW, 84, 10);
  ctx.fill();
  ctx.fillStyle = `${theme.ink}cc`;
  ctx.font = sans(500, 26);
  wrap(ctx, copy.flavour, winW - 48, 2).forEach((line, i) => {
    ctx.fillText(line, winX + 24, flavY + 28 + i * 32);
  });

  ctx.strokeStyle = `${theme.ink}22`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(winX, H - pad - 60);
  ctx.lineTo(winX + winW, H - pad - 60);
  ctx.stroke();

  ctx.fillStyle = `${theme.ink}80`;
  ctx.font = sans(600, 21);
  ctx.fillText(theme.label.toUpperCase(), winX, H - pad - 34);
  ctx.textAlign = 'right';
  ctx.fillText('LENTICARD', winX + winW, H - pad - 34);
  ctx.textAlign = 'left';
}

function drawFull(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  theme: CardTheme,
  copy: CardCopy,
  index: number,
  total: number,
): void {
  art(ctx, photo, theme, 0, 0, W, H, 0);

  // One holo strip along the foot carries the name, and nothing else does.
  const stripH = 132;
  const grad = ctx.createLinearGradient(0, H - stripH, W, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.35, 'rgba(0,0,0,0.72)');
  grad.addColorStop(1, 'rgba(0,0,0,0.86)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - stripH * 2, W, stripH * 2);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = sans(800, 46);
  ctx.fillText(truncate(ctx, copy.title, W - 96), 48, H - 84);

  ctx.fillStyle = theme.accent;
  ctx.font = sans(700, 22);
  ctx.letterSpacing = '0.14em';
  ctx.fillText(theme.badge.toUpperCase(), 48, H - 42);
  ctx.letterSpacing = '0px';

  frameCounter(ctx, theme, W - 108, 40, index, total);
}

function drawInstant(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  theme: CardTheme,
  copy: CardCopy,
  index: number,
  total: number,
): void {
  ctx.fillStyle = '#f7f5ef';
  ctx.fillRect(0, 0, W, H);

  const m = 52;
  const winY = m;
  const winH = H - m * 2 - 210;
  art(ctx, photo, theme, m, winY, W - m * 2, winH, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(m, winY, W - m * 2, winH);
  frameCounter(ctx, theme, m + 16, winY + 16, index, total);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1b1a17';
  ctx.font = sans(800, 40);
  ctx.fillText(truncate(ctx, copy.title, W - m * 2), m, winY + winH + 62);

  ctx.fillStyle = 'rgba(27,26,23,0.62)';
  ctx.font = sans(500, 25);
  wrap(ctx, copy.flavour, W - m * 2, 2).forEach((line, i) => {
    ctx.fillText(line, m, winY + winH + 112 + i * 32);
  });

  ctx.fillStyle = theme.plate[1];
  roundRect(ctx, W - m - 132, winY + winH + 42, 132, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = sans(700, 19);
  ctx.textAlign = 'center';
  ctx.fillText(truncate(ctx, theme.label, 108), W - m - 66, winY + winH + 62);
  ctx.textAlign = 'left';
}

function drawMinimal(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  theme: CardTheme,
  copy: CardCopy,
  index: number,
  total: number,
): void {
  ctx.fillStyle = theme.board;
  ctx.fillRect(0, 0, W, H);

  const m = 34;
  art(ctx, photo, theme, m, m, W - m * 2, H - m * 2 - 108, 8);
  ctx.strokeStyle = `${theme.accent}44`;
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2 - 108);
  frameCounter(ctx, theme, m + 14, m + 14, index, total);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.font = sans(800, 40);
  ctx.fillText(truncate(ctx, copy.title, W - m * 2 - 150), m, H - 68);

  ctx.fillStyle = theme.accent;
  ctx.font = sans(700, 21);
  ctx.textAlign = 'right';
  ctx.letterSpacing = '0.12em';
  ctx.fillText(theme.badge.toUpperCase(), W - m, H - 68);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be read'));
    img.src = src;
  });
}

function composeFrame(
  photo: HTMLImageElement,
  theme: CardTheme,
  copy: CardCopy,
  layout: CardLayout,
  index: number,
  total: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const stock = ctx.createLinearGradient(0, 0, W * 0.7, H);
  stock.addColorStop(0, theme.plate[0]);
  stock.addColorStop(1, theme.plate[1]);
  ctx.fillStyle = stock;
  ctx.fillRect(0, 0, W, H);
  if (layout !== 'full' && layout !== 'instant') foil(ctx);

  if (layout === 'full') drawFull(ctx, photo, theme, copy, index, total);
  else if (layout === 'instant') drawInstant(ctx, photo, theme, copy, index, total);
  else if (layout === 'minimal') drawMinimal(ctx, photo, theme, copy, index, total);
  else drawTrading(ctx, photo, theme, copy, index, total);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Composes one finished card per photo. */
export async function composeCard(
  photos: string[],
  theme: CardTheme,
  copy: CardCopy,
  layout: CardLayout = 'trading',
): Promise<string[]> {
  const loaded = await Promise.all(photos.map(loadImage));
  return loaded.map((photo, i) => composeFrame(photo, theme, copy, layout, i, loaded.length));
}
