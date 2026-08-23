/**
 * A lenticular print, standing still.
 *
 * The column used to hold plain photographs and swap in a live WebGL lens when
 * you pointed at one. That swap is a canvas mounting, sizing, uploading three
 * textures and only then painting — which is the jump you see in the middle of
 * the card. And a plain photograph does not look like the object anyway: a
 * lenticular sheet at rest is already woven, whether or not anything is moving.
 *
 * So the still is the weave. Vertical strips cut in the same order the shader
 * interlaces them, with the ridge shading a lens sheet has, drawn once into a
 * canvas and handed round as an image. No context per card, nothing to swap,
 * and every case in the belt reads as a printed card rather than a picture of
 * one.
 */

/**
 * Coarser than the shader's 160, on purpose. The live card renders at device
 * resolution and antialiases each ridge in the fragment shader; a still is a
 * bitmap the browser scales down with a box filter, and 160 ridges at the size
 * a case is drawn in the belt come back as moire rather than as a lens.
 */
const RIDGES = 96;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${url}`));
    img.src = url;
  });
}

/** Contain, never cover: the whole photograph, the way the card shows it. */
function contain(img: HTMLImageElement, w: number, h: number) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
}

export async function interlacedStill(
  urls: string[],
  width = 630,
  height = 880,
): Promise<string> {
  const frames = await Promise.all(urls.map(load));
  if (!frames.length) throw new Error('An interlace needs at least one frame');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser has no 2D canvas');

  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, width, height);

  const boxes = frames.map((img) => contain(img, width, height));
  const strip = width / RIDGES;

  for (let i = 0; i < RIDGES; i++) {
    const frame = i % frames.length;
    const img = frames[frame];
    const { dx, dy, dw, dh } = boxes[frame];
    ctx.save();
    ctx.beginPath();
    // Half a pixel of overlap, or the seams between strips show as a grid.
    ctx.rect(i * strip, 0, strip + 0.5, height);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // The ridges themselves: each lenticule is a tiny cylinder, so it is bright
  // down one side and dark down the other. Without this the strips read as a
  // scanning artefact rather than as a surface with a shape.
  const ridge = ctx.createLinearGradient(0, 0, strip, 0);
  ridge.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  ridge.addColorStop(0.42, 'rgba(255, 255, 255, 0.07)');
  ridge.addColorStop(0.62, 'rgba(255, 255, 255, 0.03)');
  ridge.addColorStop(1, 'rgba(0, 0, 0, 0.14)');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < RIDGES; i++) {
    ctx.save();
    ctx.translate(i * strip, 0);
    ctx.fillStyle = ridge;
    ctx.fillRect(0, 0, strip, height);
    ctx.restore();
  }
  ctx.restore();

  // One diagonal band of split colour, which is what the sheet does to light.
  const foil = ctx.createLinearGradient(0, height, width, 0);
  foil.addColorStop(0, 'rgba(92, 225, 255, 0)');
  foil.addColorStop(0.34, 'rgba(123, 123, 255, 0.09)');
  foil.addColorStop(0.5, 'rgba(255, 94, 207, 0.12)');
  foil.addColorStop(0.66, 'rgba(92, 255, 176, 0.08)');
  foil.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = foil;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.88);
}
