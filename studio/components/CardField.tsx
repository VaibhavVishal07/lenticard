import { useEffect, useMemo, useRef } from 'react';

/**
 * The depth behind the hero card: a scatter of ghost cards at different Z,
 * drifting slowly and leaning with the pointer. They are plain transformed
 * <img> elements — one pointer listener, one rAF, GPU-only properties — so the
 * whole field costs nothing next to the single real WebGL card in front of it.
 */

interface Ghost {
  id: number;
  /** -1..1 across the stage. */
  x: number;
  y: number;
  /** 0 = near, 1 = far. Drives blur, scale, opacity and parallax. */
  depth: number;
  rotate: number;
  hue: number;
  shape: 'wide' | 'tall' | 'square';
  phase: number;
}

const GHOSTS: Ghost[] = [
  { id: 0, x: -0.78, y: -0.42, depth: 0.72, rotate: -9, hue: 96, shape: 'tall', phase: 0 },
  { id: 1, x: -0.55, y: 0.5, depth: 0.45, rotate: 7, hue: 168, shape: 'wide', phase: 1.4 },
  { id: 2, x: 0.72, y: -0.5, depth: 0.55, rotate: 11, hue: 74, shape: 'wide', phase: 2.6 },
  { id: 3, x: 0.86, y: 0.36, depth: 0.8, rotate: -6, hue: 200, shape: 'square', phase: 3.9 },
  { id: 4, x: -0.3, y: -0.72, depth: 0.9, rotate: 4, hue: 130, shape: 'square', phase: 5.1 },
  { id: 5, x: 0.36, y: 0.74, depth: 0.66, rotate: -13, hue: 52, shape: 'tall', phase: 6.3 },
];

const SIZES: Record<Ghost['shape'], [number, number]> = {
  wide: [360, 240],
  tall: [220, 308],
  square: [270, 270],
};

/** Abstract art, drawn once, so the field ships without image assets. */
function ghostArt(hue: number, shape: Ghost['shape']): string {
  const [width, height] = SIZES[shape];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, width * 0.5, height);
  bg.addColorStop(0, `hsl(${hue} 44% 26%)`);
  bg.addColorStop(1, `hsl(${hue + 34} 52% 9%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.42;
  const cy = height * 0.36;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(width, height) * 0.8);
  glow.addColorStop(0, `hsl(${hue + 46} 88% 68% / 0.75)`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `hsl(${hue + 20} 38% 7%)`;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 6) {
    ctx.lineTo(x, height * 0.68 - Math.sin((x / width) * Math.PI * 2.2) * height * 0.14);
  }
  ctx.lineTo(width, height);
  ctx.fill();

  // The ridges, so even a ghost reads as a lenticular card.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#fff';
  for (let x = 0; x < width; x += 5) ctx.fillRect(x, 0, 1.6, height);

  return canvas.toDataURL('image/jpeg', 0.8);
}

export function CardField() {
  const ref = useRef<HTMLDivElement>(null);
  const art = useMemo(() => GHOSTS.map((g) => ghostArt(g.hue, g.shape)), []);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nodes = Array.from(host.querySelectorAll<HTMLElement>('.ghost'));
    let targetX = 0;
    let targetY = 0;
    let poseX = 0;
    let poseY = 0;
    let raf = 0;
    let elapsed = 0;
    let last = 0;

    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      elapsed += dt;

      // Ease toward the pointer so the field feels heavy rather than twitchy.
      poseX += (targetX - poseX) * Math.min(1, dt * 3.2);
      poseY += (targetY - poseY) * Math.min(1, dt * 3.2);

      nodes.forEach((node, i) => {
        const g = GHOSTS[i];
        const near = 1 - g.depth;
        const drift = reduced ? 0 : Math.sin(elapsed * 0.32 + g.phase) * 14 * near;
        const px = -poseX * 46 * near;
        const py = -poseY * 30 * near;
        node.style.transform =
          `translate3d(${px.toFixed(1)}px, ${(py + drift).toFixed(1)}px, 0) ` +
          `rotate(${(g.rotate + poseX * 2.5 * near).toFixed(2)}deg)`;
      });
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="field" ref={ref} aria-hidden>
      {GHOSTS.map((g, i) => (
        <span
          key={g.id}
          className="ghost"
          data-shape={g.shape}
          style={{
            left: `${50 + g.x * 42}%`,
            top: `${50 + g.y * 40}%`,
            // Far cards are smaller, softer and dimmer: ordinary aerial perspective.
            ['--g-scale' as string]: String(1.05 - g.depth * 0.45),
            ['--g-blur' as string]: `${(g.depth * 7).toFixed(1)}px`,
            ['--g-opacity' as string]: String(0.62 - g.depth * 0.42),
            zIndex: Math.round((1 - g.depth) * 10),
          }}
        >
          <img src={art[i]} alt="" />
        </span>
      ))}
    </div>
  );
}
