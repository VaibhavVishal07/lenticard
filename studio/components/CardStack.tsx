import { useCallback, useState, type ReactNode } from 'react';

export interface StackEntry {
  id: string;
  /** Still shown while this card is not the one being handled. */
  still: string;
  name: string;
  set: string;
  tint: string;
}

interface CardStackProps {
  entries: StackEntry[];
  /** Rendered into whichever slot the pointer is over — the only live card. */
  live: (entry: StackEntry) => ReactNode;
}

/**
 * A column of graded cards drifting upward.
 *
 * Only one card is ever the real thing. Browsers cap WebGL contexts at around
 * sixteen and a scrolling column would blow past that, so every slot is a still
 * until you put the pointer on it — then the column halts and that slot becomes
 * the live card you can turn. Which is also the honest interaction: you stop
 * the belt to pick something up.
 */
export function CardStack({ entries, live }: CardStackProps) {
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
          onPointerLeave={() =>
            setHeld((current) => (current === entry.id ? entries[0]?.id ?? null : current))
          }
        >
          <div className="stack-label" style={{ ['--tint' as string]: entry.tint }}>
            <span className="stack-set">{entry.set}</span>
            <span className="stack-name">{entry.name}</span>
            <span className="stack-grade">10</span>
          </div>

          <div className="stack-art">
            {isHeld ? live(entry) : <img src={entry.still} alt="" loading="lazy" />}
            <span className="stack-gloss" aria-hidden />
          </div>
        </div>
      );
    },
    [held, live],
  );

  return (
    <div className="stack" data-paused={held !== null}>
      <div className="stack-track">
        {entries.map((entry) => slot(entry, `a-${entry.id}`))}
        {/* A second pass, so the loop has somewhere to run to. */}
        {entries.map((entry) => slot(entry, `b-${entry.id}`))}
      </div>
      <span className="stack-fade stack-fade-top" aria-hidden />
      <span className="stack-fade stack-fade-bottom" aria-hidden />
    </div>
  );
}
