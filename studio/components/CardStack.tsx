import { useCallback, useState, type ReactNode } from 'react';
import { Slab } from './Slab';

export interface StackEntry {
  id: string;
  /** Shown while this slab is not the one being handled. */
  still: string;
  name: string;
  set: string;
  tint: string;
  /** Only one entry carries the live card; the rest are stills. */
  real?: boolean;
}

interface CardStackProps {
  entries: StackEntry[];
  /** Rendered inside whichever slab is being handled, if that slab is the real one. */
  live: () => ReactNode;
  onAngle?: (x: number, y: number) => void;
}

/**
 * A column of graded slabs drifting upward.
 *
 * Each slot is the same case the maker produces — not a flat imitation of one —
 * because the case is the product. Only one slab is ever the live card:
 * browsers cap WebGL contexts at around sixteen and a scrolling column would
 * run through that, so the rest hold a still. The belt halts under the pointer,
 * and only the slab you are on tracks it.
 */
export function CardStack({ entries, live, onAngle }: CardStackProps) {
  const [held, setHeld] = useState<string | null>(entries[0]?.id ?? null);

  const slot = useCallback(
    (entry: StackEntry, key: string) => {
      const isHeld = held === entry.id;
      return (
        <div
          className="stack-slot"
          key={key}
          data-held={isHeld}
          onPointerEnter={() => setHeld(entry.id)}
        >
          <Slab
            encased
            label={entry.name}
            sublabel={`${entry.set} · LENTICARD`}
            serial={`LC-${entry.id.replace(/\D/g, '').padStart(7, '0')}`}
            tint={entry.tint}
            interactive={isHeld}
            onAngle={isHeld && entry.real ? onAngle : undefined}
          >
            {isHeld && entry.real ? (
              live()
            ) : (
              <img className="stack-still" src={entry.still} alt="" loading="lazy" />
            )}
          </Slab>
        </div>
      );
    },
    [held, live, onAngle],
  );

  return (
    <div className="stack" data-paused={held !== null}>
      <div className="stack-track">
        {entries.map((entry) => slot(entry, `a-${entry.id}`))}
        {/* A second pass, so the loop has somewhere to run to. */}
        {entries.map((entry) => slot(entry, `b-${entry.id}`))}
      </div>
    </div>
  );
}
