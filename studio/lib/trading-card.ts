/**
 * The landing card: a collectible-style creature card drawn frame by frame on a
 * canvas, so the repo carries no binary art and the demo works instantly.
 *
 * Three frames show the same creature charging, which is what makes the flip
 * read as one object seen from three angles rather than three unrelated images.
 * The creature and the set are original — this is the layout language of a
 * trading card, not any existing one.
 */

const WIDTH = 880;
const HEIGHT = 1232; // 5:7, the proportions of a real card

interface Charge {
  /** 0 = banked, 1 = fully lit. */
  level: number;
  label: string;
  sky: [string, string];
  ember: string;
  rim: string;
  aura: string;
}

const CHARGES: Charge[] = [
  {
    level: 0,
    label: 'BANKED',
    sky: ['#2b1c33', '#120b1a'],
    ember: '#c2683a',
    rim: '#e69a5f',
    aura: 'rgba(194, 104, 58, 0.55)',
  },
  {
    level: 0.5,
    label: 'KINDLED',
    sky: ['#5a2a2a', '#1c0f16'],
    ember: '#f08c3a',
    rim: '#ffc07a',
    aura: 'rgba(240, 140, 58, 0.7)',
  },
  {
    level: 1,
    label: 'BLAZING',
    sky: ['#8a3a1f', '#2a1010'],
    ember: '#ffd27a',
    rim: '#fff2d0',
    aura: 'rgba(255, 210, 122, 0.85)',
  },
];

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

const sans = (weight: number, size: number) =>
  `${weight} ${size}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;

/** Diagonal foil bands. Faint, but they catch the lens sheen convincingly. */
function drawFoil(ctx: CanvasRenderingContext2D, charge: Charge): void {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-0.5);
  for (let i = -30; i < 30; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + (i % 3 === 0 ? 0.035 : 0) * (0.4 + charge.level)})`;
    ctx.fillRect(i * 46, -HEIGHT, 22, HEIGHT * 2);
  }
  ctx.restore();
}

/** Rays behind the creature, spreading further as it charges. */
function drawBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  charge: Charge,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const rays = 18;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + charge.level * 0.18;
    const length = 420 * (0.55 + charge.level * 0.45);
    ctx.save();
    ctx.rotate(angle);
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, charge.aura);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.28 + charge.level * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, -16);
    ctx.lineTo(length, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * A lynx built from arcs and triangles. Geometric on purpose: a stylised
 * silhouette reads as deliberate art, where an attempt at rendered fur would
 * only read as a bad drawing.
 */
function drawCreature(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  charge: Charge,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Flame plume, growing with the charge.
  const plume = 1 + charge.level * 0.85;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 34;
    const height = (170 + i * 12) * plume;
    const gradient = ctx.createLinearGradient(0, 40, 0, -height);
    gradient.addColorStop(0, charge.aura);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(spread - 30, 60);
    ctx.quadraticCurveTo(spread - 12, -height * 0.5, spread + 6, -height);
    ctx.quadraticCurveTo(spread + 26, -height * 0.45, spread + 34, 60);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const body = ctx.createLinearGradient(0, -150, 0, 170);
  body.addColorStop(0, '#241722');
  body.addColorStop(1, '#0d0810');

  // Haunches and tail.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-150, 170);
  ctx.quadraticCurveTo(-170, 40, -70, 10);
  ctx.lineTo(80, 10);
  ctx.quadraticCurveTo(180, 46, 158, 170);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(126, 150);
  ctx.quadraticCurveTo(268, 128, 246, -18);
  ctx.quadraticCurveTo(214, 78, 118, 96);
  ctx.closePath();
  ctx.fill();

  // Head.
  ctx.beginPath();
  ctx.moveTo(-92, -30);
  ctx.quadraticCurveTo(-104, -142, 0, -156);
  ctx.quadraticCurveTo(104, -142, 92, -30);
  ctx.quadraticCurveTo(0, 34, -92, -30);
  ctx.closePath();
  ctx.fill();

  // Ears with lit inner faces.
  for (const side of [-1, 1]) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(side * 52, -128);
    ctx.lineTo(side * 96, -238);
    ctx.lineTo(side * 104, -108);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = charge.ember;
    ctx.globalAlpha = 0.55 + charge.level * 0.45;
    ctx.beginPath();
    ctx.moveTo(side * 64, -134);
    ctx.lineTo(side * 88, -206);
    ctx.lineTo(side * 92, -122);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Eyes: narrow at rest, wide and hot when blazing.
  const eyeOpen = 10 + charge.level * 12;
  for (const side of [-1, 1]) {
    ctx.fillStyle = charge.rim;
    ctx.beginPath();
    ctx.ellipse(side * 40, -78, 24, eyeOpen, side * -0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#170c14';
    ctx.beginPath();
    ctx.ellipse(side * 40, -78, 7, eyeOpen * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chest mark, lighting up as the charge builds.
  ctx.fillStyle = charge.ember;
  ctx.globalAlpha = 0.35 + charge.level * 0.65;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(30, 84);
  ctx.lineTo(0, 138);
  ctx.lineTo(-30, 84);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rim light down the leading edge.
  ctx.strokeStyle = charge.rim;
  ctx.globalAlpha = 0.5 + charge.level * 0.4;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-92, -30);
  ctx.quadraticCurveTo(-104, -142, 0, -156);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawFrame(charge: Charge): string {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Card stock.
  const stock = ctx.createLinearGradient(0, 0, WIDTH * 0.6, HEIGHT);
  stock.addColorStop(0, '#f4e6c8');
  stock.addColorStop(0.5, '#e6cfa4');
  stock.addColorStop(1, '#c9a874');
  ctx.fillStyle = stock;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawFoil(ctx, charge);

  // Inner board.
  const pad = 34;
  ctx.fillStyle = '#1a1119';
  roundRect(ctx, pad, pad, WIDTH - pad * 2, HEIGHT - pad * 2, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 226, 168, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- name plate --------------------------------------------------------
  const plateY = pad + 26;
  ctx.fillStyle = 'rgba(255, 232, 190, 0.1)';
  roundRect(ctx, pad + 22, plateY, WIDTH - pad * 2 - 44, 78, 16);
  ctx.fill();

  ctx.fillStyle = '#f6e7c8';
  ctx.font = sans(700, 46);
  ctx.textBaseline = 'middle';
  ctx.fillText('Emberlynx', pad + 46, plateY + 40);

  const hp = String(90 + Math.round(charge.level * 40));
  ctx.textAlign = 'right';
  ctx.font = sans(700, 48);
  ctx.fillStyle = charge.rim;
  ctx.fillText(hp, WIDTH - pad - 62, plateY + 41);
  const hpWidth = ctx.measureText(hp).width;
  ctx.font = sans(500, 20);
  ctx.fillStyle = 'rgba(246, 231, 200, 0.55)';
  ctx.fillText('HP', WIDTH - pad - 74 - hpWidth, plateY + 30);
  ctx.textAlign = 'left';

  // --- illustration window ----------------------------------------------
  const winX = pad + 26;
  const winY = plateY + 96;
  const winW = WIDTH - (pad + 26) * 2;
  const winH = 690;

  ctx.save();
  roundRect(ctx, winX, winY, winW, winH, 12);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, winY, 0, winY + winH);
  sky.addColorStop(0, charge.sky[0]);
  sky.addColorStop(1, charge.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(winX, winY, winW, winH);

  const cx = winX + winW / 2;
  const cy = winY + winH * 0.54;
  drawBurst(ctx, cx, winY + winH * 0.46, charge);

  // Ground shelf.
  ctx.fillStyle = 'rgba(10, 6, 12, 0.66)';
  ctx.beginPath();
  ctx.ellipse(cx, winY + winH * 0.9, winW * 0.46, 82, 0, 0, Math.PI * 2);
  ctx.fill();

  drawCreature(ctx, cx, cy, 1.16, charge);

  // Halftone, for printed texture rather than digital flatness.
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let y = winY; y < winY + winH; y += 7) {
    for (let x = winX; x < winX + winW; x += 7) {
      ctx.fillRect(x, y, 1.6, 1.6);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 226, 168, 0.4)';
  ctx.lineWidth = 2;
  roundRect(ctx, winX, winY, winW, winH, 12);
  ctx.stroke();

  // --- charge badge ------------------------------------------------------
  ctx.fillStyle = 'rgba(20, 12, 18, 0.82)';
  roundRect(ctx, winX + 18, winY + 18, 176, 44, 10);
  ctx.fill();
  ctx.fillStyle = charge.rim;
  ctx.font = sans(600, 19);
  ctx.fillText(charge.label, winX + 34, winY + 41);

  // --- attack row --------------------------------------------------------
  const attackY = winY + winH + 52;
  for (let i = 0; i < 3; i++) {
    const lit = charge.level >= i / 2;
    ctx.beginPath();
    ctx.arc(winX + 26 + i * 40, attackY, 15, 0, Math.PI * 2);
    ctx.fillStyle = lit ? charge.ember : 'rgba(246, 231, 200, 0.16)';
    ctx.fill();
    if (lit) {
      ctx.strokeStyle = charge.rim;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#f6e7c8';
  ctx.font = sans(600, 30);
  ctx.fillText('Kindle Rush', winX + 156, attackY + 2);

  ctx.textAlign = 'right';
  ctx.font = sans(700, 38);
  ctx.fillStyle = charge.rim;
  ctx.fillText(String(30 + Math.round(charge.level * 60)), winX + winW - 12, attackY + 2);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(246, 231, 200, 0.5)';
  ctx.font = sans(400, 19);
  ctx.fillText(
    'Discard one ember to strike again this turn.',
    winX + 156,
    attackY + 38,
  );

  // --- flavour box -------------------------------------------------------
  const flavourY = attackY + 72;
  ctx.fillStyle = 'rgba(255, 232, 190, 0.06)';
  roundRect(ctx, winX, flavourY, winW, 76, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(246, 231, 200, 0.72)';
  ctx.font = `italic 400 21px "Instrument Serif", ui-serif, Georgia, serif`;
  ctx.fillText(
    'It banks a season of heat in its chest and spends',
    winX + 20,
    flavourY + 28,
  );
  ctx.fillText('all of it in a single stride.', winX + 20, flavourY + 56);

  // --- stat strip --------------------------------------------------------
  const statY = flavourY + 104;
  const stats: Array<[string, string]> = [
    ['weakness', 'tide ×2'],
    ['resists', 'ash −20'],
    ['retreat', '••'],
  ];
  stats.forEach(([label, value], i) => {
    const x = winX + i * (winW / 3);
    ctx.fillStyle = 'rgba(246, 231, 200, 0.4)';
    ctx.font = sans(500, 15);
    ctx.letterSpacing = '0.14em';
    ctx.fillText(label.toUpperCase(), x, statY);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#f6e7c8';
    ctx.font = sans(600, 22);
    ctx.fillText(value, x, statY + 28);
  });

  // --- footer ------------------------------------------------------------
  ctx.strokeStyle = 'rgba(246, 231, 200, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(winX, HEIGHT - pad - 74);
  ctx.lineTo(winX + winW, HEIGHT - pad - 74);
  ctx.stroke();

  ctx.fillStyle = 'rgba(246, 231, 200, 0.42)';
  ctx.font = sans(500, 17);
  ctx.fillText('Ember Coast · 014 / 120', winX, HEIGHT - pad - 42);
  ctx.textAlign = 'right';
  ctx.fillText('illus. lenticard', winX + winW, HEIGHT - pad - 42);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function buildTradingCardFrames(): string[] {
  return CHARGES.map(drawFrame);
}
