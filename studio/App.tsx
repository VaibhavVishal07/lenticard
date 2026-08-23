import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, PaperPlaneTilt, Plus } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../src/react/LenticularCard';
import { Slider } from './components/Controls';
import { Dock } from './components/Dock';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { GiftDialog } from './components/GiftDialog';
import { Greeting } from './components/Greeting';
import { CASE_TEXTURES, CASE_TINTS, Slab, type CaseTexture } from './components/Slab';
import { buildDefaultCard } from './lib/default-card';
import { FIXED, INITIAL, type CardSettings } from './lib/presets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import { useTheme } from './lib/theme';
import {
  composeCard,
  copyFor,
  DEFAULT_THEME,
  LAYOUTS,
  THEMES,
  type CardCopy,
  type CardLayout,
  type CardTheme,
} from './lib/themes';

const EASE = [0.32, 0.72, 0, 1] as const;

type Stage = 'home' | 'make';

export default function App() {
  const { theme, setTheme } = useTheme();

  // Photos are what the user brings; frames are the finished trading cards
  // composed around them. The card renders the frames, the list shows the photos.
  const [photos, setPhotos] = useState<Frame[]>([]);
  const [frames, setFrames] = useState<string[]>([]);
  const [cardTheme, setCardTheme] = useState<CardTheme>(DEFAULT_THEME);
  const [copy, setCopy] = useState<CardCopy>(() => copyFor(DEFAULT_THEME));
  const [layout, setLayout] = useState<CardLayout>('trading');
  const [settings, setSettings] = useState<CardSettings>(INITIAL);

  // The case is part of the gift, so it is part of what you design.
  const [caseTint, setCaseTint] = useState(CASE_TINTS[1].value);
  const [caseTexture, setCaseTexture] = useState<CaseTexture>('clear');
  const [caseLabel, setCaseLabel] = useState('');

  const [stage, setStage] = useState<Stage>('home');
  const [encased, setEncased] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [received, setReceived] = useState<SharePayload | null>(null);
  const [checking, setChecking] = useState(hasCardInLocation());
  const [note, setNote] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [held, setHeld] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeld(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  // The room takes its colour from wherever the card is being looked at.
  // Written straight to the root: no React re-render, and the browser
  // composites the wash on its own.
  useEffect(() => {
    const root = document.documentElement;
    const onMove = (event: PointerEvent) => {
      root.style.setProperty('--px', ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      root.style.setProperty('--wash-on', '1');
    };
    const onLeave = () => root.style.setProperty('--wash-on', '0');
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
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

  // Stand-in photography, so the card on the home page is a real card.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const art = buildDefaultCard();
      const loaded = await Promise.all(
        art.map((url, i) => frameFromDataUrl(url, `photo-${i + 1}.jpg`)),
      );
      if (!cancelled) setPhotos(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-compose whenever the art or the printing changes — never on a lens dial,
  // which would redraw three full cards for a slider tick.
  useEffect(() => {
    if (!photos.length) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void composeCard(photos.map((p) => p.url), cardTheme, copy, layout)
        .then((next) => !cancelled && setFrames(next))
        .catch((error) => !cancelled && notify((error as Error).message));
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [photos, cardTheme, copy, layout, notify]);

  const ready = frames.length > 0 && !checking && held;

  const serial = useMemo(() => {
    const seed = photos.reduce((acc, p) => acc + p.width * 31 + p.height * 17, photos.length);
    return `LC-${String(seed % 100000).padStart(5, '0')}`;
  }, [photos]);

  const addFiles = useCallback(
    async (files: File[]) => {
      try {
        const added = await framesFromFiles(files);
        // The first upload replaces the stand-in photos rather than joining them.
        setPhotos((current) => (own ? [...current, ...added] : added));
        setOwn(true);
      } catch (error) {
        notify((error as Error).message);
      }
    },
    [own, notify],
  );

  const pickTheme = useCallback((next: CardTheme) => {
    setCardTheme(next);
    // Switching theme rewrites the printing too — that is the point of a theme.
    setCopy(copyFor(next));
  }, []);

  /** Slide the card out of its case, then open the maker behind it. */
  const lift = useCallback(() => {
    setEncased(false);
    window.setTimeout(() => setStage('make'), 380);
  }, []);

  /** Put it back in the case, then hand it over. */
  const seal = useCallback(() => {
    setEncased(true);
    window.setTimeout(() => setGiftOpen(true), 640);
  }, []);

  if (received) {
    return (
      <Greeting
        payload={received}
        onMakeOne={(name) => {
          setReplyTo(name);
          setReceived(null);
          setStage('make');
          setEncased(false);
          clearLocation();
        }}
      />
    );
  }

  return (
    <>
      <div className="wash" aria-hidden />

      <main className="stage">
        <motion.div
          className="card-slot"
          initial={{ opacity: 0, y: 34, scale: 0.96 }}
          animate={{ opacity: frames.length ? 1 : 0, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <Slab
            encased={encased}
            label={caseLabel || copy.title}
            sublabel={`${cardTheme.label} · ${photos.length}-frame lenticular`}
            serial={serial}
            tint={caseTint}
            texture={caseTexture}
          >
            <LenticularCard
              ref={cardRef}
              images={frames}
              axis="vertical"
              orientation={settings.orientation}
              lenticules={settings.lenticules}
              parallax={settings.parallax}
              blend={settings.blend}
              sheen={settings.sheen}
              motion={ready ? settings.motion : 'auto'}
              {...FIXED}
              onError={(error) => notify(error.message)}
            />
          </Slab>
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
                Make your own <em>holographic</em> trading card
              </h1>
              <p>
                Your photos, graded and slabbed. Send the whole case to a friend.
              </p>

              {/* Sampler: the fastest way to understand the product is to see
                  the same card printed four different ways. */}
              <div className="sampler" role="group" aria-label="Card type">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    className="sample"
                    aria-pressed={item.id === cardTheme.id}
                    style={{ ['--sample' as string]: item.accent }}
                    onClick={() => pickTheme(item)}
                  >
                    <span className="sample-glyph" aria-hidden>{item.glyph}</span>
                    {item.label}
                  </button>
                ))}
              </div>
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
              <div className="field">
                <span className="field-label">Card style</span>
                <div className="choices">
                  {LAYOUTS.map((item) => (
                    <button
                      key={item.id}
                      className="choice"
                      title={item.hint}
                      aria-pressed={item.id === layout}
                      onClick={() => setLayout(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field-label">Occasion</span>
                <div className="choices">
                  {THEMES.map((item) => (
                    <button
                      key={item.id}
                      className="choice"
                      aria-pressed={item.id === cardTheme.id}
                      onClick={() => pickTheme(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <Frames
                frames={photos}
                onChange={setPhotos}
                onAdd={(files) => void addFiles(files)}
                onError={notify}
              />

              <div className="field">
                <label className="field-label" htmlFor="title">Card name</label>
                <input
                  id="title"
                  className="text-input"
                  value={copy.title}
                  maxLength={26}
                  onChange={(e) => setCopy((c) => ({ ...c, title: e.target.value }))}
                />
              </div>

              <div className="attr-grid">
                {copy.attributes.map((attr, i) => (
                  <div className="field" key={i}>
                    <span className="field-label">Attribute {i + 1}</span>
                    <input
                      className="text-input"
                      value={attr.label}
                      maxLength={18}
                      aria-label={`Attribute ${i + 1} name`}
                      onChange={(e) =>
                        setCopy((c) => {
                          const next = [...c.attributes] as CardCopy['attributes'];
                          next[i] = { ...next[i], label: e.target.value };
                          return { ...c, attributes: next };
                        })
                      }
                    />
                    <input
                      className="text-input"
                      value={attr.value}
                      maxLength={12}
                      aria-label={`Attribute ${i + 1} value`}
                      onChange={(e) =>
                        setCopy((c) => {
                          const next = [...c.attributes] as CardCopy['attributes'];
                          next[i] = { ...next[i], value: e.target.value };
                          return { ...c, attributes: next };
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="flavour">Flavour line</label>
                <textarea
                  id="flavour"
                  className="text-input"
                  rows={2}
                  maxLength={110}
                  value={copy.flavour}
                  onChange={(e) => setCopy((c) => ({ ...c, flavour: e.target.value }))}
                />
              </div>

              <div className="case-panel">
                <span className="field-label">The case</span>

                <input
                  className="text-input"
                  value={caseLabel}
                  maxLength={28}
                  placeholder={copy.title}
                  aria-label="Text printed on the case"
                  onChange={(e) => setCaseLabel(e.target.value)}
                />

                <div className="swatches" role="group" aria-label="Case colour">
                  {CASE_TINTS.map((t) => (
                    <button
                      key={t.id}
                      className="swatch"
                      style={{ ['--sw' as string]: t.value }}
                      aria-label={t.label}
                      aria-pressed={t.value === caseTint}
                      onClick={() => setCaseTint(t.value)}
                    />
                  ))}
                </div>

                <div className="choices">
                  {CASE_TEXTURES.map((t) => (
                    <button
                      key={t.id}
                      className="choice"
                      aria-pressed={t.id === caseTexture}
                      onClick={() => setCaseTexture(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dials">
                <Slider
                  label="Ridges"
                  value={settings.lenticules}
                  min={24}
                  max={200}
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
            <button className="btn btn-holo" onClick={lift}>
              <Plus size={15} weight="bold" />
              Make yours
            </button>
          ) : (
            <>
              <button
                className="btn"
                onClick={() => {
                  setStage('home');
                  setEncased(true);
                }}
              >
                <ArrowLeft size={15} weight="light" />
                Back
              </button>
              <button className="btn btn-holo" onClick={seal} disabled={photos.length < 2}>
                <PaperPlaneTilt size={15} weight="bold" />
                Send the case
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
        images={frames}
        settings={settings}
        caption={copy.title}
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
