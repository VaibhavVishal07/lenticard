import { useCallback, useState, type ReactNode } from 'react';
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
}

interface CardStackProps {
  entries: StackEntry[];
  /** Given the slot and whether it is the live one, returns the card to print. */
  render: (entry: StackEntry, live: boolean) => ReactNode;
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
export function CardStack({ entries, render }: CardStackProps) {
  const [held, setHeld] = useState<string | null>(null);

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
          onPointerEnter={() => setHeld(entry.id)}
        >
          <Slab
            encased
            label={entry.name}
            sublabel={`${entry.set} · LENTICARD`}
            serial={`LC-${entry.id.replace(/\D/g, '').padStart(7, '0')}`}
            kind={entry.kind}
            interactive={isHeld}
          >
            {render(entry, live)}
          </Slab>
        </div>
      );
    },
    [held, render],
  );

  return (
    <div className="stack" data-paused={held !== null} onPointerLeave={() => setHeld(null)}>
      <div className="stack-track">
        {entries.map((entry, i) => slot(entry, `a-${entry.id}`, false, i))}
        {/* A second pass, so the loop has somewhere to run to. */}
        {entries.map((entry, i) => slot(entry, `b-${entry.id}`, true, entries.length + i))}
      </div>
    </div>
  );
}
