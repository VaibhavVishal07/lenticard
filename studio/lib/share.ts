import type { CardSettings } from './presets';

/**
 * A shared card is a self-contained object: the frames, the lens settings, and
 * who sent it. It is packed as a small binary container rather than JSON so the
 * image bytes are base64'd exactly once instead of once inside a JSON string
 * and again for the URL.
 *
 *   'LC1' | u16 metaLength | meta (utf-8 JSON) | u8 count | (u32 len | bytes)*
 */

export const MAGIC = 'LC1';
export const SHARE_VERSION = 1;

export interface ShareMeta {
  v: number;
  /** Who made it. Shown on the greeting. */
  from?: string;
  /** A short note to the recipient. */
  note?: string;
  /** Which occasion wrapped it, keyed to OCCASIONS. */
  occasion?: string;
  /** Card theme, keyed to THEMES — the printing is rebuilt from it. */
  theme?: string;
  /** Case label stock and texture. */
  tint?: string;
  texture?: string;
  caption?: string;
  settings: Partial<CardSettings>;
  /** Image mime the frames were encoded as. */
  mime: string;
}

export interface SharePayload {
  meta: ShareMeta;
  frames: Blob[];
}

/** Comfortably inside what messaging apps will carry without mangling. */
export const SIZE_WARNING = 160_000;
export const SIZE_LIMIT = 900_000;

// --------------------------------------------------------------- compression

async function encodeFrame(
  source: string,
  maxEdge: number,
  quality: number,
  mime: string,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read a frame while packing the link'));
    el.src = source;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error('This browser refused to encode the frames');
  return blob;
}

function supportsWebp(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Shrinks the frames until the whole package fits, stepping quality down and
 * then dimensions down. A link that is too long to send is worse than a link
 * to slightly softer images.
 */
export async function packFrames(
  sources: string[],
  budget = SIZE_WARNING,
): Promise<{ frames: Blob[]; mime: string; bytes: number }> {
  const mime = supportsWebp() ? 'image/webp' : 'image/jpeg';
  const steps: Array<[number, number]> = [
    [720, 0.72],
    [640, 0.62],
    [540, 0.55],
    [440, 0.5],
    [360, 0.45],
  ];

  let best: Blob[] = [];
  for (const [maxEdge, quality] of steps) {
    best = await Promise.all(
      sources.map((source) => encodeFrame(source, maxEdge, quality, mime)),
    );
    const bytes = best.reduce((sum, blob) => sum + blob.size, 0);
    // base64 costs a third on top, and that is what actually travels.
    if (bytes * 1.34 <= budget) return { frames: best, mime, bytes };
  }
  return { frames: best, mime, bytes: best.reduce((sum, b) => sum + b.size, 0) };
}

// ------------------------------------------------------------------ container

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  // Chunked: spreading a large array into String.fromCharCode blows the stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodePayload(payload: SharePayload): Promise<Uint8Array> {
  const meta = new TextEncoder().encode(JSON.stringify(payload.meta));
  const frames = await Promise.all(
    payload.frames.map(async (blob) => new Uint8Array(await blob.arrayBuffer())),
  );

  const total =
    3 + 2 + meta.length + 1 + frames.reduce((sum, f) => sum + 4 + f.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;

  for (const char of MAGIC) out[offset++] = char.charCodeAt(0);
  view.setUint16(offset, meta.length);
  offset += 2;
  out.set(meta, offset);
  offset += meta.length;
  out[offset++] = frames.length;

  for (const frame of frames) {
    view.setUint32(offset, frame.length);
    offset += 4;
    out.set(frame, offset);
    offset += frame.length;
  }
  return out;
}

export function decodePayload(bytes: Uint8Array): SharePayload {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (magic !== MAGIC) throw new Error('This link is not a lenticard card');
  offset = 3;

  const metaLength = view.getUint16(offset);
  offset += 2;
  const meta = JSON.parse(
    new TextDecoder().decode(bytes.subarray(offset, offset + metaLength)),
  ) as ShareMeta;
  offset += metaLength;

  if (meta.v > SHARE_VERSION) {
    throw new Error('This card was made with a newer version of lenticard');
  }

  const count = bytes[offset++];
  const frames: Blob[] = [];
  for (let i = 0; i < count; i++) {
    const length = view.getUint32(offset);
    offset += 4;
    // Copied out of the container so each frame owns a plain ArrayBuffer.
    const slice = new Uint8Array(bytes.subarray(offset, offset + length));
    frames.push(new Blob([slice.buffer], { type: meta.mime }));
    offset += length;
  }

  return { meta, frames };
}

export const encodeToText = (bytes: Uint8Array): string => base64UrlEncode(bytes);
export const decodeFromText = (text: string): Uint8Array => base64UrlDecode(text);

/** Object URLs for the decoded frames. The caller owns them. */
export function framesToUrls(frames: Blob[]): string[] {
  return frames.map((blob) => URL.createObjectURL(blob));
}
