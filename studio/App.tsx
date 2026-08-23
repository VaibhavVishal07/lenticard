import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, PaperPlaneTilt, Plus } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LenticularCardHandle } from '../src/react/LenticularCard';
import { Slider } from './components/Controls';
import { Dock } from './components/Dock';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { GiftDialog } from './components/GiftDialog';
import { Greeting } from './components/Greeting';
import { CASE_TEXTURES, CASE_TINTS, Slab, type CaseTexture } from './components/Slab';
import { TradingCard } from './components/TradingCard';
import { buildDefaultCard } from './lib/default-card';
import { INITIAL, type CardSettings } from './lib/presets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import { useTheme } from './lib/theme';
import {
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

  const [photos, setPhotos] = useState<Frame[]>([]);
  const [cardTheme, setCardTheme] = useState<CardTheme>(DEFAULT_THEME);
  const [copy, setCopy] = useState<CardCopy>(() => copyFor(DEFAULT_THEME));
  const [layout, setLayout] = useState<CardLayout>('trading');
  const [settings, setSettings] = useState<CardSettings>(INITIAL);

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
    const timer = window.setTimeout(() => setHeld(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const notify = useCallback((message: string) => {
    setNote(message);
    window.setTimeout(() => setNote(null), 3200);
  }, []);

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

  const images = useMemo(() => photos.map((p) => p.url), [photos]);
  const ready = photos.length > 0 && !checking && held;

  /** Printed on the case. Stable for a given set of photos. */
  const serial = useMemo(() => {
    const seed = photos.reduce((acc, p) => acc + p.width * 31 + p.height * 17, photos.length);
    return `LC-${String(seed % 10000000).padStart(7, '0')}`;
  }, [photos]);

  // One pointer source drives the whole assembly: the case turns, and the same
  // angle picks which frame the lens shows. Nothing moves on its own.
  const onAngle = useCallback((x: number, y: number) => {
    cardRef.current?.setAngle(x, y);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      try {
        const added = await framesFromFiles(files);
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
    setCopy(copyFor(next));
  }, []);

  const lift = useCallback(() => {
    setEncased(false);
    window.setTimeout(() => setStage('make'), 520);
  }, []);

  const seal = useCallback(() => {
    setEncased(true);
    window.setTimeout(() => setGiftOpen(true), 760);
  }, []);

  const card = (
    <TradingCard
      ref={cardRef}
      photos={images}
      theme={cardTheme}
      copy={copy}
      layout={layout}
      lenticules={settings.lenticules}
      parallax={settings.parallax}
      blend={settings.blend}
      sheen={settings.sheen}
      onError={(error) => notify(error.message)}
    />
  );

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
      <div className="wash" aria-hidden>
        <span className="wash-a" />
        <span className="wash-b" />
      </div>

      <main className="stage" data-stage={stage}>
        {stage === 'home' ? (
          <div className="home">
            <motion.div
              className="home-copy"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 26 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <p className="kicker">
                <span className="kicker-dot" aria-hidden />
                Graded, slabbed, one of one
              </p>
              <h1>
                Make your own
                <br />
                <em>holographic</em>
                <br />
                trading card
              </h1>
              <p className="lede">
                Three of your photos, printed as one card that changes when it moves.
                Sealed in a case with your name on the label, and sent to whoever
                should have it.
              </p>

              <div className="picker" role="group" aria-label="Card type">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    className="pick"
                    aria-pressed={item.id === cardTheme.id}
                    style={{ ['--pick' as string]: item.accent }}
                    onClick={() => pickTheme(item)}
                  >
                    <span className="pick-glyph" aria-hidden>{item.glyph}</span>
                    <span className="pick-body">
                      <span className="pick-label">{item.label}</span>
                      <span className="pick-badge">{item.badge}</span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="home-case"
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: photos.length ? 1 : 0, y: 0, scale: 1 }}
              transition={{ duration: 1, ease: EASE }}
            >
              <Slab
                encased={encased}
                label={caseLabel || copy.title}
                sublabel={`${cardTheme.label} · ${photos.length}-frame lenticular`}
                serial={serial}
                tint={caseTint}
                texture={caseTexture}
                onAngle={onAngle}
              >
                {card}
              </Slab>
            </motion.div>
          </div>
        ) : (
          <div className="make">
            <div className="make-card">
              <Slab
                encased={encased}
                label={caseLabel || copy.title}
                sublabel={`${cardTheme.label} · ${photos.length}-frame lenticular`}
                serial={serial}
                tint={caseTint}
                texture={caseTexture}
                onAngle={onAngle}
              >
                {card}
              </Slab>
            </div>

            <div className="make-panel">
              <section className="panel-block">
                <h2>Style</h2>
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
              </section>

              <section className="panel-block">
                <h2>Photos</h2>
                <Frames
                  frames={photos}
                  onChange={setPhotos}
                  onAdd={(files) => void addFiles(files)}
                  onError={notify}
                />
              </section>

              <section className="panel-block">
                <h2>Printing</h2>
                <div className="field">
                  <label className="field-label" htmlFor="title">Name</label>
                  <input
                    id="title"
                    className="text-input"
                    value={copy.title}
                    maxLength={24}
                    onChange={(e) => setCopy((c) => ({ ...c, title: e.target.value }))}
                  />
                </div>
                <div className="two-up">
                  <div className="field">
                    <label className="field-label" htmlFor="stage-line">Stage line</label>
                    <input
                      id="stage-line"
                      className="text-input"
                      value={copy.stage}
                      maxLength={40}
                      onChange={(e) => setCopy((c) => ({ ...c, stage: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="stat">{copy.statLabel}</label>
                    <input
                      id="stat"
                      className="text-input"
                      value={copy.statValue}
                      maxLength={5}
                      onChange={(e) => setCopy((c) => ({ ...c, statValue: e.target.value }))}
                    />
                  </div>
                </div>

                {copy.moves.map((move, i) => (
                  <div className="move-edit" key={i}>
                    <div className="two-up">
                      <div className="field">
                        <label className="field-label">Move {i + 1}</label>
                        <input
                          className="text-input"
                          value={move.name}
                          maxLength={22}
                          aria-label={`Move ${i + 1} name`}
                          onChange={(e) =>
                            setCopy((c) => {
                              const moves = [...c.moves] as CardCopy['moves'];
                              moves[i] = { ...moves[i], name: e.target.value };
                              return { ...c, moves };
                            })
                          }
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Value</label>
                        <input
                          className="text-input"
                          value={move.value}
                          maxLength={4}
                          aria-label={`Move ${i + 1} value`}
                          onChange={(e) =>
                            setCopy((c) => {
                              const moves = [...c.moves] as CardCopy['moves'];
                              moves[i] = { ...moves[i], value: e.target.value };
                              return { ...c, moves };
                            })
                          }
                        />
                      </div>
                    </div>
                    <input
                      className="text-input"
                      value={move.text}
                      maxLength={64}
                      aria-label={`Move ${i + 1} text`}
                      onChange={(e) =>
                        setCopy((c) => {
                          const moves = [...c.moves] as CardCopy['moves'];
                          moves[i] = { ...moves[i], text: e.target.value };
                          return { ...c, moves };
                        })
                      }
                    />
                  </div>
                ))}

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
              </section>

              <section className="panel-block">
                <h2>The case</h2>
                <input
                  className="text-input"
                  value={caseLabel}
                  maxLength={26}
                  placeholder={copy.title}
                  aria-label="Text printed on the case"
                  onChange={(e) => setCaseLabel(e.target.value)}
                />
                <div className="swatches" role="group" aria-label="Label stock">
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
              </section>

              <section className="panel-block">
                <h2>The lens</h2>
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
              </section>
            </div>
          </div>
        )}

        {!ready && (
          <div className="loading">
            <span className="mark mark-lg">
              <span className="mark-chip" aria-hidden />
              lenticard
            </span>
            <span className="loading-bar" aria-hidden><span /></span>
          </div>
        )}
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
                Seal and send
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
