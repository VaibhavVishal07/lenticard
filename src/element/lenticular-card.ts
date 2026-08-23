import { createLenticularCard } from '../core/card';
import type { ImageSource, LenticularCardInstance, LenticularOptions } from '../core/types';

const NUMBERS = [
  'lenticules',
  'parallax',
  'interlace',
  'blend',
  'sheen',
  'lens',
  'tilt',
  'float',
  'radius',
] as const;

const STRINGS = ['orientation', 'axis', 'motion', 'caption', 'fit'] as const;

/** kebab in HTML, camel in the options object. */
const ALIASES: Record<string, keyof LenticularOptions> = {
  'idle-sweep': 'idleSweep',
};

/**
 * A comma is legal inside a URL — data: URIs are full of them, and so are
 * Cloudinary-style transform segments. So the comma form only splits where a
 * recognisable URL starts, and anything ambiguous should use the JSON form.
 */
const URL_BOUNDARY = /,\s*(?=(?:https?:\/\/|data:|blob:|\/|\.{1,2}\/))/;

function parseImages(raw: string | null): ImageSource[] {
  if (!raw) return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    } catch {
      /* fall through to the separated readings */
    }
  }

  // Newlines are unambiguous, so they win when present.
  const source = /[\r\n]/.test(trimmed)
    ? trimmed.split(/[\r\n]+/)
    : /data:|blob:/.test(trimmed)
      ? trimmed.split(URL_BOUNDARY)
      : trimmed.split(',');

  return source.map((value) => value.trim()).filter(Boolean);
}

/**
 * `<lenticular-card images="a.jpg,b.jpg,c.jpg">`
 *
 * The escape hatch for every stack that isn't React — Vue, Svelte, Astro,
 * Rails, Webflow, a plain HTML file. One script tag, one element.
 */
export class LenticularCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['images', 'idle-sweep', ...NUMBERS, ...STRINGS];
  }

  private card: LenticularCardInstance | null = null;
  private mount: HTMLDivElement | null = null;
  private imagesOverride: ImageSource[] | null = null;

  /** Set images as a property to pass Files, Blobs or already-decoded images. */
  get images(): ImageSource[] {
    return this.imagesOverride ?? parseImages(this.getAttribute('images'));
  }

  set images(value: ImageSource[]) {
    this.imagesOverride = value;
    this.card?.update({ images: value });
  }

  /** The live instance, for setAngle(), enableGyro(), toBlob(). */
  get instance(): LenticularCardInstance | null {
    return this.card;
  }

  connectedCallback(): void {
    if (this.card) return;
    if (!this.style.display) this.style.display = 'block';
    this.mount = document.createElement('div');
    this.appendChild(this.mount);
    this.card = createLenticularCard(this.mount, this.readOptions());
  }

  disconnectedCallback(): void {
    this.card?.destroy();
    this.card = null;
    this.mount?.remove();
    this.mount = null;
  }

  attributeChangedCallback(name: string): void {
    if (!this.card) return;
    if (name === 'images') {
      this.imagesOverride = null;
      this.card.update({ images: this.images });
      return;
    }
    this.card.update(this.readOptions());
  }

  private readOptions(): LenticularOptions {
    const options: Record<string, unknown> = { images: this.images };

    for (const key of NUMBERS) {
      const raw = this.getAttribute(key);
      if (raw === null) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) options[key] = value;
    }

    for (const key of STRINGS) {
      const raw = this.getAttribute(key);
      if (raw !== null) options[key] = raw;
    }

    for (const [attribute, key] of Object.entries(ALIASES)) {
      const raw = this.getAttribute(attribute);
      if (raw === null) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) options[key] = value;
    }

    return options as unknown as LenticularOptions;
  }
}

export function defineLenticularCard(tag = 'lenticular-card'): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, LenticularCardElement);
}

// Auto-register: a script tag should be enough to make the element work.
defineLenticularCard();
