import type { LoadedFrame } from './loader';
import type { RenderState } from './renderer';

/**
 * For machines with no WebGL. A DOM stack can't refract, so it can't pick one
 * frame per viewing angle the way a lens does — it crossfades the two frames
 * the angle lands between and wears a printed ridge texture over the top.
 * Same silhouette, same motion, no shader.
 */
export class FallbackRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly root: HTMLElement;
  private layers: HTMLElement[] = [];
  private urls: string[] = [];
  private count = 0;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'lc-fallback';
    host.appendChild(this.root);
    // Nothing draws to it, but callers still expect a canvas to exist.
    this.canvas = document.createElement('canvas');
  }

  get isLost(): boolean {
    return false;
  }

  setFrames(frames: LoadedFrame[]): void {
    this.clear();
    this.count = frames.length;
    this.layers = frames.map((frame, i) => {
      const layer = document.createElement('div');
      layer.className = 'lc-fallback-layer';
      layer.style.backgroundImage = `url("${this.urlFor(frame)}")`;
      layer.style.opacity = i === 0 ? '1' : '0';
      this.root.appendChild(layer);
      return layer;
    });
  }

  private urlFor(frame: LoadedFrame): string {
    const source = frame.source;
    if (source instanceof HTMLImageElement) return source.src;
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.getContext('2d')?.drawImage(source as CanvasImageSource, 0, 0);
    const url = canvas.toDataURL('image/png');
    this.urls.push(url);
    return url;
  }

  resize(_width?: number, _height?: number, _dpr?: number): void {
    /* CSS handles it. */
  }

  render(state: RenderState): void {
    if (!this.count) return;
    const last = this.count - 1;
    const t = ((state.angle * state.parallax + 1) / 2) * last;
    const i0 = Math.max(0, Math.min(last, Math.floor(t)));
    const frac = t - i0;
    this.layers.forEach((layer, i) => {
      const weight = i === i0 ? 1 - frac : i === i0 + 1 ? frac : 0;
      layer.style.opacity = String(weight);
    });
    this.root.style.setProperty('--lc-ridge-pitch', `${Math.max(2, 800 / state.lenticules)}px`);
  }

  private clear(): void {
    this.root.textContent = '';
    this.layers = [];
    this.urls = [];
  }

  dispose(): void {
    this.clear();
    this.root.remove();
  }
}
