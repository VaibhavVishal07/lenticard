import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Images,
  PaperPlaneTilt,
  Sparkle,
  TextAa,
  Tray,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_FRAMES } from '../src/core/types';
import type { LenticularCardHandle } from '../src/react/LenticularCard';
import { Dock } from './components/Dock';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { Greeting } from './components/Greeting';
import { SendPanel } from './components/SendPanel';
import { Tuner } from './components/Tuner';
import { CardStack, type StackEntry } from './components/CardStack';
import { CASE_KINDS, Slab, type CaseKind } from './components/Slab';
import { TradingCard } from './components/TradingCard';
import { buildDefaultCard } from './lib/default-card';
import { interlacedViews, type Print } from './lib/interlace';
import { INITIAL, type CardSettings } from './lib/presets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import {
  copyFor,
  DEFAULT_TEMPLATE,
  DEFAULT_THEME,
  findTheme,
  TEMPLATES,
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

/**
 * The template strip.
 *
 * `big` is the design step's reading of it: four miniatures the size of a
 * thumbnail told you a template was called Chrome and nothing about what
 * Chrome is. At card size the miniature is the answer — the border, the
 * window, the plate are all there to be seen — so the label underneath can
 * stop carrying the whole explanation and the hint can come out of the
 * tooltip, where nobody found it.
 */
function TemplateStrip({
  value,
  onPick,
  big = false,
}: {
  value: CardLayout;
  onPick: (id: CardLayout) => void;
  big?: boolean;
}) {
  return (
    <div className={big ? 'strip-row strip-row-big' : 'strip-row'}>
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          className={big ? 'mini mini-big' : 'mini'}
          data-tpl={t.id}
          aria-pressed={t.id === value}
          title={big ? undefined : t.hint}
          style={{ ['--m1' as string]: t.swatch[0], ['--m2' as string]: t.swatch[1] }}
          onClick={() => onPick(t.id)}
        >
          <span className="mini-face" aria-hidden />
          <span className="mini-name">{t.label}</span>
          {big && <span className="mini-hint">{t.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * What the card arrives in.
 *
 * Four words in four pills was the one place in the maker where the thing
 * being chosen was invisible. A graded slab and a soft sleeve are different
 * objects to be handed; drawn at forty pixels they are still different
 * objects, and the word underneath confirms rather than announces.
 */
function CasePicker({
  value,
  onPick,
}: {
  value: CaseKind;
  onPick: (id: CaseKind) => void;
}) {
  return (
    <div className="cases">
      {CASE_KINDS.map((k) => (
        <button
          key={k.id}
          className="case-pick"
          data-case={k.id}
          aria-pressed={k.id === value}
          onClick={() => onPick(k.id)}
        >
          <span className="case-art" aria-hidden />
          <span className="case-name">{k.label}</span>
          <span className="case-hint">{k.hint}</span>
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
  const [settings] = useState<CardSettings>(INITIAL);

  const [caseKind, setCaseKind] = useState<CaseKind>('slab');

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
  /** ?tune puts the home page's proportions on sliders. */
  const [tuning] = useState(() => new URLSearchParams(window.location.search).has('tune'));
  /** Something with files in it is over the window. */
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
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

  /**
   * The card the belt shows, which is not the card you are making.
   *
   * These used to be the same list: the default art was loaded straight into
   * `photos`, so the maker opened with somebody else's card already in the
   * case and your first act was to throw it away. An empty case is the honest
   * opening — it is the thing you are filling, and it fills as you drop.
   *
   * The belt still needs art, because a landing page with an empty card on it
   * is a landing page that shows nothing. So the default card lives here, is
   * drawn once, and never touches `photos`.
   */
  const [demo, setDemo] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const art = buildDefaultCard();
      const loaded = await Promise.all(
        art.map((url, i) => frameFromDataUrl(url, `photo-${i + 1}.jpg`)),
      );
      if (!cancelled) setDemo(loaded.map((f) => f.url));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const images = useMemo(() => photos.map((p) => p.url), [photos]);
  /** What the belt's live slab draws: yours once there is one, the demo until. */
  const beltImages = images.length >= 2 ? images : demo;

  /**
   * The belt's prints, woven once per set.
   *
   * Keyed by the set a case belongs to, so the column can hold more than one
   * subject without every case being handed the same three frames. The card
   * the maker is holding is woven too, so what the belt shows is the print
   * that would actually come out.
   */
  const [woven, setWoven] = useState<Record<string, Print>>({});
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const sets: Record<string, string[]> = {
      astra: beltImages.length >= 2 ? beltImages : [],
      max: [1, 2, 3].map((n) => base + 'cards/max-' + n + '.jpg'),
      chandra: [1, 2, 3].map((n) => base + 'cards/chandra-' + n + '.jpg'),
      dragon: [1, 2, 3].map((n) => base + 'cards/dragon-' + n + '.jpg'),
    };
    let cancelled = false;
    for (const [name, urls] of Object.entries(sets)) {
      if (urls.length < 2) continue;
      void interlacedViews(urls)
        .then((print) => {
          if (!cancelled) setWoven((current) => ({ ...current, [name]: print }));
        })
        .catch(() => {
          /* that set falls back to its plain frame */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [beltImages]);

  /**
   * The column is the range, not a queue of one card.
   *
   * Eight slabs across four templates and four cases, so the variations are on
   * the page instead of behind a picker you have to open first. Exactly one is
   * a live lens — browsers cap WebGL contexts at around sixteen and a belt of
   * them would run straight through that. The rest carry woven prints.
   */
  const showcase = useMemo<StackEntry[]>(() => {
    const base = import.meta.env.BASE_URL;
    return [
      { id: 's1', still: base + 'cards/astra-1.jpg', art: 'astra', name: 'Astra Volt', set: 'FULL BLEED', layout: 'fullart', kind: 'slab', real: true },
      { id: 's2', still: base + 'cards/chandra-1.jpg', art: 'chandra', name: 'Torch Of Defiance', set: 'FULL BLEED', layout: 'fullart', kind: 'toploader' },
      { id: 's3', still: base + 'cards/dragon-1.jpg', art: 'dragon', name: 'Flying 6/6', set: 'CHROME', layout: 'chrome', kind: 'pack' },
      { id: 's4', still: base + 'cards/max-1.jpg', art: 'max', name: 'Verstappen', set: 'ROOKIE', layout: 'rookie', kind: 'sleeve' },
      { id: 's5', still: base + 'cards/chandra-2.jpg', art: 'chandra', name: 'Cast A Spell', set: 'REFRACTOR', layout: 'refractor', kind: 'slab' },
      { id: 's6', still: base + 'cards/dragon-2.jpg', art: 'dragon', name: 'Green Flame', set: 'FULL BLEED', layout: 'fullart', kind: 'toploader' },
      { id: 's7', still: base + 'cards/astra-2.jpg', art: 'astra', name: 'Spare Keys', set: 'ROOKIE', layout: 'rookie', kind: 'pack' },
      { id: 's8', still: base + 'cards/max-2.jpg', art: 'max', name: 'Lights Out', set: 'CHROME', layout: 'chrome', kind: 'sleeve' },
    ];
  }, []);
  const ready = demo.length > 0 && !checking && held;

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

  /**
   * The template carries the palette. Words are never rewritten by it — that
   * was the old occasion behaviour, and it threw away whatever you had typed.
   */
  const pickLayout = useCallback((next: CardLayout) => {
    setLayout(next);
    setCardTheme(findTheme(next));
  }, []);

  /**
   * Photos dropped anywhere on the window.
   *
   * The dropzone was a box in the middle of one step, so a photo let go two
   * inches to its left went to the browser instead — which navigates to the
   * file and takes the card you were making with it. There is no way to get it
   * back, and nothing on the page ever said the target was that small.
   *
   * So the window takes the drop, wherever it lands: on the home page it makes
   * the card and walks you into the maker, in the maker it adds frames, and
   * the veil says so while you are still holding them. The two preventDefaults
   * are the load-bearing part — without them the browser wins.
   */
  const takeFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (!images.length) {
        notify('Those were not photos. Drop JPG, PNG, WebP or GIF.');
        return;
      }
      const room = own ? MAX_FRAMES - photos.length : MAX_FRAMES;
      if (room <= 0) {
        notify(`A card holds at most ${MAX_FRAMES} frames.`);
        return;
      }
      if (images.length > room) {
        notify(`Only the first ${room} of those fit — a card holds ${MAX_FRAMES} frames.`);
      }
      void addFiles(images.slice(0, room));
      if (stage === 'home') openMaker();
      else setStep('photos');
    },
    [own, photos.length, notify, addFiles, stage, openMaker],
  );

  useEffect(() => {
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    const onEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDropping(true);
    };
    const onOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDropping(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      takeFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [takeFiles]);

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
              render={(entry, isLive) => {
                const entryTheme = findTheme(entry.layout);
                return (
                  <TradingCard
                    photos={beltImages}
                    still={isLive ? undefined : entry.still}
                    views={isLive ? undefined : woven[entry.art]?.views}
                    ratio={woven[entry.art]?.ratio}
                    tint={woven[entry.art]?.tint}
                    demo
                    theme={entryTheme}
                    copy={{ ...copyFor(entryTheme), title: entry.name }}
                    layout={entry.layout}
                    lenticules={settings.lenticules}
                    parallax={settings.parallax}
                    blend={settings.blend}
                    sheen={settings.sheen}
                    drive="pointer"
                  />
                );
              }}
            />
          </div>
        )}

        {stage !== 'home' && (
        <div className="bench-view">
          {/* The pane the card is looked at in. A lamp above it, a floor under
              it, and the grading plate off to one side: the object is on a
              bench now rather than floating in the middle of a dark page with
              the controls floating beside it. */}
          <span className="bench-lamp" aria-hidden />
          <span className="bench-floor" aria-hidden />
        <div className="stage-case">
          {/* The box the case comes out of. It sits in front of the lower half
              of the slab, so the slab reads as rising from inside it, then
              drops away. Only ever shown on the way in from the home page. */}
          {pulling && (
            <motion.span
              className="case-box"
              aria-hidden
              initial={{ y: '62%', opacity: 0 }}
              animate={{ y: ['62%', '0%', '0%', '58%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.15, times: [0, 0.24, 0.46, 1], ease: EASE }}
              onAnimationComplete={() => setPulling(false)}
            />
          )}
          <motion.div
            className="case-lift"
            initial={pulling ? { y: '34%', scale: 0.82, rotateX: 22, opacity: 0 } : false}
            animate={{ y: 0, scale: 1, rotateX: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 116,
              damping: 19,
              mass: 0.9,
              delay: pulling ? 0.26 : 0,
            }}
          >
          <Slab
            encased
            label={copy.title}
            sublabel={`${cardTheme.set} · LENTICARD`}
            serial={serial}
            frames={photos.length}
            kind={caseKind}
            onAngle={onAngle}
          >
            <TradingCard
              ref={cardRef}
              photos={images}
              emptyNote={photos.length ? 'One more photo to make a lens' : 'Drop your photos'}
              ratio={woven.astra?.ratio}
              tint={woven.astra?.tint}
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

          {/* What is on the bench, in the language the case already speaks. */}
          <dl className="bench-plate">
            <div>
              <dt>Frames</dt>
              <dd>
                {photos.length} <span>/ {MAX_FRAMES}</span>
              </dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{cardTheme.set}</dd>
            </div>
            <div>
              <dt>Cert</dt>
              <dd className="bench-serial">{serial}</dd>
            </div>
          </dl>
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
                  Create and share your own <em>lenticular</em> trading card
                </h1>
                <p className="lede">
                  Three of your photos, printed as one card that changes when it
                  moves, sealed in the case of your choosing, then sent to whoever it is for.
                </p>

                <button
                  className="btn btn-holo btn-xl"
                  onClick={openMaker}
                >
                  Create and share
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
                transition={{ duration: 0.5, ease: EASE, delay: pulling ? 0.5 : 0 }}
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
                      <p>The template is the card. The case is what it arrives in.</p>
                    </div>
                    <div className="field">
                      <span className="field-label">Template</span>
                      <TemplateStrip value={layout} onPick={pickLayout} big />
                    </div>

                    <div className="field">
                      <span className="field-label">Case</span>
                      <CasePicker value={caseKind} onPick={setCaseKind} />
                    </div>
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
                  caseKind={caseKind}
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

      {tuning && stage === 'home' && <Tuner />}

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
        {dropping && (
          <motion.div
            className="drop-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
            aria-hidden
          >
            <motion.div
              className="drop-veil-card"
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 6 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <span className="drop-veil-icon">
                <Tray size={26} weight="light" />
              </span>
              <strong>Drop to add frames</strong>
              <small>
                {stage === 'home'
                  ? 'They become your card and the maker opens'
                  : `${photos.length} of ${MAX_FRAMES} used`}
              </small>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
