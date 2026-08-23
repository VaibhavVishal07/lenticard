import { DEFAULT_OCCASION, OCCASIONS } from './occasions';
import type { CardSettings } from './presets';

/**
 * The community wall.
 *
 * With a hosted store connected this lists what everyone has published. On the
 * plain static build there is no server to ask, so the wall shows the built-in
 * showcase plus whatever this browser has published itself — and says so,
 * rather than pretending a local list is a global one.
 */

export interface GalleryEntry {
  id: string;
  /** Frames as URLs the tile can render directly. */
  frames: string[];
  from?: string;
  note?: string;
  occasion: string;
  settings: Partial<CardSettings>;
  createdAt: number;
  /** Where it came from, so the UI can be honest about scope. */
  origin: 'showcase' | 'local' | 'community';
  link?: string;
}

const STORAGE_KEY = 'lenticard-gallery';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const galleryIsGlobal = Boolean(SUPABASE_URL && SUPABASE_KEY);

// ------------------------------------------------------------------ showcase

interface ShowcaseSpec {
  id: string;
  from: string;
  note: string;
  occasion: string;
  hues: [number, number, number];
  orientation: CardSettings['orientation'];
}

const SHOWCASE: ShowcaseSpec[] = [
  {
    id: 'showcase-harbour',
    from: 'Meera',
    note: 'The harbour, three evenings running. Tilt it slowly.',
    occasion: 'justbecause',
    hues: [196, 262, 318],
    orientation: 'landscape',
  },
  {
    id: 'showcase-eighteen',
    from: 'Tomás',
    note: 'Eighteen. Somehow. Happy birthday, troublemaker.',
    occasion: 'birthday',
    hues: [38, 12, 340],
    orientation: 'portrait',
  },
  {
    id: 'showcase-thanks',
    from: 'Adaeze',
    note: 'For the ride to the airport at four in the morning.',
    occasion: 'thanks',
    hues: [148, 168, 190],
    orientation: 'square',
  },
  {
    id: 'showcase-moon',
    from: 'Ísabel',
    note: 'Same window, three months apart. Miss you.',
    occasion: 'missyou',
    hues: [226, 250, 274],
    orientation: 'circle',
  },
];

/** Abstract frames drawn at runtime, so the wall ships with no binary assets. */
function drawShowcaseFrame(hue: number, step: number, size: [number, number]): string {
  const [width, height] = size;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, width * 0.4, height);
  bg.addColorStop(0, `hsl(${hue} 46% ${20 + step * 8}%)`);
  bg.addColorStop(1, `hsl(${hue + 30} 38% ${8 + step * 5}%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cx = width * (0.34 + step * 0.16);
  const cy = height * (0.38 + step * 0.1);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(width, height) * 0.7);
  glow.addColorStop(0, `hsl(${hue + 40} 82% 74% / 0.85)`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `hsl(${hue + 55} 30% ${6 + step * 3}%)`;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 6) {
    const p = (x + step * width * 0.1) / width;
    ctx.lineTo(
      x,
      height * 0.66 -
        Math.sin(p * Math.PI * 2.4) * height * 0.12 -
        Math.sin(p * Math.PI * 6) * height * 0.03,
    );
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.82);
}

function buildShowcase(): GalleryEntry[] {
  return SHOWCASE.map((spec, index) => {
    const size: [number, number] =
      spec.orientation === 'portrait'
        ? [560, 784]
        : spec.orientation === 'landscape'
          ? [840, 560]
          : [660, 660];
    return {
      id: spec.id,
      frames: spec.hues.map((hue, step) => drawShowcaseFrame(hue, step, size)),
      from: spec.from,
      note: spec.note,
      occasion: spec.occasion,
      settings: { orientation: spec.orientation },
      // Staggered so the wall isn't four cards with the same timestamp.
      createdAt: Date.now() - (index + 1) * 7_200_000,
      origin: 'showcase',
    };
  });
}

// --------------------------------------------------------------------- local

interface StoredEntry {
  id: string;
  frames: string[];
  from?: string;
  note?: string;
  occasion: string;
  settings: Partial<CardSettings>;
  createdAt: number;
  link?: string;
}

function readLocal(): GalleryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEntry[];
    return parsed.map((entry) => ({ ...entry, origin: 'local' as const }));
  } catch {
    // Private windows and blocked site data both land here.
    return [];
  }
}

function writeLocal(entries: StoredEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* Out of quota, or storage blocked. The card still sent. */
  }
}

// ----------------------------------------------------------------- community

interface CommunityRow {
  id: string;
  from_name: string | null;
  note: string | null;
  occasion: string | null;
  settings: Partial<CardSettings> | null;
  frames: string[] | null;
  link: string | null;
  created_at: string;
}

/**
 * Supabase over plain REST. Expects a `cards_public` table with the columns
 * above, insert allowed for anon, select allowed for anon.
 */
async function fetchCommunity(limit: number): Promise<GalleryEntry[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/cards_public?select=*&status=eq.approved` +
      `&order=created_at.desc&limit=${limit}`,
    { headers: { apikey: SUPABASE_KEY!, authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  if (!response.ok) throw new Error(`The wall could not be loaded (${response.status}).`);
  const rows = (await response.json()) as CommunityRow[];
  return rows
    .filter((row) => Array.isArray(row.frames) && row.frames.length >= 2)
    .map((row) => ({
      id: row.id,
      frames: row.frames!,
      from: row.from_name ?? undefined,
      note: row.note ?? undefined,
      occasion: row.occasion ?? DEFAULT_OCCASION.id,
      settings: row.settings ?? {},
      createdAt: Date.parse(row.created_at),
      origin: 'community' as const,
      link: row.link ?? undefined,
    }));
}

// -------------------------------------------------------------------- public

export async function listGallery(limit = 24): Promise<GalleryEntry[]> {
  const mine = readLocal();
  if (galleryIsGlobal) {
    const community = await fetchCommunity(limit).catch(() => [] as GalleryEntry[]);
    if (community.length) return community;
  }
  return [...mine, ...buildShowcase()].slice(0, limit);
}

export interface PublishInput {
  frames: string[];
  from?: string;
  note?: string;
  occasion: string;
  settings: Partial<CardSettings>;
  link?: string;
  /** A signed-in account's access token. Required for the public wall. */
  token?: string;
}

/** Whether posting publicly is possible at all in this deployment. */
export const canPublishPublicly = galleryIsGlobal;

export async function publishToGallery(input: PublishInput): Promise<void> {
  const entry: StoredEntry = {
    id: `local-${Date.now().toString(36)}`,
    ...input,
    createdAt: Date.now(),
  };

  if (galleryIsGlobal) {
    if (!input.token) {
      throw new Error('Sign in before posting a card to the public wall.');
    }
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cards_public`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY!,
        // The user's own token, not the anon key: the row is attributed to them
        // and row-level security decides whether it is allowed.
        authorization: `Bearer ${input.token}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        from_name: input.from ?? null,
        note: input.note ?? null,
        occasion: input.occasion,
        settings: input.settings,
        frames: input.frames,
        link: input.link ?? null,
        // Nothing reaches the wall until a human or a moderation job clears it.
        status: 'pending',
      }),
    });
    if (!response.ok) {
      throw new Error(`The wall would not accept this card (${response.status}).`);
    }
    return;
  }

  // Keep the newest handful; frames are data URLs and quota is only ~5 MB.
  writeLocal([entry, ...readLocal()].slice(0, 6));
}

export function occasionLabel(id: string): string {
  return (OCCASIONS.find((item) => item.id === id) ?? DEFAULT_OCCASION).label;
}

export function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.round(days / 7)}w ago`;
}

/**
 * Flags a card for review. Reports are the backstop behind the sign-in gate and
 * the review queue — the three together are the moderation story, and none of
 * them run in the browser where they could simply be skipped.
 */
export async function reportCard(id: string, reason: string): Promise<void> {
  if (!galleryIsGlobal) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/card_reports`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({ card_id: id, reason }),
  });
  if (!response.ok) throw new Error('That report did not go through. Try again.');
}
