/**
 * A lenticular print, drawn three times.
 *
 * The belt cannot hold a live WebGL lens per case — browsers cap contexts at
 * around sixteen and a moving belt runs straight through that — and swapping a
 * still for a canvas when the pointer arrives is a mount, a resize, three
 * texture uploads and only then a paint, which is a visible jump in the middle
 * of the card.
 *
 * So the print is drawn as three views: left tilt, straight on, right tilt.
 * Each one favours a frame and weaves its neighbours through it in strips, the
 * way a wide interlace on a real sheet does — which is why a lenticular card
 * looks woven even when nothing is moving. Cross-fading the three in CSS is
 * the flip. No context, nothing to swap, and every case in the belt moves.
 */

/**
 * Fine, and drawn well above the size it is shown at.
 *
 * Ninety-six ridges on a 630px sheet is a 6px bar, and at the size a case is
 * actually drawn that is a fat stripe across the picture rather than a lens —
 * blotchy enough that you cannot read what the card is of. Two hundred ridges
 * on a 780px sheet is a 4px bar that the browser's downscale averages into a
 * fine line, which is what a lens sheet looks like from arm's length.
 */
const RIDGES = 200;

/**
 * How many angles the print is drawn at.
 *
 * Three snapped: a third of the loop holding, then a hard change. The live
 * card sweeps, so this has to have enough steps to dissolve rather than cut.
 */
export const PHASES = 4;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${url}`));
    img.src = url;
  });
}

/**
 * Fill, and let CSS do the cropping.
 *
 * The sheet used to be a fixed 63:88 with the photograph letterboxed into it,
 * which baked black bars down both sides — so arriving on a card swapped an
 * edge-to-edge picture for a barred one, and the hover looked like a crop.
 * The sheet takes the photograph's own shape now and every frame fills it, so
 * the woven views and the plain frame are the same picture and object-fit
 * treats them identically. What you see before you touch it is what you keep.
 */
function cover(img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
}

export async function interlacedViews(
  urls: string[],
  width = 800,
): Promise<string[]> {
  const frames = await Promise.all(urls.slice(0, 6).map(load));
  if (!frames.length) throw new Error('An interlace needs at least one frame');

  // The sheet is the shape of the first frame, so that one is never touched.
  const height = Math.round((width * frames[0].naturalHeight) / frames[0].naturalWidth);
  const boxes = frames.map((img) => cover(img, width, height));
  const strip = width / RIDGES;
  const last = frames.length - 1;

  const views: string[] = [];

  for (let view = 0; view < PHASES; view++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser has no 2D canvas');

    // The frame this angle favours, from full left tilt to full right.
    const lead = Math.round((view / Math.max(1, PHASES - 1)) * last);

    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, width, height);

    const draw = (index: number) => {
      const { dx, dy, dw, dh } = boxes[index];
      ctx.drawImage(frames[index], dx, dy, dw, dh);
    };

    draw(lead);

    // The neighbours, woven through it. A lens with a wide interlace never
    // shows one frame cleanly — that is the whole reason the surface reads as
    // a lens rather than as a photograph behind glass.
    //
    // All of a frame's strips go into one path and it is drawn once. Clipping
    // and drawing per strip is ninety-six full-size draws per frame per view,
    // which locks the main thread for seconds before the page can paint.
    if (frames.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (let f = 0; f < frames.length; f++) {
        if (f === lead) continue;
        const path = new Path2D();
        for (let i = 0; i < RIDGES; i++) {
          if ((lead + i) % frames.length !== f) continue;
          // Half a pixel of overlap, or the seams show as a grid.
          path.rect(i * strip, 0, strip + 0.5, height);
        }
        ctx.save();
        ctx.clip(path);
        draw(f);
        ctx.restore();
      }
      ctx.restore();
    }

    // The ridges: each lenticule is a tiny cylinder, bright down one side and
    // dark down the other. Without this the strips read as a scanning fault
    // rather than as a surface with a shape.
    const tile = document.createElement('canvas');
    tile.width = Math.max(1, Math.ceil(strip));
    tile.height = 1;
    const tileCtx = tile.getContext('2d');
    if (tileCtx) {
      const ridge = tileCtx.createLinearGradient(0, 0, tile.width, 0);
      ridge.addColorStop(0, 'rgba(0, 0, 0, 0.11)');
      ridge.addColorStop(0.42, 'rgba(255, 255, 255, 0.055)');
      ridge.addColorStop(0.62, 'rgba(255, 255, 255, 0.025)');
      ridge.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
      tileCtx.fillStyle = ridge;
      tileCtx.fillRect(0, 0, tile.width, 1);
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Split colour, swinging with the angle — the band sits where the light
    // would catch the sheet at this tilt, not in the same place every view.
    const offset = (view / PHASES - 0.5) * width * 1.2;
    const foil = ctx.createLinearGradient(offset, height, width + offset, 0);
    foil.addColorStop(0, 'rgba(92, 225, 255, 0)');
    foil.addColorStop(0.32, 'rgba(123, 123, 255, 0.1)');
    foil.addColorStop(0.5, 'rgba(255, 94, 207, 0.13)');
    foil.addColorStop(0.68, 'rgba(92, 255, 176, 0.09)');
    foil.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = foil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    views.push(canvas.toDataURL('image/jpeg', 0.86));
    // Hand the thread back between views. Three of these back to back is long
    // enough to be a visible stall on the first paint. A timer, not a frame:
    // requestAnimationFrame never fires in a background tab, and this would
    // then never finish.
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  return views;
}
