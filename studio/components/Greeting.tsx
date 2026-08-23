import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, DeviceMobileCamera } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../../src/react/LenticularCard';
import { findOccasion, teaseFor } from '../lib/occasions';
import type { SharePayload } from '../lib/share';
import { framesToUrls } from '../lib/share';

interface GreetingProps {
  payload: SharePayload;
  /** Enter the studio, carrying who to reply to. */
  onMakeOne: (replyTo?: string) => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * What the recipient sees. The card is deliberately held back behind a seal:
 * the pause before opening something is most of what makes it feel like a
 * gift rather than a link.
 */
export function Greeting({ payload, onMakeOne }: GreetingProps) {
  const [opened, setOpened] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);
  const { meta } = payload;
  const occasion = findOccasion(meta.occasion);

  // Object URLs are owned here and revoked when the greeting goes away.
  const frames = useMemo(() => framesToUrls(payload.frames), [payload.frames]);
  useEffect(() => () => frames.forEach((url) => URL.revokeObjectURL(url)), [frames]);

  const touch =
    typeof matchMedia === 'function' &&
    matchMedia('(hover: none) and (pointer: coarse)').matches;

  const from = meta.from?.trim();

  return (
    <div
      className="greeting"
      style={{
        ['--tint' as string]: occasion.tint,
        ['--tint-ink' as string]: occasion.tintInk,
      }}
    >
      <div className="greeting-glow" aria-hidden />

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div
            key="sealed"
            className="sealed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -28, filter: 'blur(14px)' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <motion.button
              className="seal"
              onClick={() => setOpened(true)}
              aria-label={occasion.open}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              animate={{ y: [0, -7, 0] }}
              transition={{
                y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                scale: { type: 'spring', stiffness: 400, damping: 26 },
              }}
            >
              <span className="seal-glyph" aria-hidden>
                {occasion.seal}
              </span>
              <span className="seal-ring" aria-hidden />
            </motion.button>

            <h1 className="sealed-tease">{teaseFor(occasion, from)}</h1>
            <p className="sealed-sub">
              A lenticular card. The picture changes as you tilt it.
            </p>

            <button className="btn btn-solid btn-lg" onClick={() => setOpened(true)}>
              {occasion.open}
              <span className="btn-well">
                <ArrowUpRight size={14} weight="bold" />
              </span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="open"
            className="opened"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {from && (
              <motion.p
                className="greeting-from"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
              >
                from {from}
              </motion.p>
            )}

            <motion.div
              className="greeting-card"
              data-orientation={meta.settings.orientation ?? 'auto'}
              initial={{ opacity: 0, y: 90, rotateX: 26, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 62, damping: 14, mass: 1.2 }}
            >
              <LenticularCard
                ref={cardRef}
                images={frames}
                caption={meta.caption || undefined}
                {...meta.settings}
              />
            </motion.div>

            {meta.note && (
              <motion.blockquote
                className="greeting-note"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
              >
                {meta.note}
                {from && <cite>— {from}</cite>}
              </motion.blockquote>
            )}

            <motion.div
              className="greeting-actions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
            >
              {touch && (
                <button
                  className="btn btn-outline"
                  onClick={() => void cardRef.current?.enableGyro()}
                >
                  <DeviceMobileCamera size={15} weight="light" />
                  Tilt your phone
                </button>
              )}
              <button className="btn btn-solid btn-lg" onClick={() => onMakeOne(from)}>
                {from ? `Send one back to ${from}` : 'Make one of your own'}
                <span className="btn-well">
                  <ArrowUpRight size={14} weight="bold" />
                </span>
              </button>
            </motion.div>

            <motion.p
              className="greeting-foot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              Made with lenticard. It takes about a minute.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
