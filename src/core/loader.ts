import type { ImageSource } from './types';

export interface LoadedFrame {
  source: TexImageSource;
  width: number;
  height: number;
  /** Object URL we created and therefore own. */
  revoke?: string;
}

function fromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed or the canvas taints and toBlob()/GIF export throws.
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`lenticard: could not load image "${url}"`));
    img.src = url;
  });
}

/** Normalises every accepted source shape into something texImage2D will take. */
export async function loadFrame(source: ImageSource): Promise<LoadedFrame> {
  if (typeof source === 'string') {
    const img = await fromUrl(source);
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  }

  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(source);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    }
    const url = URL.createObjectURL(source);
    const img = await fromUrl(url);
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, revoke: url };
  }

  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { source, width: source.width, height: source.height };
  }

  if (source instanceof HTMLCanvasElement) {
    return { source, width: source.width, height: source.height };
  }

  if (source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth === 0) {
      await source.decode().catch(() => {
        throw new Error('lenticard: the supplied <img> never finished loading');
      });
    }
    return { source, width: source.naturalWidth, height: source.naturalHeight };
  }

  throw new Error('lenticard: unsupported image source');
}

export function releaseFrame(frame: LoadedFrame): void {
  if (frame.revoke) URL.revokeObjectURL(frame.revoke);
  if (typeof ImageBitmap !== 'undefined' && frame.source instanceof ImageBitmap) {
    frame.source.close();
  }
}
