import type { Motion } from './types';

/**
 * A critically damped spring. Cheap, allocation-free, and unconditionally
 * stable at any frame rate, which matters because this runs every rAF tick.
 */
class Spring {
  value = 0;
  private velocity = 0;
  constructor(private stiffness = 120, private damping = 22) {}

  step(target: number, dt: number): number {
    // Clamp dt so a backgrounded tab returning doesn't fling the spring.
    const h = Math.min(dt, 1 / 30);
    const accel = (target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += accel * h;
    this.value += this.velocity * h;
    return this.value;
  }

  snap(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}

export interface Pose {
  /** Smoothed viewing angle, -1..1 on each axis. */
  x: number;
  y: number;
  /** Idle bob, -1..1. */
  bob: number;
  /** 0 when at rest, 1 when fully tilted — drives glare and shadow. */
  energy: number;
  /** What is actually driving the pose right now. */
  source: 'pointer' | 'gyro' | 'sweep' | 'rest';
}

export interface MotionOptions {
  mode: Motion;
  idleSweep: number;
  float: number;
  reducedMotion: boolean;
}

/**
 * Turns pointer, gyroscope or plain elapsed time into a single smoothed pose.
 * Everything the card renders — shader angle, CSS rotation, glare, shadow —
 * is derived from this one object.
 */
export class MotionController {
  private springX = new Spring();
  private springY = new Spring();
  private targetX = 0;
  private targetY = 0;
  private manual = false;
  private lastInput = 0;
  private elapsed = 0;
  private gyroBase: { beta: number; gamma: number } | null = null;
  private gyroActive = false;
  private gyroLive = false;

  readonly pose: Pose = { x: 0, y: 0, bob: 0, energy: 0, source: 'rest' };

  constructor(private element: HTMLElement, private options: MotionOptions) {
    this.lastInput = -Infinity;
    this.attach();
  }

  setOptions(options: Partial<MotionOptions>): void {
    const previous = this.options.mode;
    this.options = { ...this.options, ...options };
    if (options.mode && options.mode !== previous) {
      this.detach();
      this.manual = false;
      this.targetX = 0;
      this.targetY = 0;
      this.attach();
    }
  }

  /** A phone or tablet: no hovering cursor to follow. */
  private get isTouch(): boolean {
    return (
      typeof matchMedia === 'function' &&
      matchMedia('(hover: none) and (pointer: coarse)').matches
    );
  }

  private attach(): void {
    if (this.options.mode === 'pointer') {
      this.element.addEventListener('pointermove', this.onPointerMove, { passive: true });
      this.element.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      this.element.addEventListener('pointercancel', this.onPointerLeave, { passive: true });
    }
    // On a touch device 'pointer' means "whatever the hand is doing", and the
    // hand is holding the device. Android hands over orientation without asking;
    // iOS needs a gesture, so enableGyro() covers that case.
    if (this.options.mode === 'gyro' || (this.options.mode === 'pointer' && this.isTouch)) {
      this.listenGyro();
    }
  }

  private detach(): void {
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerleave', this.onPointerLeave);
    this.element.removeEventListener('pointercancel', this.onPointerLeave);
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.gyroActive = false;
    this.gyroLive = false;
    this.gyroBase = null;
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.manual = true;
    this.lastInput = this.elapsed;
  };

  private onPointerLeave = () => {
    this.manual = false;
    this.targetX = 0;
    this.targetY = 0;
    this.lastInput = this.elapsed;
  };

  private onOrientation = (event: DeviceOrientationEvent) => {
    const { beta, gamma } = event;
    if (beta == null || gamma == null) return;
    // First reading becomes level, so the card doesn't jump to the user's
    // actual posture the moment they grant permission.
    if (!this.gyroBase) this.gyroBase = { beta, gamma };
    this.targetX = clamp((gamma - this.gyroBase.gamma) / 35, -1, 1);
    this.targetY = clamp((beta - this.gyroBase.beta) / 35, -1, 1);
    this.manual = true;
    this.gyroLive = true;
    this.lastInput = this.elapsed;
  };

  private listenGyro(): void {
    if (this.gyroActive || typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', this.onOrientation, { passive: true });
    this.gyroActive = true;
  }

  /** iOS 13+ will not emit orientation events without an explicit grant. */
  async enableGyro(): Promise<boolean> {
    const api = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<PermissionState | string> };
    }).DeviceOrientationEvent;

    if (api && typeof api.requestPermission === 'function') {
      try {
        const state = await api.requestPermission();
        if (state !== 'granted') return false;
      } catch {
        return false;
      }
    } else if (typeof DeviceOrientationEvent === 'undefined') {
      return false;
    }

    this.options.mode = 'gyro';
    this.gyroBase = null;
    this.listenGyro();
    return true;
  }

  /** Drive the angle directly; used by setAngle() and by the recorder. */
  setAngle(x: number, y: number, immediate = false): void {
    this.targetX = clamp(x, -1, 1);
    this.targetY = clamp(y, -1, 1);
    this.manual = true;
    this.lastInput = this.elapsed;
    if (immediate) {
      this.springX.snap(this.targetX);
      this.springY.snap(this.targetY);
      this.pose.x = this.targetX;
      this.pose.y = this.targetY;
    }
  }

  step(dt: number): Pose {
    this.elapsed += dt;
    const { mode, idleSweep, float, reducedMotion } = this.options;

    let tx = this.targetX;
    let ty = this.targetY;

    const idleFor = (this.elapsed - this.lastInput) * 1000;
    const shouldSweep =
      !reducedMotion &&
      (mode === 'auto' || (idleSweep > 0 && !this.manual && idleFor > idleSweep));

    if (shouldSweep) {
      // A slow figure-of-eight reads as someone turning the card in their hand.
      tx = Math.sin(this.elapsed * 0.9);
      ty = Math.sin(this.elapsed * 0.45) * 0.35;
    }

    if (reducedMotion && !this.manual) {
      tx = 0;
      ty = 0;
    }

    this.pose.x = this.springX.step(tx, dt);
    this.pose.y = this.springY.step(ty, dt);
    this.pose.bob =
      float > 0 && !reducedMotion ? Math.sin(this.elapsed * 1.15) : 0;
    this.pose.energy = Math.min(1, Math.hypot(this.pose.x, this.pose.y));
    this.pose.source = this.gyroLive
      ? 'gyro'
      : shouldSweep
        ? 'sweep'
        : this.manual
          ? 'pointer'
          : 'rest';
    return this.pose;
  }

  destroy(): void {
    this.detach();
  }
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
