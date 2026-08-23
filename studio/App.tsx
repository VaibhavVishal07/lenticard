import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, PaperPlaneTilt, Plus } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../src/react/LenticularCard';
import { Slider } from './components/Controls';
import { Dock } from './components/Dock';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { GiftDialog } from './components/GiftDialog';
import { Greeting } from './components/Greeting';
import { buildDefaultCard } from './lib/default-card';
import { FIXED, INITIAL, type CardSettings } from './lib/presets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import { useTheme } from './lib/theme';

const EASE = [0.32, 0.72, 0, 1] as const;

type Stage = 'home' | 'make';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [settings, setSettings] = useState<CardSettings>(INITIAL);
  const [stage, setStage] = useState<Stage>('home');
  const [giftOpen, setGiftOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [received, setReceived] = useState<SharePayload | null>(null);
  const [checking, setChecking] = useState(hasCardInLocation());
  const [note, setNote] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  // The frames are drawn on a canvas in about a frame, so without a floor the
  // loading state would flash past unread. It is held long enough to watch the
  // card turn over once.
  const [held, setHeld] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeld(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const notify = useCallback((message: string) => {
    setNote(message);
    window.setTimeout(() => setNote(null), 3200);
  }, []);

  // A card in the URL means this visit is a delivery, not a session.
  useEffect(() => {
    if (!hasCardInLocation()) return;
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await loadFromLocation();
        if (!cancelled && bytes) setReceived(decodePayload(bytes));
      } catch (error) {
        if (!cancelled) notify((error as Error).message);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  // The card is on screen from the first paint and the copy waits for it. That
  // is the whole loading state: the thing you came to see, loading itself.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const art = buildDefaultCard();
      const loaded = await Promise.all(
        art.map((url, i) => frameFromDataUrl(url, `frame-${i + 1}.jpg`)),
      );
      if (!cancelled) setFrames(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const images = useMemo(() => frames.map((frame) => frame.url), [frames]);
  const ready = frames.length > 0 && !checking && held;

  const addFiles = useCallback(
    async (files: File[]) => {
      try {
        const added = await framesFromFiles(files);
        // The first upload replaces the demo card rather than joining it.
        setFrames((current) => (own ? [...current, ...added] : added));
        setOwn(true);
      } catch (error) {
        notify((error as Error).message);
      }
    },
    [own, notify],
  );

  if (received) {
    return (
      <Greeting
        payload={received}
        onMakeOne={(name) => {
          setReplyTo(name);
          setReceived(null);
          setStage('make');
          clearLocation();
        }}
      />
    );
  }

  return (
    <>
      <main className="stage">
        <motion.div
          className="card-slot"
          initial={{ opacity: 0, y: 34, scale: 0.96 }}
          animate={{ opacity: frames.length ? 1 : 0, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <LenticularCard
            ref={cardRef}
            images={images}
            orientation={settings.orientation}
            lenticules={settings.lenticules}
            parallax={settings.parallax}
            blend={settings.blend}
            sheen={settings.sheen}
            motion={ready ? settings.motion : 'auto'}
            {...FIXED}
            onError={(error) => notify(error.message)}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {!ready ? (
            <motion.div key="loading" className="loading" exit={{ opacity: 0 }}>
              <span className="mark mark-lg">
                <span className="mark-chip" aria-hidden />
                lenticard
              </span>
              <span className="loading-bar" aria-hidden>
                <span />
              </span>
            </motion.div>
          ) : stage === 'home' ? (
            <motion.div
              key="home"
              className="copy"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <h1>
                A card that <em>changes</em> as you tilt it
              </h1>
              <p>Three photos, one holographic card, yours in a minute.</p>
            </motion.div>
          ) : (
            <motion.div
              key="make"
              className="maker"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <Frames
                frames={frames}
                onChange={setFrames}
                onAdd={(files) => void addFiles(files)}
                onError={notify}
              />
              <div className="dials">
                <Slider
                  label="Ridges"
                  value={settings.lenticules}
                  min={24}
                  max={220}
                  onChange={(lenticules) => setSettings((s) => ({ ...s, lenticules }))}
                />
                <Slider
                  label="Shift"
                  value={settings.parallax}
                  min={0.4}
                  max={2}
                  step={0.01}
                  decimals={2}
                  onChange={(parallax) => setSettings((s) => ({ ...s, parallax }))}
                />
                <Slider
                  label="Shine"
                  value={settings.sheen}
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={2}
                  onChange={(sheen) => setSettings((s) => ({ ...s, sheen }))}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {ready && (
        <Dock theme={theme} onTheme={setTheme}>
          {stage === 'home' ? (
            <button className="btn btn-holo" onClick={() => setStage('make')}>
              <Plus size={15} weight="bold" />
              Make yours
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => setStage('home')}>
                <ArrowLeft size={15} weight="light" />
                Back
              </button>
              <button
                className="btn btn-holo"
                onClick={() => setGiftOpen(true)}
                disabled={frames.length < 2}
              >
                <PaperPlaneTilt size={15} weight="bold" />
                Send it
                <span className="btn-well">
                  <ArrowUpRight size={12} weight="bold" />
                </span>
              </button>
            </>
          )}
        </Dock>
      )}

      <GiftDialog
        open={giftOpen}
        images={images}
        settings={settings}
        caption=""
        replyTo={replyTo}
        onClose={() => setGiftOpen(false)}
        onError={notify}
      />

      <AnimatePresence>
        {note && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: EASE }}
            role="status"
          >
            {note}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
