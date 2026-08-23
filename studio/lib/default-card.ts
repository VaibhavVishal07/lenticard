/**
 * The card on the home page.
 *
 * Three deliberately unrelated images, not three variations of one. A lenticular
 * card only reads as lenticular when the frames disagree — same subject, subtle
 * shift, and the flip looks like a rendering artefact. Different palette,
 * different geometry, different composition, and it is unmistakable.
 *
 * Drawn on a canvas so the repo carries no binary art. Swap `buildDefaultCard`
 * for real photographs whenever you have them.
 */

const WIDTH = 900;
const HEIGHT = 1260; // 5:7, the proportions of a card

function frame(draw: (ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Cyan. A single low horizon and one cold sun. */
function aurora(): string {
  return frame((ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, '#03202f');
    sky.addColorStop(0.55, '#0a5f7a');
    sky.addColorStop(1, '#7ef0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Curtains of light, vertical, soft.
    for (let i = 0; i < 7; i++) {
      const x = WIDTH * (0.08 + i * 0.14);
      const band = ctx.createLinearGradient(x, HEIGHT * 0.1, x, HEIGHT * 0.78);
      band.addColorStop(0, 'rgba(126, 240, 255, 0)');
      band.addColorStop(0.45, `rgba(150, 255, 236, ${0.16 + (i % 3) * 0.08})`);
      band.addColorStop(1, 'rgba(126, 240, 255, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(x - 36, 0, 72, HEIGHT * 0.82);
    }

    ctx.fillStyle = '#eafcff';
    ctx.beginPath();
    ctx.arc(WIDTH * 0.68, HEIGHT * 0.26, 96, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#021420';
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    ctx.lineTo(0, HEIGHT * 0.8);
    for (let x = 0; x <= WIDTH; x += 8) {
      ctx.lineTo(x, HEIGHT * 0.8 - Math.sin((x / WIDTH) * Math.PI * 1.6) * 46);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fill();
  });
}

/** Magenta. One hard triangle, shards, no horizon at all. */
function prism(): string {
  return frame((ctx) => {
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, '#2b0146');
    bg.addColorStop(0.6, '#7a1170');
    bg.addColorStop(1, '#ff5ecf');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.translate(WIDTH * 0.5, HEIGHT * 0.5);
    for (let i = 0; i < 9; i++) {
      ctx.rotate(Math.PI / 4.5);
      const shard = ctx.createLinearGradient(0, 0, WIDTH * 0.7, 0);
      shard.addColorStop(0, `rgba(255, 255, 255, ${0.1 + (i % 2) * 0.14})`);
      shard.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shard;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.8, -44);
      ctx.lineTo(WIDTH * 0.8, 44);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#150022';
    ctx.beginPath();
    ctx.moveTo(WIDTH * 0.5, HEIGHT * 0.22);
    ctx.lineTo(WIDTH * 0.84, HEIGHT * 0.74);
    ctx.lineTo(WIDTH * 0.16, HEIGHT * 0.74);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffe6fb';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
}

/** Gold. Concentric rings, dead centre, warm. */
function solar(): string {
  return frame((ctx) => {
    const bg = ctx.createLinearGradient(0, HEIGHT, WIDTH, 0);
    bg.addColorStop(0, '#1a2604');
    bg.addColorStop(0.5, '#8a6a05');
    bg.addColorStop(1, '#ffd166');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cx = WIDTH * 0.5;
    const cy = HEIGHT * 0.46;
    for (let i = 11; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * 52, 0, Math.PI * 2);
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(28, 20, 0, ${0.14 + i * 0.02})`
          : `rgba(255, 244, 200, ${0.1 + (12 - i) * 0.04})`;
      ctx.lineWidth = i % 2 === 0 ? 14 : 5;
      ctx.stroke();
    }

    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(cx, cy, 74, 0, Math.PI * 2);
    ctx.fill();

    // A hard band across the lower third, so the composition is nothing like
    // the other two even in silhouette.
    ctx.fillStyle = '#101a02';
    ctx.fillRect(0, HEIGHT * 0.78, WIDTH, HEIGHT * 0.06);
    ctx.fillRect(0, HEIGHT * 0.88, WIDTH, HEIGHT * 0.12);
  });
}

export function buildDefaultCard(): string[] {
  return [aurora(), prism(), solar()];
}
