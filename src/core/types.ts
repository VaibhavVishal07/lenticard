/** Anything we know how to turn into a WebGL texture. */
export type ImageSource =
  | string
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap
  | Blob;

export type Orientation = 'portrait' | 'landscape' | 'square' | 'circle';
export type OrientationOption = Orientation | 'auto';

/** Direction the lenticules (the plastic ridges) run. */
export type Axis = 'vertical' | 'horizontal';
export type AxisOption = Axis | 'auto';

/** What drives the viewing angle. */
export type Motion = 'pointer' | 'gyro' | 'auto' | 'none';

export interface LenticularOptions {
  /** 2-6 frames. The first is shown at full left tilt, the last at full right. */
  images: ImageSource[];
  /** Card shape. `auto` derives it from the average aspect ratio of the frames.
   *  `circle` is opt-in only — auto never picks it. */
  orientation?: OrientationOption;
  /** Ridge direction. `auto` runs them across the card's longer axis. */
  axis?: AxisOption;
  /** Ridges across the card. Higher = finer interlace. 20-320, default 96. */
  lenticules?: number;
  /** How far a tilt pushes through the frame stack. 0-2, default 1. */
  parallax?: number;
  /** Visible interlace: 0 hides the strips, 1 shows all frames at once. Default 0.22. */
  interlace?: number;
  /** Cross-frame softness. 0 snaps between frames, 1 dissolves. Default 0.35. */
  blend?: number;
  /** Specular highlight riding each ridge. 0-1, default 0.35. */
  sheen?: number;
  /** Lens magnification at the ridge edges. 0-1, default 0.5. */
  lens?: number;
  /** Max card rotation in degrees. Default 14. */
  tilt?: number;
  /** Idle bob amplitude in px. 0 disables. Default 8. */
  float?: number;
  /** Corner radius in px. Default 20. */
  radius?: number;
  /** What drives the angle. Default 'pointer'. */
  motion?: Motion;
  /** Sweep the card on its own after this many ms of stillness. 0 disables. Default 2600. */
  idleSweep?: number;
  /** Text under the card. */
  caption?: string;
  /** Extra class on the root element. */
  className?: string;
  /** Fit mode when a frame's aspect ratio differs from the card's. Default 'cover'. */
  fit?: 'cover' | 'contain';
  /** Respect `prefers-reduced-motion`. Default true. */
  respectReducedMotion?: boolean;
  onReady?: (info: { orientation: Orientation; axis: Axis; aspect: number }) => void;
  onError?: (error: Error) => void;
}

export type ResolvedOptions = Required<
  Omit<LenticularOptions, 'images' | 'caption' | 'className' | 'onReady' | 'onError'>
> & {
  images: ImageSource[];
  caption?: string;
  className?: string;
  onReady?: LenticularOptions['onReady'];
  onError?: LenticularOptions['onError'];
};

export interface LenticularCardInstance {
  /** Root element. Already in the DOM. */
  readonly element: HTMLElement;
  /** The card's resolved shape, once the frames have loaded. */
  readonly orientation: Orientation;
  readonly axis: Axis;
  /** Patch options in place. Passing `images` reloads the frame stack. */
  update(options: Partial<LenticularOptions>): void;
  /** Drive the angle yourself, -1..1 on each axis. Switches motion to 'none'.
   *  `immediate` skips the spring, which is what frame-by-frame capture needs. */
  setAngle(x: number, y: number, immediate?: boolean): void;
  /** iOS needs a user gesture before it hands over gyroscope data. */
  enableGyro(): Promise<boolean>;
  /** Current frame as a PNG blob, tilt and all. */
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  /** The live WebGL canvas, for recording. */
  readonly canvas: HTMLCanvasElement;
  destroy(): void;
}

export const DEFAULTS = {
  orientation: 'auto',
  axis: 'auto',
  lenticules: 96,
  parallax: 1,
  interlace: 0.22,
  blend: 0.35,
  sheen: 0.35,
  lens: 0.5,
  tilt: 14,
  float: 8,
  radius: 20,
  motion: 'pointer',
  idleSweep: 2600,
  fit: 'cover',
  respectReducedMotion: true,
} satisfies Omit<ResolvedOptions, 'images' | 'caption' | 'className' | 'onReady' | 'onError'>;

/** Frames beyond this are ignored; the shader unrolls one branch per frame. */
export const MAX_FRAMES = 6;
