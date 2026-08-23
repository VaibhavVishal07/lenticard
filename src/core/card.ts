import { CARD_ASPECT, meanAspect, resolveAxis, resolveOrientation } from './aspect';
import { FallbackRenderer } from './fallback';
import { loadFrame, releaseFrame, type LoadedFrame } from './loader';
import { clamp, MotionController } from './motion';
import { LenticularRenderer, type RenderState } from './renderer';
import { injectStyles } from './styles';
import {
  DEFAULTS,
  MAX_FRAMES,
  type Axis,
  type LenticularCardInstance,
  type LenticularOptions,
  type Orientation,
  type ResolvedOptions,
} from './types';

type Engine = LenticularRenderer | FallbackRenderer;

function resolve(options: LenticularOptions): ResolvedOptions {
  return { ...DEFAULTS, ...options } as ResolvedOptions;
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Mounts a lenticular card into `target`. Framework-agnostic on purpose: the
 * React component and the custom element are both thin wrappers over this.
 */
export function createLenticularCard(
  target: HTMLElement | string,
  options: LenticularOptions,
): LenticularCardInstance {
  const host =
    typeof target === 'string'
      ? (document.querySelector(target) as HTMLElement | null)
      : target;
  if (!host) throw new Error('lenticard: mount target not found');

  injectStyles(host.ownerDocument ?? document);
  let config = resolve(options);

  const root = document.createElement('div');
  root.className = ['lc-root', config.className].filter(Boolean).join(' ');
  root.dataset.state = 'loading';

  const stage = document.createElement('div');
  stage.className = 'lc-stage';

  const card = document.createElement('div');
  card.className = 'lc-card';

  const canvas = document.createElement('canvas');
  canvas.className = 'lc-canvas';
  card.appendChild(canvas);

  const layer = (name: string) => {
    const el = document.createElement('div');
    el.className = `lc-layer ${name}`;
    card.appendChild(el);
    return el;
  };
  layer('lc-ridges');
  layer('lc-glare');
  layer('lc-flare');
  layer('lc-edge');

  const shadow = document.createElement('div');
  shadow.className = 'lc-shadow';

  stage.append(card, shadow);
  root.appendChild(stage);

  let caption: HTMLElement | null = null;
  const syncCaption = () => {
    if (config.caption) {
      if (!caption) {
        caption = document.createElement('figcaption');
        caption.className = 'lc-caption';
        root.appendChild(caption);
      }
      caption.textContent = config.caption;
    } else {
      caption?.remove();
      caption = null;
    }
  };
  syncCaption();
  host.appendChild(root);

  // --- engine -------------------------------------------------------------
  let engine: Engine;
  let usingFallback = false;
  try {
    engine = new LenticularRenderer(canvas);
  } catch {
    canvas.remove();
    engine = new FallbackRenderer(card);
    usingFallback = true;
  }

  const motion = new MotionController(card, {
    mode: config.motion,
    idleSweep: config.idleSweep,
    float: config.float,
    reducedMotion: config.respectReducedMotion && prefersReducedMotion(),
  });

  let orientation: Orientation = 'landscape';
  let axis: Axis = 'vertical';
  let aspect = CARD_ASPECT.landscape;
  let frames: LoadedFrame[] = [];
  let loadToken = 0;
  let destroyed = false;
  let visible = true;

  function applyGeometry(): void {
    root.dataset.orientation = orientation;
    root.dataset.axis = axis;
    root.style.setProperty('--lc-aspect', String(aspect));
    root.style.setProperty('--lc-radius', `${config.radius}px`);
    root.style.setProperty('--lc-sheen', String(config.sheen));
    root.style.setProperty('--lc-ridge-angle', axis === 'vertical' ? '90deg' : '0deg');
    root.style.setProperty('--lc-flare-angle', axis === 'vertical' ? '105deg' : '15deg');
    root.dataset.reduced = String(config.respectReducedMotion && prefersReducedMotion());
  }

  async function loadFrames(sources: LenticularOptions['images']): Promise<void> {
    const token = ++loadToken;
    root.dataset.state = 'loading';
    const list = (sources ?? []).slice(0, MAX_FRAMES);

    if (!list.length) {
      root.dataset.state = 'empty';
      return;
    }

    try {
      const loaded = await Promise.all(list.map(loadFrame));
      // A newer load (or a destroy) landed while we were decoding.
      if (token !== loadToken || destroyed) {
        loaded.forEach(releaseFrame);
        return;
      }
      frames.forEach(releaseFrame);
      frames = loaded;

      const mean = meanAspect(loaded);
      orientation = resolveOrientation(config.orientation, mean);
      axis = resolveAxis(config.axis, orientation);
      aspect = CARD_ASPECT[orientation];
      applyGeometry();
      measure();

      engine.setFrames(loaded);
      idleFrames = 0;
      root.dataset.state = 'ready';
      config.onReady?.({ orientation, axis, aspect: mean });
    } catch (error) {
      if (token !== loadToken || destroyed) return;
      root.dataset.state = 'error';
      card.textContent = (error as Error).message ?? 'lenticard: failed to load frames';
      config.onError?.(error as Error);
    }
  }

  // --- sizing -------------------------------------------------------------
  function measure(): void {
    // offsetWidth/Height, not getBoundingClientRect: the rect includes any
    // transform on an ancestor, so a card mid entrance-animation would size its
    // buffer to the scaled-down size and keep it forever.
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    if (!width || !height) return;
    // Cap the buffer on dense displays: a 3x card is invisible next to 2x and
    // costs more than twice the fill rate.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    engine.resize(width, height, dpr);
    idleFrames = 0;
  }


  // --- loop ---------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let idleFrames = 0;
  const state: RenderState = {
    angle: 0,
    lenticules: config.lenticules,
    parallax: config.parallax,
    interlace: config.interlace,
    blend: config.blend,
    sheen: config.sheen,
    lens: config.lens,
    axis: 0,
    fit: config.fit,
  };

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;

    const pose = motion.step(dt);
    const angle = clamp(axis === 'vertical' ? pose.x : pose.y, -1, 1);

    // Held in the hand, the card should feel like it is actually floating off
    // the screen, so the gyro drives a much deeper rise than a cursor does.
    const held = pose.source === 'gyro';
    const tiltY = pose.x * config.tilt * (held ? 1.25 : 1);
    const tiltX = -pose.y * config.tilt * (held ? 1.25 : 1);
    const lift =
      -pose.energy * (held ? 20 : 6) +
      pose.bob * config.float * (held ? 1.4 : 1);

    root.style.setProperty('--lc-tilt-y', `${tiltY.toFixed(3)}deg`);
    root.style.setProperty('--lc-tilt-x', `${tiltX.toFixed(3)}deg`);
    root.style.setProperty('--lc-lift', `${lift.toFixed(2)}px`);
    root.style.setProperty('--lc-glare-x', `${(50 + pose.x * 42).toFixed(2)}%`);
    root.style.setProperty('--lc-glare-y', `${(50 + pose.y * 42).toFixed(2)}%`);
    root.style.setProperty('--lc-glare', pose.energy.toFixed(3));
    root.style.setProperty('--lc-energy', pose.energy.toFixed(3));
    root.style.setProperty('--lc-shadow-x', (-pose.x * (held ? 26 : 14)).toFixed(2));
    root.dataset.held = held ? 'true' : 'false';

    const moved = Math.abs(angle - state.angle) > 0.0004;
    state.angle = angle;
    state.axis = axis === 'vertical' ? 0 : 1;

    // preserveDrawingBuffer keeps the last frame on screen, so a card at rest
    // can simply stop drawing.
    if (moved) idleFrames = 0;
    else idleFrames++;
    if (idleFrames < 3) engine.render(state);

    if (!visible || document.hidden) stop();
  }

  function start(): void {
    if (raf || destroyed || !visible || document.hidden) return;
    last = 0;
    idleFrames = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  const resizeObserver = new ResizeObserver(() => measure());
  resizeObserver.observe(card);

  // Embeds live far down other people's pages; don't burn a rAF loop off-screen.
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
    },
    { threshold: 0 },
  );
  intersection.observe(root);

  applyGeometry();
  void loadFrames(config.images);
  start();

  // --- public surface -----------------------------------------------------
  const instance: LenticularCardInstance = {
    element: root,
    get orientation() {
      return orientation;
    },
    get axis() {
      return axis;
    },
    get canvas() {
      return engine.canvas;
    },

    update(next: Partial<LenticularOptions>) {
      // Spreading an object with explicit `undefined` values would wipe real
      // settings, and React callers pass undefined for every prop they omit.
      const patch = Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== undefined),
      ) as Partial<LenticularOptions>;
      const imagesChanged =
        patch.images !== undefined && patch.images !== config.images;
      config = resolve({ ...config, ...patch });

      state.lenticules = config.lenticules;
      state.parallax = config.parallax;
      state.interlace = config.interlace;
      state.blend = config.blend;
      state.sheen = config.sheen;
      state.lens = config.lens;
      state.fit = config.fit;

      motion.setOptions({
        mode: config.motion,
        idleSweep: config.idleSweep,
        float: config.float,
        reducedMotion: config.respectReducedMotion && prefersReducedMotion(),
      });

      if (patch.className !== undefined) {
        root.className = ['lc-root', config.className].filter(Boolean).join(' ');
      }
      if (patch.caption !== undefined) syncCaption();

      if (imagesChanged) {
        void loadFrames(config.images);
      } else if (patch.orientation !== undefined || patch.axis !== undefined) {
        orientation = resolveOrientation(config.orientation, meanAspect(frames));
        axis = resolveAxis(config.axis, orientation);
        aspect = CARD_ASPECT[orientation];
        measure();
      }

      applyGeometry();
      idleFrames = 0;
      start();
    },

    setAngle(x: number, y: number, immediate = false) {
      motion.setOptions({ mode: 'none' });
      motion.setAngle(x, y, immediate);
      idleFrames = 0;
      start();
    },

    async enableGyro() {
      const granted = await motion.enableGyro();
      if (granted) config = { ...config, motion: 'gyro' };
      return granted;
    },

    toBlob(type = 'image/png', quality?: number) {
      return new Promise<Blob | null>((resolve) => {
        if (usingFallback) return resolve(null);
        engine.render(state);
        (engine.canvas as HTMLCanvasElement).toBlob(resolve, type, quality);
      });
    },

    destroy() {
      destroyed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      intersection.disconnect();
      motion.destroy();
      engine.dispose();
      frames.forEach(releaseFrame);
      frames = [];
      root.remove();
    },
  };

  return instance;
}
