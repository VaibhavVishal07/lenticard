import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Images,
  PaperPlaneTilt,
  Sparkle,
  TextAa,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LenticularCardHandle } from '../src/react/LenticularCard';
import { Slider } from './components/Controls';
import { Dock } from './components/Dock';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { Greeting } from './components/Greeting';
import { SendPanel } from './components/SendPanel';
import { CardStack, type StackEntry } from './components/CardStack';
import { CASE_TEXTURES, CASE_TINTS, Slab, type CaseTexture } from './components/Slab';
import { TradingCard } from './components/TradingCard';
import { buildDefaultCard } from './lib/default-card';
import { INITIAL, type CardSettings } from './lib/presets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import {
  copyFor,
  DEFAULT_TEMPLATE,
  DEFAULT_THEME,
  findTheme,
  TEMPLATES,
  THEMES,
  type CardCopy,
  type CardLayout,
  type CardTheme,
} from './lib/themes';

const EASE = [0.32, 0.72, 0, 1] as const;

type Stage = 'home' | 'make' | 'send';
type Step = 'photos' | 'design' | 'words';

const STEPS = [
  { id: 'photos' as const, label: 'Photos', Icon: Images },
  { id: 'design' as const, label: 'Design', Icon: Sparkle },
  { id: 'words' as const, label: 'Words', Icon: TextAa },
];

/** The template strip, shared by the home page and the design step. */
function TemplateStrip({
  value,
  onPick,
}: {
  value: CardLayout;
  onPick: (id: CardLayout) => void;
}) {
  return (
    <div className="strip-row">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          className="mini"
          data-tpl={t.id}
          aria-pressed={t.id === value}
          title={t.hint}
          style={{ ['--m1' as string]: t.swatch[0], ['--m2' as string]: t.swatch[1] }}
          onClick={() => onPick(t.id)}
        >
          <span className="mini-face" aria-hidden />
          <span className="mini-name">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [photos, setPhotos] = useState<Frame[]>([]);
  const [cardTheme, setCardTheme] = useState<CardTheme>(DEFAULT_THEME);
  const [copy, setCopy] = useState<CardCopy>(() => copyFor(DEFAULT_THEME));
  const [layout, setLayout] = useState<CardLayout>(DEFAULT_TEMPLATE.id);
  const [settings, setSettings] = useState<CardSettings>(INITIAL);

  const [caseTint, setCaseTint] = useState(CASE_TINTS[0].value);
  const [caseTexture, setCaseTexture] = useState<CaseTexture>('clear');

  const [stage, setStage] = useState<Stage>('home');
  const [step, setStep] = useState<Step>('photos');
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [received, setReceived] = useState<SharePayload | null>(null);
  const [checking, setChecking] = useState(hasCardInLocation());
  const [note, setNote] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [held, setHeld] = useState(false);
  /** The L1 → L2 pull: the column recedes, then one case rises out of the box. */
  const [leaving, setLeaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const cardRef = useRef<LenticularCardHandle>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';

    // ?card=470 sizes the home column, so a size can be tried and shared
    // without a rebuild. Anything that is not a plain length is ignored —
    // this writes straight into a custom property.
    const want = new URLSearchParams(window.location.search).get('card');
    if (want && /^[0-9]{2,4}(px|rem|vw)?$/.test(want)) {
      const size = /^[0-9]+$/.test(want) ? want + 'px' : want;
      document.documentElement.style.setProperty('--stack-card', size);
    }

    const timer = window.setTimeout(() => setHeld(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  const notify = useCallback((message: string) => {
    setNote(message);
    window.setTimeout(() => setNote(null), 3400);
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

  // The column beside the pitch: one real card, the rest waiting for art.
  /**
   * The column is the range, not a queue of one card.
   *
   * Four slabs, one per template, so the variations are on the page instead of
   * behind a picker you have to open first. Only the one under the pointer is
   * a live lens — browsers cap WebGL contexts at around sixteen and a belt of
   * them would run straight through that.
   */
  const showcase = useMemo<StackEntry[]>(() => {
    const base = import.meta.env.BASE_URL;
    return [
      { id: 's1', still: base + 'cards/astra-1.jpg', name: 'Astra Volt', set: 'STORMBORN', tint: '#2657b8', layout: 'fullart', themeId: 'congrats', real: true },
      { id: 's2', still: base + 'cards/astra-2.jpg', name: 'Yours, Obviously', set: 'HEARTLAND', tint: '#d5352b', layout: 'rookie', themeId: 'valentine' },
      { id: 's3', still: base + 'cards/astra-3.jpg', name: 'Called It', set: 'FIRST PRINT', tint: '#1b1d22', layout: 'chrome', themeId: 'congrats' },
      { id: 's4', still: base + 'cards/astra-1.jpg', name: 'Thirty, Somehow', set: 'ANOTHER YEAR', tint: '#b8912f', layout: 'refractor', themeId: 'birthday' },
    ];
  }, []);
  const ready = photos.length > 0 && !checking && held;

  const serial = useMemo(() => {
    const seed = photos.reduce((a, p) => a + p.width * 31 + p.height * 17, photos.length);
    return `LC-${String(seed % 10000000).padStart(7, '0')}`;
  }, [photos]);

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

  /**
   * Entering the maker.
   *
   * Two beats rather than a cut: the column and the pitch drop back, and only
   * then does a single case rise out of the box the column was sitting in.
   * Swapping the stage on the click made the whole page blink.
   */
  const openMaker = useCallback(() => {
    setLeaving(true);
    setPulling(true);
    window.setTimeout(() => {
      setLeaving(false);
      setStage('make');
    }, 250);
  }, []);

  const pickTheme = useCallback((next: CardTheme) => {
    setCardTheme(next);
    setCopy(copyFor(next));
  }, []);

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
      <main className="stage" data-stage={stage} data-leaving={leaving}>
        {/* One card, mounted once, for every stage. Re-parenting it between
            layouts tore down the WebGL context and rebuilt it, which is what
            produced the jolt on entering the maker. It lives here now and the
            page moves around it. */}
        {stage === 'home' && (
          <div className="stage-stack">
            <CardStack
              entries={showcase}
              onAngle={onAngle}
              render={(entry, isLive) => {
                const entryTheme = findTheme(entry.themeId);
                return (
                  <TradingCard
                    ref={isLive ? cardRef : undefined}
                    photos={images}
                    still={isLive ? undefined : entry.still}
                    theme={entryTheme}
                    copy={copyFor(entryTheme)}
                    layout={entry.layout}
                    lenticules={settings.lenticules}
                    parallax={settings.parallax}
                    blend={settings.blend}
                    sheen={settings.sheen}
                  />
                );
              }}
            />
          </div>
        )}

        {stage !== 'home' && (
        <div className="stage-case">
          {/* The box the case comes out of. It sits in front of the lower half
              of the slab, so the slab reads as rising from inside it, then
              drops away. Only ever shown on the way in from the home page. */}
          {pulling && (
            <motion.span
              className="case-box"
              aria-hidden
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: '52%', opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.52, ease: EASE }}
              onAnimationComplete={() => setPulling(false)}
            />
          )}
          <motion.div
            className="case-lift"
            initial={pulling ? { y: '34%', scale: 0.82, rotateX: 22, opacity: 0 } : false}
            animate={{ y: 0, scale: 1, rotateX: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 116, damping: 19, mass: 0.9 }}
          >
          <Slab
            encased
            label={copy.title}
            sublabel={`${cardTheme.label.toUpperCase()} · LENTICARD`}
            serial={serial}
            tint={caseTint}
            texture={caseTexture}
            onAngle={onAngle}
          >
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
          </Slab>
          </motion.div>
        </div>
        )}

        <div className="stage-side">
            {stage === 'home' && (
              <motion.div
                key="home"
                className="pitch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: ready ? 1 : 0, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <span className="mark mark-hero">
                  <span className="mark-chip" aria-hidden />
                  lenticard
                </span>
                <h1>
                  Your own <em>lenticular</em> trading card
                </h1>
                <p className="lede">
                  Three of your photos, printed as one card that changes when it
                  moves, sealed in a case with your name on the label.
                </p>

                <button
                  className="btn btn-holo btn-xl"
                  onClick={openMaker}
                >
                  Make yours
                  <span className="btn-well">
                    <ArrowUpRight size={14} weight="bold" />
                  </span>
                </button>

                <p className="hint">One minute. No account.</p>
              </motion.div>
            )}

            {stage === 'make' && (
              <motion.div
                key="make"
                className="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <nav className="steps" aria-label="Steps">
                  {STEPS.map((s, i) => (
                    <button
                      key={s.id}
                      className="step-tab"
                      aria-pressed={step === s.id}
                      onClick={() => setStep(s.id)}
                    >
                      <span className="step-n">{i + 1}</span>
                      <s.Icon size={15} weight="light" />
                      {s.label}
                    </button>
                  ))}
                </nav>

                {step === 'photos' && (
                  <section className="step-body">
                    <div className="step-head">
                      <h2>Your photos</h2>
                      <p>Two or three works best. The first shows at full left tilt.</p>
                    </div>
                    <Frames
                      frames={photos}
                      onChange={setPhotos}
                      onAdd={(files) => void addFiles(files)}
                      onError={notify}
                    />
                  </section>
                )}

                {step === 'design' && (
                  <section className="step-body">
                    <div className="step-head">
                      <h2>Design</h2>
                      <p>The template sets the frame. The occasion sets the words.</p>
                    </div>

                    <div className="field">
                      <span className="field-label">Template</span>
                      <TemplateStrip value={layout} onPick={setLayout} />
                    </div>

                    <div className="field">
                      <span className="field-label">Occasion</span>
                      <div className="choices">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            className="choice"
                            aria-pressed={t.id === cardTheme.id}
                            onClick={() => pickTheme(t)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <span className="field-label">Case</span>
                      <div className="swatches">
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

                    <details className="more">
                      <summary>Lens settings</summary>
                      <Slider
                        label="Shift"
                        value={settings.parallax}
                        min={0.4}
                        max={2}
                        step={0.01}
                        decimals={2}
                        onChange={(parallax) => setSettings((s) => ({ ...s, parallax }))}
                      />
                    </details>
                  </section>
                )}

                {step === 'words' && (
                  <section className="step-body">
                    <div className="step-head">
                      <h2>Words</h2>
                      <p>What the card says about whoever it is for.</p>
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="name">Card name</label>
                      <input
                        id="name"
                        className="text-input"
                        value={copy.title}
                        maxLength={22}
                        onChange={(e) => setCopy((c) => ({ ...c, title: e.target.value }))}
                      />
                    </div>

                    <div className="two-up">
                      <div className="field">
                        <label className="field-label" htmlFor="line">Line under it</label>
                        <input
                          id="line"
                          className="text-input"
                          value={copy.stage}
                          maxLength={38}
                          onChange={(e) => setCopy((c) => ({ ...c, stage: e.target.value }))}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="hp">{copy.statLabel}</label>
                        <input
                          id="hp"
                          className="text-input"
                          value={copy.statValue}
                          maxLength={4}
                          onChange={(e) =>
                            setCopy((c) => ({ ...c, statValue: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {copy.moves.map((m, i) => (
                      <div className="two-up" key={i}>
                        <div className="field">
                          <label className="field-label">Move {i + 1}</label>
                          <input
                            className="text-input"
                            value={m.name}
                            maxLength={20}
                            aria-label={`Move ${i + 1}`}
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
                            value={m.value}
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
                    ))}

                    <div className="field">
                      <label className="field-label" htmlFor="flavour">Flavour line</label>
                      <textarea
                        id="flavour"
                        className="text-input"
                        rows={2}
                        maxLength={100}
                        value={copy.flavour}
                        onChange={(e) => setCopy((c) => ({ ...c, flavour: e.target.value }))}
                      />
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {stage === 'send' && (
              <motion.div
                key="send"
                className="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <SendPanel
                  images={images}
                  settings={settings}
                  title={copy.title}
                  themeId={cardTheme.id}
                  layout={layout}
                  tint={caseTint}
                  texture={caseTexture}
                  replyTo={replyTo}
                  onError={notify}
                />
              </motion.div>
            )}
        </div>

        {!ready && (
          <div className="loading">
            <span className="mark mark-lg">
              <span className="mark-chip" aria-hidden />
              lenticard
            </span>
            <span className="loading-bar" aria-hidden>
              <span />
            </span>
          </div>
        )}
      </main>

      {ready && stage !== 'home' && (
        <Dock>
          <>
              <button
                className="btn"
                onClick={() => {
                  setStage(stage === 'send' ? 'make' : 'home');
                }}
              >
                <ArrowLeft size={15} weight="light" />
                Back
              </button>
              {stage === 'make' && (
                <button
                  className="btn btn-white btn-wide"
                  disabled={photos.length < 2}
                  onClick={() => setStage('send')}
                >
                  <PaperPlaneTilt size={16} weight="bold" />
                  Seal and send
                </button>
              )}
          </>
        </Dock>
      )}

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
