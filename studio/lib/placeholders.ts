/**
 * Stand-in card art for the showcase column.
 *
 * Deliberately abstract: these are the slots waiting for real three-frame sets,
 * and pretending otherwise with borrowed art would only hide how much of the
 * column is still empty. Drawn at runtime so nothing ships as a binary.
 */

const W = 630;
const H = 880;

interface Spec {
  name: string;
  set: string;
  tint: string;
  hues: [number, number];
  motif: 'orb' | 'shards' | 'rings' | 'ridge';
}

const SPECS: Spec[] = [
  { name: 'Placeholder', set: 'UNPRINTED', tint: '#2657b8', hues: [212, 268], motif: 'orb' },
  { name: 'Placeholder', set: 'UNPRINTED', tint: '#1c7a4f', hues: [148, 186], motif: 'shards' },
  { name: 'Placeholder', set: 'UNPRINTED', tint: '#b8912f', hues: [36, 12], motif: 'rings' },
  { name: 'Placeholder', set: 'UNPRINTED', tint: '#6b3fc4', hues: [286, 320], motif: 'ridge' },
];

function draw(spec: Spec): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const [h1, h2] = spec.hues;

  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, `hsl(${h1} 46% 14%)`);
  bg.addColorStop(1, `hsl(${h2} 52% 5%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.44;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (spec.motif === 'orb') {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, W * 0.62);
    g.addColorStop(0, `hsl(${h2} 90% 66% / 0.7)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (spec.motif === 'shards') {
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i / 10) * Math.PI * 2);
      ctx.fillStyle = `hsl(${h2} 84% 60% / ${0.1 + (i % 3) * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.6, -22);
      ctx.lineTo(W * 0.6, 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (spec.motif === 'rings') {
    for (let i = 8; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * 34, 0, Math.PI * 2);
      ctx.strokeStyle = `hsl(${h1 + i * 5} 80% 60% / ${0.06 + (9 - i) * 0.03})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  } else {
    for (let x = 0; x < W; x += 16) {
      ctx.fillStyle = `hsl(${h1 + (x / W) * 40} 76% 58% / 0.09)`;
      ctx.fillRect(x, H * 0.2, 7, H * 0.5);
    }
  }
  ctx.restore();

  // A plate where a name would sit, left empty on purpose.
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(W * 0.1, H * 0.78, W * 0.8, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.font = `700 20px Satoshi, ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = '0.28em';
  ctx.textAlign = 'center';
  ctx.fillText('YOUR CARD HERE', cx, H * 0.85);

  return canvas.toDataURL('image/jpeg', 0.82);
}

export function buildPlaceholders(): Array<{ still: string } & Omit<Spec, 'hues' | 'motif'>> {
  return SPECS.map((spec) => ({
    still: draw(spec),
    name: spec.name,
    set: spec.set,
    tint: spec.tint,
  }));
}
