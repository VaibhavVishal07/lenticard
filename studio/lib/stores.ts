import { decodeFromText, encodeToText, SIZE_LIMIT } from './share';

/**
 * Where a gifted card lives.
 *
 * The site is static, so the default store puts the whole card inside the link
 * itself — no account, no server, nothing to keep running, and a link that
 * works the moment it is pasted. The cost is a long URL.
 *
 * Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at a project and the
 * hosted store takes over, producing short `?c=<id>` links instead.
 */
export interface LinkStore {
  readonly id: string;
  /** Whether links from this store are short enough to text someone. */
  readonly short: boolean;
  save(bytes: Uint8Array): Promise<string>;
  load(url: URL): Promise<Uint8Array | null>;
}

function baseUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

/** The card travels inside the fragment, which browsers never send to a server. */
export const fragmentStore: LinkStore = {
  id: 'fragment',
  short: false,

  async save(bytes) {
    const text = encodeToText(bytes);
    if (text.length > SIZE_LIMIT) {
      throw new Error(
        'These frames are too heavy to fit in a link. Remove one, or connect a store for short links.',
      );
    }
    return `${baseUrl()}#c=${text}`;
  },

  async load(url) {
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const params = new URLSearchParams(hash);
    const text = params.get('c');
    return text ? decodeFromText(text) : null;
  },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) ?? 'cards';

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Supabase Storage over plain REST — no SDK, so the library stays dependency
 * free. Set up: create a public bucket named by VITE_SUPABASE_BUCKET, allow
 * anonymous inserts on it, and leave reads public.
 */
export const supabaseStore: LinkStore = {
  id: 'supabase',
  short: true,

  async save(bytes) {
    const id = randomId();
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${id}.lc`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY!,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/octet-stream',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        body: new Blob([bytes as BlobPart]),
      },
    );
    if (!response.ok) {
      throw new Error(`The card store rejected the upload (${response.status}).`);
    }
    return `${baseUrl()}?c=${id}`;
  },

  async load(url) {
    const id = url.searchParams.get('c');
    if (!id || !/^[0-9a-f]{18}$/.test(id)) return null;
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${id}.lc`,
    );
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  },
};

export const store: LinkStore =
  SUPABASE_URL && SUPABASE_KEY ? supabaseStore : fragmentStore;

/** Reads a card out of the current URL, whichever store put it there. */
export async function loadFromLocation(): Promise<Uint8Array | null> {
  const url = new URL(window.location.href);
  // Try the hosted store first, then always fall back to the fragment so links
  // made before a store was connected keep working forever.
  if (store !== fragmentStore) {
    const hosted = await store.load(url).catch(() => null);
    if (hosted) return hosted;
  }
  return fragmentStore.load(url).catch(() => null);
}

export function hasCardInLocation(): boolean {
  const url = new URL(window.location.href);
  return url.searchParams.has('c') || url.hash.includes('c=');
}

/** Drops the card out of the URL so a reload lands on the studio. */
export function clearLocation(): void {
  window.history.replaceState(null, '', window.location.pathname);
}
