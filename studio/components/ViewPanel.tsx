import { AnimatePresence, motion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';

const EASE = [0.32, 0.72, 0, 1] as const;

interface ViewPanelProps {
  open: boolean;
  title: string;
  lede?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The sections that used to be a long scroll. Each one slides up over the
 * landing instead, so the front page stays a single fold and nobody has to
 * scroll past three pitches to reach the thing they came for.
 */
export function ViewPanel({ open, title, lede, onClose, children }: ViewPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // The panel scrolls internally; the page behind it should not.
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="panel-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={onClose}
        >
          <motion.section
            className="view"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '6%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '5%', opacity: 0 }}
            transition={{ duration: 0.42, ease: EASE }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="view-head">
              <div>
                <h2>{title}</h2>
                {lede && <p>{lede}</p>}
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={17} weight="light" />
              </button>
            </header>
            <div className="view-body">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const STEPS = [
  {
    title: 'Pick two or three photos',
    body: 'The same subject works best. A place across three evenings, a face across three years, a room before and after.',
  },
  {
    title: 'Write who it is from',
    body: 'A name and a line. That is what they read on the sealed card, before anything opens.',
  },
  {
    title: 'Send the link',
    body: 'They tilt a phone or move a cursor and the picture changes. Nothing to install, and it does not expire.',
  },
];

export function HowItWorks() {
  return (
    <div className="steps-list">
      {STEPS.map((step, i) => (
        <article className="step" key={step.title}>
          <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </article>
      ))}
      <p className="steps-foot">
        A lenticular print interleaves strips of several pictures under a sheet of
        tiny lenses, so each angle reaches a different strip. This runs the same
        arithmetic per pixel, in a shader, on a screen you already own.
      </p>
    </div>
  );
}

export function ForDevelopers({ onOpenEmbed }: { onOpenEmbed: () => void }) {
  return (
    <div className="devs-view">
      <p>
        The card underneath all of this is an open-source library with no runtime
        dependencies. It ships as a React component, a self-registering web
        component, and one plain function, and it is about 9 kB gzipped.
      </p>
      <pre className="devs-code">
        <code>{`import { LenticularCard } from 'lenticard/react';

<LenticularCard
  images={[first, second, third]}
  caption="Three frames, one card"
/>`}</code>
      </pre>
      <div className="devs-actions">
        <button className="btn btn-solid" onClick={onOpenEmbed}>
          Copy the snippet
        </button>
        <a
          className="btn btn-outline"
          href="https://github.com/VaibhavVishal07/lenticard"
          target="_blank"
          rel="noreferrer"
        >
          Read the source
        </a>
      </div>
    </div>
  );
}
