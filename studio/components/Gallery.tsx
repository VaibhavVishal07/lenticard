import { AnimatePresence, motion } from 'motion/react';
import { Flag, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { LenticularCard } from '../../src/react/LenticularCard';
import {
  galleryIsGlobal,
  listGallery,
  occasionLabel,
  relativeTime,
  reportCard,
  type GalleryEntry,
} from '../lib/gallery';

/**
 * A tile is deliberately not a live card. Browsers cap WebGL contexts at around
 * sixteen, and a wall of real cards would blow straight through that and start
 * evicting each other. Tiles crossfade their frames under a ridge overlay,
 * which costs nothing; the real renderer only runs for the one card you open.
 */
function Tile({ entry, onOpen }: { entry: GalleryEntry; onOpen: () => void }) {
  const [step, setStep] = useState(0);
  const [live, setLive] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!live) return;
    timer.current = window.setInterval(
      () => setStep((s) => (s + 1) % entry.frames.length),
      760,
    );
    return () => window.clearInterval(timer.current);
  }, [live, entry.frames.length]);

  const shape = entry.settings.orientation ?? 'landscape';

  return (
    <motion.button
      className="tile"
      data-orientation={shape}
      onClick={onOpen}
      onMouseEnter={() => setLive(true)}
      onMouseLeave={() => {
        setLive(false);
        setStep(0);
      }}
      onFocus={() => setLive(true)}
      onBlur={() => setLive(false)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-label={`Open the card from ${entry.from ?? 'someone'}`}
    >
      <span className="tile-frame">
        {entry.frames.map((src, i) => (
          <img key={i} src={src} alt="" style={{ opacity: i === step ? 1 : 0 }} />
        ))}
        <span className="tile-ridges" aria-hidden />
      </span>
      <span className="tile-meta">
        <span className="tile-from">{entry.from ?? 'Anonymous'}</span>
        <span className="tile-sub">
          {occasionLabel(entry.occasion)} · {relativeTime(entry.createdAt)}
        </span>
      </span>
      {entry.origin === 'local' && <span className="tile-badge">yours</span>}
    </motion.button>
  );
}

interface GalleryProps {
  onMakeOne: () => void;
  onError: (message: string) => void;
}

export function Gallery({ onMakeOne, onError }: GalleryProps) {
  const [entries, setEntries] = useState<GalleryEntry[] | null>(null);
  const [open, setOpen] = useState<GalleryEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listGallery()
      .then((list) => !cancelled && setEntries(list))
      .catch(() => !cancelled && setEntries([]));
    return () => {
      cancelled = true;
    };
  }, []);

  async function report(entry: GalleryEntry) {
    try {
      await reportCard(entry.id, 'flagged from the wall');
      onError('Reported. A moderator will look at it.');
    } catch (error) {
      onError((error as Error).message);
    }
  }

  return (
    <div className="wall">
      <p className="wall-lede">
        {galleryIsGlobal
          ? 'Posted by the people who made them, and checked before they show up here.'
          : 'A starter set, plus anything you have posted from this browser. Connect a store and this becomes the shared wall.'}
      </p>

      {entries === null ? (
        <div className="tiles" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="tile tile-skeleton" />
          ))}
        </div>
      ) : (
        <div className="tiles">
          {entries.map((entry) => (
            <Tile key={entry.id} entry={entry} onOpen={() => setOpen(entry)} />
          ))}
          <button className="tile tile-cta" onClick={onMakeOne}>
            <span className="tile-cta-mark" aria-hidden>
              +
            </span>
            Add yours
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`Card from ${open.from ?? 'someone'}`}
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="lightbox-card" data-orientation={open.settings.orientation ?? 'auto'}>
                <LenticularCard images={open.frames} {...open.settings} />
              </div>
              <div className="lightbox-meta">
                <p className="lightbox-from">{open.from ?? 'Anonymous'}</p>
                {open.note && <p className="lightbox-note">{open.note}</p>}
                <div className="lightbox-actions">
                  <button className="btn btn-solid" onClick={onMakeOne}>
                    Make one like this
                  </button>
                  {galleryIsGlobal && open.origin === 'community' && (
                    <button className="btn" onClick={() => void report(open)}>
                      <Flag size={14} weight="light" />
                      Report
                    </button>
                  )}
                </div>
              </div>
              <button
                className="icon-btn lightbox-close"
                onClick={() => setOpen(null)}
                aria-label="Close"
              >
                <X size={16} weight="light" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
