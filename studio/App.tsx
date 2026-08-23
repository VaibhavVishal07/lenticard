import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  CirclesThree,
  CircleNotch,
  Code,
  DeviceMobileCamera,
  FilmStrip,
  GiftIcon,
  GithubLogo,
  Images,
  MoonStars,
  Play,
  Rows,
  Stack,
  Sun,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../src/react/LenticularCard';
import type { Orientation } from '../src/core/types';
import { Choices, PaneHead, Slider } from './components/Controls';
import { Console, type ConsoleTab } from './components/Console';
import { EmbedDialog } from './components/EmbedDialog';
import { frameFromDataUrl, Frames, framesFromFiles, type Frame } from './components/Frames';
import { GiftDialog } from './components/GiftDialog';
import { Greeting } from './components/Greeting';
import { IntroLayer } from './components/Intro';
import { Landing } from './components/Landing';
import { ForDevelopers, HowItWorks, ViewPanel } from './components/ViewPanel';
import { Gallery } from './components/Gallery';
import { buildStandaloneHtml, download, recordGif, saveStill } from './lib/export';
import { INITIAL, PRESETS, type CardSettings } from './lib/presets';
import { buildSamples, type SampleSet } from './lib/samples';
import { hasLocalImages, toDisplayPaths } from './lib/snippets';
import { decodePayload, type SharePayload } from './lib/share';
import { clearLocation, hasCardInLocation, loadFromLocation } from './lib/stores';
import { useTheme } from './lib/theme';
import { buildTradingCardFrames } from './lib/trading-card';

interface Toast {
  message: string;
  progress?: number;
  spinner?: boolean;
}

const REPO = 'https://github.com/VaibhavVishal07/lenticard';

const TABS: ConsoleTab[] = [
  { id: 'frames', label: 'Frames', icon: <Images size={15} weight="light" /> },
  { id: 'lens', label: 'Lens', icon: <Stack size={15} weight="light" /> },
  { id: 'card', label: 'Card', icon: <Rows size={15} weight="light" /> },
  { id: 'motion', label: 'Motion', icon: <CirclesThree size={15} weight="light" /> },
];

export default function App() {
  const { theme, setTheme } = useTheme();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [samples, setSamples] = useState<SampleSet[]>([]);
  const [settings, setSettings] = useState<CardSettings>({
    ...INITIAL,
    // The landing card is a collectible, so it starts tuned like one.
    lenticules: 116,
    interlace: 0.24,
    sheen: 0.42,
    radius: 18,
  });
  const [caption, setCaption] = useState('Emberlynx · charging');
  const [preset, setPreset] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [mode, setMode] = useState<'landing' | 'studio'>('landing');
  const [view, setView] = useState<'how' | 'wall' | 'devs' | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  // A card arrived in the URL: this visit is a delivery, not a studio session.
  const [received, setReceived] = useState<SharePayload | null>(null);
  const [checkingLink, setCheckingLink] = useState(hasCardInLocation());
  const cardRef = useRef<LenticularCardHandle>(null);

  const notify = useCallback((message: string, ms = 3000) => {
    setToast({ message });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    if (!hasCardInLocation()) return;
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await loadFromLocation();
        if (!cancelled && bytes) setReceived(decodePayload(bytes));
      } catch (error) {
        if (!cancelled) notify((error as Error).message, 5000);
      } finally {
        if (!cancelled) setCheckingLink(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  // Landing state: the trading card, drawn once the display face has loaded so
  // the name plate is set in the right type rather than a fallback.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await document.fonts.ready.catch(() => undefined);
      const art = buildTradingCardFrames();
      const loaded = await Promise.all(
        art.map((url, i) => frameFromDataUrl(url, `emberlynx-${i + 1}.jpg`)),
      );
      if (cancelled) return;
      setFrames(loaded);
      setSamples(buildSamples());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const images = useMemo(() => frames.map((frame) => frame.url), [frames]);

  // Snippets show paths a reader can act on; the base64 the studio holds would
  // be unreadable and would not survive a copy-paste anyway.
  const snippetImages = useMemo(
    () => toDisplayPaths(images, frames.map((frame) => frame.name)),
    [images, frames],
  );
  const local = useMemo(() => hasLocalImages(images), [images]);

  // A manual shape override resizes the stage at once rather than waiting for
  // the next frame load to report back.
  const shownOrientation =
    settings.orientation === 'auto' ? orientation : settings.orientation;

  const patch = useCallback((next: Partial<CardSettings>) => {
    setSettings((current) => ({ ...current, ...next }));
    setPreset(null);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      try {
        const added = await framesFromFiles(files);
        setFrames((current) => [...current, ...added]);
      } catch (error) {
        notify((error as Error).message);
      }
    },
    [notify],
  );

  const loadSample = useCallback(
    async (id: string) => {
      const set = samples.find((item) => item.id === id);
      if (!set) return;
      const loaded = await Promise.all(
        set.frames.map((url, i) => frameFromDataUrl(url, `${set.id}-${i + 1}.jpg`)),
      );
      // Sample sets replace rather than append; mixing shapes muddies the demo.
      setFrames(loaded);
      setCaption('');
      notify(set.hint);
    },
    [samples, notify],
  );

  async function onSaveStill() {
    const card = cardRef.current?.card;
    if (!card) return;
    try {
      download(await saveStill(card), 'lenticard.png');
      notify('Saved the current angle as a PNG.');
    } catch (error) {
      notify((error as Error).message);
    }
  }

  async function onRecordGif() {
    const card = cardRef.current?.card;
    if (!card || busy) return;
    setBusy(true);
    setToast({ message: 'Recording the sweep', progress: 0 });
    try {
      const blob = await recordGif(card, {
        onProgress: (done, total) =>
          setToast({ message: 'Recording the sweep', progress: done / total }),
      });
      download(blob, 'lenticard.gif');
      notify(`Saved a looping GIF, ${Math.round(blob.size / 1024)} KB.`);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadHtml() {
    if (busy) return;
    setBusy(true);
    setToast({ message: 'Inlining frames and runtime', spinner: true });
    try {
      const html = await buildStandaloneHtml(
        images,
        {
          lenticules: settings.lenticules,
          parallax: settings.parallax,
          interlace: settings.interlace,
          blend: settings.blend,
          sheen: settings.sheen,
          lens: settings.lens,
          tilt: settings.tilt,
          float: settings.float,
          radius: settings.radius,
          orientation: settings.orientation,
          axis: settings.axis,
          motion: settings.motion,
          'idle-sweep': settings.idleSweep,
        },
        caption,
      );
      download(new Blob([html], { type: 'text/html' }), 'lenticular-card.html');
      notify('Downloaded a single file that opens anywhere.');
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onGyro() {
    const granted = await cardRef.current?.enableGyro();
    if (granted) {
      setSettings((current) => ({ ...current, motion: 'gyro' }));
      notify('Tilt your device — the card follows it now.');
    } else {
      notify('This device did not hand over its gyroscope.');
    }
  }

  const sweeping = settings.motion === 'auto';
  const round = shownOrientation === 'circle';

  const card = (
    <LenticularCard
      ref={cardRef}
      images={images}
      caption={caption || undefined}
      orientation={settings.orientation}
      axis={settings.axis}
      lenticules={settings.lenticules}
      parallax={settings.parallax}
      interlace={settings.interlace}
      blend={settings.blend}
      sheen={settings.sheen}
      lens={settings.lens}
      tilt={settings.tilt}
      float={settings.float}
      radius={settings.radius}
      motion={settings.motion}
      idleSweep={settings.idleSweep}
      fit={settings.fit}
      onReady={(info) => setOrientation(info.orientation)}
      onError={(error) => notify(error.message)}
    />
  );

  const openStudio = (openTab: string | null = null) => {
    setMode('studio');
    setTab(openTab);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // A delivered card takes over the whole page: the recipient should meet the
  // gift, not a tool they never asked for.
  if (received) {
    return (
      <>
        <div className="grain" aria-hidden />
        <Greeting
          payload={received}
          onMakeOne={(name) => {
            setReplyTo(name);
            setReceived(null);
            setIntroDone(true);
            clearLocation();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="grain" aria-hidden />
      <a className="skip-link" href="#stage">Skip to the card</a>

      <IntroLayer
        show={!introDone}
        theme={theme}
        ready={frames.length > 0 && !checkingLink}
        onDone={() => setIntroDone(true)}
      />

      <nav className="nav" aria-label="Primary">
        <span className="brand">
          <span className="brand-chip" aria-hidden />
          <span>lenticard</span>
        </span>

        {mode === 'studio' ? (
          <button className="btn" onClick={() => setMode('landing')}>
            <ArrowLeft size={14} weight="light" />
            Back
          </button>
        ) : (
          <nav className="nav-links" aria-label="Sections">
            <button className="nav-link" onClick={() => setView('how')}>
              How it works
            </button>
            <button className="nav-link" onClick={() => setView('wall')}>
              The wall
            </button>
            <button className="nav-link" onClick={() => setView('devs')}>
              Developers
            </button>
          </nav>
        )}

        <span className="nav-sep" aria-hidden />

        <div className="lens-switch" role="group" aria-label="Colour theme">
          <motion.span
            className="lens"
            aria-hidden
            animate={{ x: theme === 'light' ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          />
          <button
            aria-pressed={theme === 'light'}
            aria-label="Light theme"
            onClick={() => setTheme('light')}
          >
            <Sun size={15} weight="light" />
          </button>
          <button
            aria-pressed={theme === 'dark'}
            aria-label="Dark theme"
            onClick={() => setTheme('dark')}
          >
            <MoonStars size={15} weight="light" />
          </button>
        </div>

        <a className="icon-btn" href={REPO} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
          <GithubLogo size={17} weight="light" />
        </a>

        <button
          className="btn btn-solid"
          onClick={() => setGiftOpen(true)}
          disabled={frames.length < 2}
        >
          Send it
          <span className="btn-well">
            <ArrowUpRight size={13} weight="bold" />
          </span>
        </button>
      </nav>

      {mode === 'landing' ? (
        <Landing
          hero={card}
          replyTo={replyTo}
          onMakeOne={() => {
            openStudio('frames');
            setGiftOpen(true);
          }}
          onOpenStudio={() => openStudio('lens')}
        />
      ) : (
      <main className="stage" id="stage">
          {frames.length === 0 ? (
            <div className="empty">
              <h2>Nothing loaded yet</h2>
              <p>Add two or more frames and the card builds itself.</p>
            </div>
          ) : (
            <>
              <h1 className="stage-title stage-title-sm">
                {replyTo ? (
                  <>
                    A card back for <em>{replyTo}</em>
                  </>
                ) : (
                  'Your card'
                )}
              </h1>
  
              <motion.div
                className="card-holder"
                data-orientation={shownOrientation}
                initial={{ opacity: 0, y: 48, filter: 'blur(14px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.95, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
              >
                {card}
              </motion.div>
  
              <motion.p
                className="stage-note"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
              >
                Swap in your own photos, write a note, and send the link. They open a
                sealed card with your name on it — and it changes as they tilt it.
              </motion.p>
  
              <motion.div
                className="stage-actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
              >
                <button
                  className="btn btn-solid btn-lg"
                  onClick={() => setGiftOpen(true)}
                  disabled={frames.length < 2}
                >
                  <GiftIcon size={16} weight="light" />
                  Send this to someone
                  <span className="btn-well">
                    <ArrowUpRight size={13} weight="bold" />
                  </span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => patch({ motion: sweeping ? 'pointer' : 'auto' })}
                >
                  <Play size={14} weight="light" />
                  {sweeping ? 'Stop the sweep' : 'Sweep it'}
                </button>
                <button className="btn btn-outline" onClick={() => void onSaveStill()}>
                  <Camera size={14} weight="light" />
                  Save PNG
                </button>
                <button className="btn btn-outline" onClick={() => void onRecordGif()} disabled={busy}>
                  <FilmStrip size={14} weight="light" />
                  Record GIF
                </button>
              </motion.div>
            </>
          )}
        </main>
  
      )}

      {mode === 'studio' && (
      <Console
        tabs={TABS}
        active={tab}
        onSelect={setTab}
        actions={
          <button className="btn" onClick={() => setEmbedOpen(true)} disabled={!frames.length}>
            <Code size={14} weight="light" />
            Get the code
          </button>
        }
      >
        {tab === 'frames' && (
          <div className="console-pane">
            <div className="pane-grid">
              <PaneHead
                title="Frames"
                hint="Two to six. Drag to reorder — order is the tilt order."
              />
              <div className="field span">
                <Frames frames={frames} onChange={setFrames} onAdd={addFiles} onError={notify} />
              </div>
              <div className="field span">
                <span className="field-label">Or start from a sample</span>
                <div className="choices">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      className="choice"
                      onClick={() => void loadSample(sample.id)}
                      title={sample.hint}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'lens' && (
          <div className="console-pane">
            <div className="pane-grid">
              <PaneHead title="Lens" hint="The optics of the sheet over the print." />
              <div className="field span">
                <span className="field-label">Presets</span>
                <div className="choices">
                  {PRESETS.map((item) => (
                    <button
                      key={item.id}
                      className="choice"
                      aria-pressed={preset === item.id}
                      title={item.hint}
                      onClick={() => {
                        setSettings((current) => ({ ...current, ...item.values }));
                        setPreset(item.id);
                      }}
                    >
                      {preset === item.id && (
                        <motion.span className="pill" layoutId="preset-pill" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Slider
                label="Lenticules"
                value={settings.lenticules}
                min={16}
                max={320}
                onChange={(lenticules) => patch({ lenticules })}
              />
              <Slider
                label="Parallax"
                value={settings.parallax}
                min={0}
                max={2}
                step={0.01}
                decimals={2}
                onChange={(parallax) => patch({ parallax })}
              />
              <Slider
                label="Interlace"
                value={settings.interlace}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                onChange={(interlace) => patch({ interlace })}
              />
              <Slider
                label="Blend"
                value={settings.blend}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                onChange={(blend) => patch({ blend })}
              />
              <Slider
                label="Sheen"
                value={settings.sheen}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                onChange={(sheen) => patch({ sheen })}
              />
              <Slider
                label="Refraction"
                value={settings.lens}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                onChange={(lens) => patch({ lens })}
              />
              <div className="span">
                <Choices
                  label="Ridge direction"
                  value={settings.axis}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'vertical', label: 'Down the card' },
                    { value: 'horizontal', label: 'Across the card' },
                  ]}
                  onChange={(axis) => patch({ axis })}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'card' && (
          <div className="console-pane">
            <div className="pane-grid">
              <PaneHead title="Card" hint="Shape, crop and the line underneath." />
              <div className="span">
                <Choices
                  label="Shape"
                  value={settings.orientation}
                  options={[
                    { value: 'auto', label: 'From the frames' },
                    { value: 'landscape', label: 'Wide' },
                    { value: 'portrait', label: 'Tall' },
                    { value: 'square', label: 'Square' },
                    { value: 'circle', label: 'Round' },
                  ]}
                  onChange={(value) => patch({ orientation: value })}
                />
              </div>
              <Choices
                label="Frame fit"
                value={settings.fit}
                options={[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                ]}
                onChange={(fit) => patch({ fit })}
              />
              <Slider
                label={round ? 'Corner radius (round card)' : 'Corner radius'}
                value={settings.radius}
                min={0}
                max={48}
                suffix="px"
                disabled={round}
                onChange={(radius) => patch({ radius })}
              />
              <div className="field span">
                <label className="field-label" htmlFor="caption">
                  Caption
                </label>
                <input
                  id="caption"
                  className="text-input"
                  value={caption}
                  placeholder="Optional line under the card"
                  onChange={(event) => setCaption(event.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'motion' && (
          <div className="console-pane">
            <div className="pane-grid">
              <PaneHead title="Motion" hint="What drives the viewing angle." />
              <div className="span">
                <Choices
                  label="Driven by"
                  value={settings.motion}
                  options={[
                    { value: 'pointer', label: 'Pointer' },
                    { value: 'auto', label: 'Its own sweep' },
                    { value: 'gyro', label: 'Device tilt' },
                    { value: 'none', label: 'Held still' },
                  ]}
                  onChange={(value) => patch({ motion: value })}
                />
              </div>
              <Slider
                label="Tilt"
                value={settings.tilt}
                min={0}
                max={30}
                suffix="°"
                onChange={(tilt) => patch({ tilt })}
              />
              <Slider
                label="Float"
                value={settings.float}
                min={0}
                max={24}
                suffix="px"
                onChange={(float) => patch({ float })}
              />
              <Slider
                label="Idle sweep delay"
                value={settings.idleSweep}
                min={0}
                max={8000}
                step={100}
                suffix="ms"
                onChange={(idleSweep) => patch({ idleSweep })}
              />
              <div className="span">
                <button className="btn btn-outline" onClick={() => void onGyro()}>
                  <DeviceMobileCamera size={14} weight="light" />
                  Use this device&rsquo;s tilt
                </button>
              </div>
            </div>
          </div>
        )}
      </Console>
      )}

      <ViewPanel
        open={view === 'how'}
        title="How it works"
        lede="Three photos in, one card out."
        onClose={() => setView(null)}
      >
        <HowItWorks />
      </ViewPanel>

      <ViewPanel
        open={view === 'wall'}
        title="Cards people have sent"
        onClose={() => setView(null)}
      >
        <Gallery
          onMakeOne={() => {
            setView(null);
            openStudio('frames');
            setGiftOpen(true);
          }}
          onError={(message) => notify(message, 4000)}
        />
      </ViewPanel>

      <ViewPanel
        open={view === 'devs'}
        title="It is also a component"
        onClose={() => setView(null)}
      >
        <ForDevelopers
          onOpenEmbed={() => {
            setView(null);
            setEmbedOpen(true);
          }}
        />
      </ViewPanel>

      <GiftDialog
        open={giftOpen}
        images={images}
        settings={settings}
        caption={caption}
        replyTo={replyTo}
        onClose={() => setGiftOpen(false)}
        onError={(message) => notify(message, 5000)}
      />

      <EmbedDialog
        open={embedOpen}
        images={snippetImages}
        local={local}
        settings={settings}
        caption={caption}
        onClose={() => setEmbedOpen(false)}
        onDownloadHtml={() => void onDownloadHtml()}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            role="status"
          >
            {toast.spinner && <CircleNotch size={15} weight="light" className="spin" aria-hidden />}
            {toast.message}
            {toast.progress !== undefined && (
              <span className="progress">
                <span style={{ width: `${Math.round(toast.progress * 100)}%` }} />
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
