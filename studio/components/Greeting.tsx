import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, ArrowsClockwise, DeviceMobileCamera, HandTap } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { LenticularCardHandle } from '../../src/react/LenticularCard';
import { CardReverse, TradingCard } from './TradingCard';
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
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);
  const { meta } = payload;
  const secret = meta.secret?.trim();
  const hasSecret = Boolean(secret);
  const occasion = findOccasion(meta.occasion);
  // The printing is not baked into the frames, so it is rebuilt from the theme
  // the sender chose and whatever they retitled it to.
  const cardTheme = findTheme(meta.theme);
  const cardCopy = { ...copyFor(cardTheme), title: meta.caption || copyFor(cardTheme).title };

  /**
   * Object URLs are owned here and revoked when the greeting goes away.
   *
   * Made and unmade by the same effect, which is the load-bearing part. They
   * used to be memoised and revoked by a separate cleanup, and under React's
   * development double-invoke that cleanup ran once on the simulated unmount —
   * revoking every URL — while the memo, which survives it, handed the same
   * dead URLs back on the remount. The card then arrived as three broken
   * images and the message on the back was never reached.
   */
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    const urls = framesToUrls(payload.frames);
    setFrames(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [payload.frames]);

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
        {/* The card itself is the control.
            Sealed, a tap takes it out of the case. Out of the case and with
            something written on the back, a tap turns it over. Reaching for
            the card is what anybody does first, and until now it did nothing
            at all — the only way through was a button underneath it. The
            button stays, for keyboards and for anyone who does not think to
            try, but it is no longer the only door. */}
        <motion.div
          className="greeting-card"
          data-orientation={meta.settings.orientation ?? 'auto'}
          data-live={!opened || hasSecret}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: EASE }}
          role={!opened || hasSecret ? 'button' : undefined}
          tabIndex={!opened || hasSecret ? 0 : undefined}
          aria-label={
            !opened
              ? 'Take the card out of its case'
              : hasSecret
                ? flipped
                  ? 'Turn the card back to the front'
                  : 'Turn the card over to read the message on the back'
                : undefined
          }
          onClick={() => {
            if (!opened) setOpened(true);
            else if (hasSecret) setFlipped((f) => !f);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (!opened) setOpened(true);
            else if (hasSecret) setFlipped((f) => !f);
          }}
        >
          <Slab
            encased={!opened}
            label={meta.caption || (from ? `From ${from}` : 'A card for you')}
            sublabel={from ? `Sent by ${from}` : occasion.label}
            serial={`LC-${String(frames.length * 137).padStart(7, '0')}`}
            kind={(meta.caseKind as never) ?? 'slab'}
            onAngle={(x, y) => cardRef.current?.setAngle(x, y)}
            flipped={flipped}
            reverse={
              hasSecret ? (
                <CardReverse
                  secret={secret!}
                  from={meta.secretFrom ?? from}
                  theme={cardTheme}
                  title={cardCopy.title}
                />
              ) : undefined
            }
          >
            <TradingCard
              ref={cardRef}
              photos={frames}
              theme={cardTheme}
              copy={cardCopy}
              layout={(meta.layout as never) ?? "fullart"}
              lenticules={meta.settings.lenticules ?? 62}
              parallax={meta.settings.parallax ?? 1.15}
              blend={meta.settings.blend ?? 0.14}
              sheen={meta.settings.sheen ?? 0.62}
            />
          </Slab>

          {/* The nudge. Only ever shown when there is somewhere to go, and it
              leaves the moment the card has been taken there. */}
          <AnimatePresence>
            {(!opened || (hasSecret && !flipped)) && (
              <motion.span
                className="tap-cue"
                key={opened ? 'flip' : 'open'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease: EASE, delay: opened ? 1.1 : 0.9 }}
                aria-hidden
              >
                {opened ? (
                  <>
                    <ArrowsClockwise size={14} weight="bold" />
                    Turn it over
                  </>
                ) : (
                  <>
                    <HandTap size={14} weight="bold" />
                    Tap the card
                  </>
                )}
              </motion.span>
            )}
          </AnimatePresence>
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
                It is sealed in its case. Tap the card to take it out — it changes as
                you tilt it{hasSecret ? ', and there is something written on the back' : ''}.
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

              {/* The second half of the gift. It is announced only once the
                  card is out of the case, because that is the order the thing
                  actually happens in: out, then over. */}
              {hasSecret && (
                <div className="reverse-call" data-open={flipped}>
                  <p>
                    {flipped
                      ? 'That is the back of the card. Tilt it and the words move.'
                      : `${from || 'They'} wrote something on the back of this one.`}
                  </p>
                  <button
                    className="btn btn-outline"
                    onClick={() => setFlipped((f) => !f)}
                  >
                    <ArrowsClockwise size={15} weight="bold" />
                    {flipped ? 'Back to the front' : 'Turn it over'}
                  </button>
                </div>
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
