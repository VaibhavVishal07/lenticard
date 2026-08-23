/**
 * Sample frames are drawn at runtime rather than committed as image files.
 * The repo stays text-only, and the demo works the moment the page opens.
 */

export interface SampleSet {
  id: string;
  label: string;
  hint: string;
  frames: string[];
}

type Palette = {
  sky: [string, string];
  sun: string;
  glow: string;
  ridges: string[];
  haze: string;
};

const PALETTES: Palette[] = [
  {
    sky: ['#ffd39b', '#ff8f6b'],
    sun: '#fff4d6',
    glow: 'rgba(255, 214, 150, 0.85)',
    ridges: ['#8c4a5f', '#5f3050', '#39203f', '#1d1330'],
    haze: 'rgba(255, 186, 140, 0.35)',
  },
  {
    sky: ['#7f7fd5', '#e15b8a'],
    sun: '#ffe9f2',
    glow: 'rgba(255, 160, 200, 0.7)',
    ridges: ['#4b3b7a', '#3a2a63', '#281d4a', '#161031'],
    haze: 'rgba(180, 150, 255, 0.3)',
  },
  {
    sky: ['#0f2027', '#2c5364'],
    sun: '#dfefff',
    glow: 'rgba(150, 200, 255, 0.55)',
    ridges: ['#1f3b4d', '#173040', '#102331', '#08131c'],
    haze: 'rgba(120, 180, 230, 0.25)',
  },
];

function drawScene(width: number, height: number, step: number, total: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const palette = PALETTES[step % PALETTES.length];
  const t = total > 1 ? step / (total - 1) : 0;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(1, palette.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // The sun tracks across and down, so the frames differ in more than hue.
  const sunX = width * (0.22 + t * 0.56);
  const sunY = height * (0.24 + t * 0.3);
  const radius = Math.min(width, height) * 0.11;

  const glow = ctx.createRadialGradient(sunX, sunY, radius * 0.2, sunX, sunY, radius * 5);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Four ridgelines, each offset a little further with the step: parallax.
  palette.ridges.forEach((color, i) => {
    const depth = (i + 1) / palette.ridges.length;
    const baseline = height * (0.52 + depth * 0.32);
    const amplitude = height * 0.09 * (1.25 - depth);
    const shift = (t - 0.5) * width * 0.09 * (1.4 - depth);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 8) {
      const p = (x + shift) / width;
      const y =
        baseline -
        Math.sin(p * Math.PI * (2 + i * 0.7) + i * 1.7) * amplitude -
        Math.sin(p * Math.PI * (7 + i)) * amplitude * 0.28;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = palette.haze;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  return canvas.toDataURL('image/jpeg', 0.9);
}

function drawSwatch(width: number, height: number, step: number, total: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const t = total > 1 ? step / (total - 1) : 0;
  const hue = 210 + t * 130;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, `hsl(${hue} 70% 22%)`);
  bg.addColorStop(1, `hsl(${hue + 45} 65% 42%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Concentric rings that grow with the step — an unmistakable flip.
  const cx = width * 0.5;
  const cy = height * 0.5;
  for (let i = 7; i >= 1; i--) {
    const r = (Math.min(width, height) * 0.06) * i * (0.72 + t * 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsl(${hue + i * 14} 85% ${58 + i * 3}% / ${0.22 + (7 - i) * 0.08})`;
    ctx.lineWidth = Math.max(2, width * 0.006);
    ctx.stroke();
  }

  ctx.fillStyle = `hsl(${hue + 80} 90% 72%)`;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) * (0.06 + t * 0.05), 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `600 ${Math.round(width * 0.055)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.textAlign = 'center';
  ctx.fillText(`FRAME ${step + 1}`, cx, height * 0.9);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function buildSamples(): SampleSet[] {
  return [
    {
      id: 'dusk',
      label: 'Dusk',
      hint: 'Three landscape frames, so the card comes out wide.',
      frames: [0, 1, 2].map((i) => drawScene(1440, 960, i, 3)),
    },
    {
      id: 'tower',
      label: 'Tower',
      hint: 'Three portrait frames, so the card comes out tall.',
      frames: [0, 1, 2].map((i) => drawScene(900, 1350, i, 3)),
    },
    {
      id: 'rings',
      label: 'Rings',
      hint: 'Four square frames — try the round shape with these.',
      frames: [0, 1, 2, 3].map((i) => drawSwatch(1100, 1100, i, 4)),
    },
  ];
}
