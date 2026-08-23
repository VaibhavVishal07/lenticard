import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { LenticularCardInstance } from '../../src/core/types';

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** The sweep every export follows: left, right, back. Ends where it started so a GIF loops. */
function sweepAngle(i: number, total: number): number {
  return Math.sin((i / total) * Math.PI * 2);
}

export interface GifOptions {
  frames?: number;
  maxWidth?: number;
  delay?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Records the card sweeping through its viewing angles. Reads the live WebGL
 * canvas (which keeps its drawing buffer) rather than re-rendering offscreen,
 * so the GIF is exactly what the user has been looking at.
 */
export async function recordGif(
  card: LenticularCardInstance,
  options: GifOptions = {},
): Promise<Blob> {
  const { frames = 36, maxWidth = 520, delay = 55, onProgress } = options;

  const source = card.canvas;
  if (!source.width) throw new Error('The card has not rendered yet.');

  const scale = Math.min(1, maxWidth / source.width);
  // GIF dimensions must be even-ish integers to avoid a stray edge column.
  const width = Math.max(2, Math.round((source.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((source.height * scale) / 2) * 2);

  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!;

  const encoder = GIFEncoder();

  for (let i = 0; i < frames; i++) {
    card.setAngle(sweepAngle(i, frames), 0, true);
    // One frame to render at the new angle, one for the buffer to settle.
    await nextFrame();
    await nextFrame();

    ctx.drawImage(source, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256, { format: 'rgb444' });
    const index = applyPalette(data, palette, 'rgb444');
    encoder.writeFrame(index, width, height, { palette, delay });
    onProgress?.(i + 1, frames);
  }

  encoder.finish();
  card.setAngle(0, 0);
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}

/** A single still at the current angle. */
export async function saveStill(card: LenticularCardInstance): Promise<Blob> {
  const blob = await card.toBlob('image/png');
  if (!blob) throw new Error('This card is running without WebGL, so it cannot be exported.');
  return blob;
}

async function toDataUrl(source: string): Promise<string> {
  if (source.startsWith('data:')) return source;
  const response = await fetch(source);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not inline ${source}`));
    reader.readAsDataURL(blob);
  });
}

const CDN = 'https://cdn.jsdelivr.net/npm/lenticard/dist/lenticard-element.iife.js';

/**
 * A single .html file with the frames and the whole runtime inlined — no build
 * step, no CDN, no server. Opens straight off the filesystem.
 */
export async function buildStandaloneHtml(
  images: string[],
  attributes: Record<string, string | number>,
  caption: string,
): Promise<string> {
  const inlined = await Promise.all(images.map(toDataUrl));

  let runtime = '';
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}lenticard-element.iife.js`);
    if (response.ok) runtime = await response.text();
  } catch {
    /* Falls back to the CDN tag below. */
  }

  const attrs = Object.entries(attributes)
    .map(([key, value]) => `\n      ${key}="${value}"`)
    .join('');

  const runtimeTag = runtime
    ? `<script>\n${runtime}\n</script>`
    : `<script src="${CDN}"></script>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${caption || 'Lenticular card'}</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 6vmin;
    background: radial-gradient(120% 100% at 50% 0%, #1b2136, #080a12 70%);
    color: #e8ecf7;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  lenticular-card { width: min(560px, 88vw); }
</style>
</head>
<body>
  <lenticular-card${attrs}
      images='${JSON.stringify(inlined)}'></lenticular-card>
  ${runtimeTag}
</body>
</html>
`;
}
