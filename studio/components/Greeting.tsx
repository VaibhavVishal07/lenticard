import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, DeviceMobileCamera } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LenticularCardHandle } from '../../src/react/LenticularCard';
import { TradingCard } from './TradingCard';
import { copyFor, findTheme } from '../lib/themes';
import { findOccasion, teaseFor } from '../lib/occasions';
import { framesToUrls, type SharePayload } from '../lib/share';
import { Slab } from './Slab';

interface GreetingProps {
  payload: SharePayload;
  /** Enter the maker, carrying who to reply to. */
  onMakeOne: (replyTo?: string) => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * What the recipient sees. The card arrives sealed in its case, exactly as the
 * sender left it, and taking it out is the moment the gift actually happens —
 * so the card is mounted once and simply rises out of the shell, rather than
 * being swapped in after an animation.
 */
export function Greeting({ payload, onMakeOne }: GreetingProps) {
  const [opened, setOpened] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);
  const { meta } = payload;
  const occasion = findOccasion(meta.occasion);
  // The printing is not baked into the frames, so it is rebuilt from the theme
  // the sender chose and whatever they retitled it to.
  const cardTheme = findTheme(meta.theme);
  const cardCopy = { ...copyFor(cardTheme), title: meta.caption || copyFor(cardTheme).title };

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

      <div className="greeting-inner">
        <motion.div
          className="greeting-card"
          data-orientation={meta.settings.orientation ?? 'auto'}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: EASE }}
        >
          <Slab
            encased={!opened}
            label={meta.caption || (from ? `From ${from}` : 'A card for you')}
            sublabel={from ? `Sent by ${from}` : occasion.label}
            serial={`LC-${String(frames.length * 137).padStart(7, '0')}`}
            tint={meta.tint}
            texture={meta.texture as never}
            onAngle={(x, y) => cardRef.current?.setAngle(x, y)}
          >
            <TradingCard
              ref={cardRef}
              photos={frames}
              theme={cardTheme}
              copy={cardCopy}
              layout="trading"
              lenticules={meta.settings.lenticules ?? 62}
              parallax={meta.settings.parallax ?? 1.15}
              blend={meta.settings.blend ?? 0.14}
              sheen={meta.settings.sheen ?? 0.62}
            />
          </Slab>
        </motion.div>

        <AnimatePresence mode="wait">
          {!opened ? (
            <motion.div
              key="sealed"
              className="greeting-copy"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <h1 className="sealed-tease">{teaseFor(occasion, from)}</h1>
              <p className="sealed-sub">
                It is sealed in its case. Take it out and it changes as you tilt it.
              </p>
              <button className="btn btn-holo btn-lg" onClick={() => setOpened(true)}>
                Open this card
                <span className="btn-well">
                  <ArrowUpRight size={14} weight="bold" />
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="open"
              className="greeting-copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
            >
              {meta.note && (
                <blockquote className="greeting-note">
                  {meta.note}
                  {from && <cite>— {from}</cite>}
                </blockquote>
              )}

              <div className="greeting-actions">
                {touch && (
                  <button
                    className="btn btn-outline"
                    onClick={() => void cardRef.current?.enableGyro()}
                  >
                    <DeviceMobileCamera size={15} weight="light" />
                    Tilt your phone
                  </button>
                )}
                <button className="btn btn-holo btn-lg" onClick={() => onMakeOne(from)}>
                  {from ? `Send one back to ${from}` : 'Make one of your own'}
                  <span className="btn-well">
                    <ArrowUpRight size={14} weight="bold" />
                  </span>
                </button>
              </div>

              <p className="greeting-foot">Made with lenticard. It takes about a minute.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
