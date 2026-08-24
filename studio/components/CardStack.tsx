import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Slab } from './Slab';
import type { CardLayout } from '../lib/themes';
import type { CaseKind } from './Slab';

export interface StackEntry {
  id: string;
  /** Shown while this slab is not the one being handled. */
  still: string;
  name: string;
  set: string;
  /** Which woven set this case is showing, so the belt can hold more than
      one subject. */
  art: string;
  /** Which template this slab is showing off. */
  layout: CardLayout;
  /** And what it arrives in, so the column shows both axes at once. */
  kind: CaseKind;
  /** Only one entry carries the live card; the rest are stills. */
  real?: boolean;
  /**
   * A message on this one's reverse. A case carrying one rides the belt turned
   * over, so the back of a card — and the fact that there is one — is
   * something the page shows rather than something it claims. Nothing on the
   * landing page explains this feature; two of these do the explaining.
   */
  note?: string;
  /** Who wrote it, signed underneath. */
  noteFrom?: string;
}

interface CardStackProps {
  entries: StackEntry[];
  /** Given the slot and whether it is the live one, returns the card to print. */
  render: (entry: StackEntry, live: boolean) => ReactNode;
  /** The reverse to mount in the well of a case that is riding turned over. */
  renderReverse?: (entry: StackEntry) => ReactNode;
}

/**
 * A belt of graded slabs — drifting up on a wide screen, across on a phone.
 *
 * Each slot is the same case the maker produces, not a flat imitation of one,
 * because the case is the product. Only one slab is ever a live lens: browsers
 * cap WebGL contexts at around sixteen and a moving belt would run through
 * that, so the rest hold a still inside the same template chrome.
 *
 * Nothing is held until you point at something. Seeding `held` with the first
 * entry meant the belt was paused on its own first frame and never moved at
 * all, which is a different fault from a belt that is too slow to notice.
 */
/**
 * How the belt's demonstration runs, in milliseconds.
 *
 * TRAVEL is deliberately long. The belt carries a card past about every three
 * and a half seconds, so ten seconds is roughly three cards. A card turning
 * itself over every five seconds is a page fidgeting at you; one that does it
 * every third card is something you happen to catch, which is the difference
 * between a demonstration and a loop.
 */
const TRAVEL = 10000;
const SEEK = 220;
const SEEK_LIMIT = 24000;
const SETTLE = 420;
const READ = 3400;
const RETURN = 950;

/** How near the middle of the window a case must be before it will turn. */
const CENTRED = 0.1;

export function CardStack({ entries, render, renderReverse }: CardStackProps) {
  const [held, setHeld] = useState<string | null>(null);
  /** Which case is mid-demonstration, and whether it has turned yet. */
  const [showing, setShowing] = useState<string | null>(null);
  const [turned, setTurned] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  /**
   * The belt turns one over while you watch.
   *
   * These used to ride permanently reversed, which showed you a back but
   * never told you it was a back — a card that has always been face down
   * reads as a card with a dark front. What conveys it is the movement: the
   * belt runs, stops, one case turns itself over, holds long enough to be
   * read, turns back, and the belt picks up again. You cannot watch that and
   * not know the card has two sides.
   *
   * The case is chosen when the belt stops rather than in advance, because
   * which one is in front of you depends on where the belt has got to.
   */
  useEffect(() => {
    const cases = entries.filter((e) => e.note);
    if (!cases.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer = 0;
    let round = 0;
    let stopped = false;

    /**
     * The case in the middle, or nothing at all.
     *
     * This used to take whichever note-carrying case was nearest the middle of
     * whatever happened to be on screen, which in practice meant one turning
     * over up near the top edge or down near the bottom — where it reads as a
     * glitch in the belt rather than as the belt showing you something. It now
     * wants a case whose centre is genuinely at the centre, within a tenth of
     * the window, and if there is not one it says so and the belt runs on.
     */
    const pickCentred = (): string | null => {
      const node = track.current;
      if (!node) return null;
      const middle = window.innerHeight / 2;
      const band = window.innerHeight * CENTRED;
      const slots = Array.from(node.querySelectorAll('[data-note="true"]'));
      let best = null;
      for (const slot of slots) {
        const box = slot.getBoundingClientRect();
        // Wholly on screen, or half a card turns over at the edge.
        if (box.top < 0 || box.bottom > window.innerHeight) continue;
        const d = Math.abs((box.top + box.bottom) / 2 - middle);
        if (d > band) continue;
        const id = (slot as HTMLElement).dataset.entry;
        if (id && (!best || d < best.d)) best = { id, d };
      }
      return best ? best.id : null;
    };

    let seeking = 0;

    const step = (phase: 'travel' | 'seek' | 'settle' | 'read' | 'return') => {
      if (stopped) return;
      if (phase === 'travel') {
        seeking = 0;
        timer = window.setTimeout(() => step('seek'), TRAVEL);
      } else if (phase === 'seek') {
        // Wait for one to come round to the middle rather than turning over
        // whichever card happens to be there when the clock runs out.
        const id = pickCentred();
        if (id) {
          round += 1;
          setShowing(id);
          return step('settle');
        }
        seeking += SEEK;
        timer = window.setTimeout(
          () => step(seeking > SEEK_LIMIT ? 'travel' : 'seek'),
          SEEK,
        );
      } else if (phase === 'settle') {
        // The belt stops first, then the case turns. Both at once reads as a
        // glitch rather than as something coming to rest to be looked at.
        timer = window.setTimeout(() => {
          setTurned(true);
          step('read');
        }, SETTLE);
      } else if (phase === 'read') {
        timer = window.setTimeout(() => {
          setTurned(false);
          step('return');
        }, READ);
      } else {
        timer = window.setTimeout(() => {
          setShowing(null);
          step('travel');
        }, RETURN);
      }
    };

    step('travel');
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [entries]);

  const slot = useCallback(
    (entry: StackEntry, key: string, duplicate: boolean, place: number) => {
      const isHeld = held === entry.id;
      // The belt is doubled so the loop has somewhere to run to. Only the first
      // pass carries the live lens, or the seam would cost a second WebGL
      // context for a card nobody is looking at.
      // Exactly one live lens, and it does not move around. Swapping a still
      // for a canvas when the pointer arrives is a mount, a resize, three
      // texture uploads and only then a paint — which is the jump you see in
      // the middle of the card. The rest carry a woven still, so they read as
      // lenticular standing still, which is what the sheet actually does.
      const live = entry.real === true && !duplicate;
      return (
        <div
          className="stack-slot"
          key={key}
          style={{ ['--slot' as string]: place }}
          data-held={isHeld}
          data-entry={entry.id}
          data-note={Boolean(entry.note) && !duplicate}
          onPointerEnter={() => setHeld(entry.id)}
        >
          <Slab
            encased
            label={entry.name}
            sublabel={`${entry.set} · LENTICARD`}
            serial={`LC-${entry.id.replace(/\D/g, '').padStart(7, '0')}`}
            kind={entry.kind}
            interactive={isHeld}
            reverse={entry.note && renderReverse ? renderReverse(entry) : undefined}
            flipped={showing === entry.id && !duplicate && turned}
          >
            {render(entry, live)}
          </Slab>
        </div>
      );
    },
    [held, render, renderReverse, showing, turned],
  );

  return (
    <div
      className="stack"
      data-paused={held !== null || showing !== null}
      onPointerLeave={() => setHeld(null)}
    >
      <div className="stack-track" ref={track}>
        {entries.map((entry, i) => slot(entry, `a-${entry.id}`, false, i))}
        {/* A second pass, so the loop has somewhere to run to. */}
        {entries.map((entry, i) => slot(entry, `b-${entry.id}`, true, entries.length + i))}
      </div>
    </div>
  );
}
