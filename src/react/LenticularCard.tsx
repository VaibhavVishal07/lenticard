import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { createLenticularCard } from '../core/card';
import type { LenticularCardInstance, LenticularOptions } from '../core/types';

export interface LenticularCardProps extends LenticularOptions {
  /** Width of the wrapper. The card fills it and derives its height from the shape. */
  width?: number | string;
  style?: CSSProperties;
  /** Class on the outer wrapper. `className` lands on the card root instead. */
  wrapperClassName?: string;
  /** Called once, with the live instance, as soon as the card is mounted. */
  onMount?: (card: LenticularCardInstance) => void;
}

/**
 * The imperative handle is a stable façade rather than the instance itself:
 * refs are attached before the mount effect runs, so handing back the instance
 * directly would hand back null and never update.
 */
export interface LenticularCardHandle {
  readonly card: LenticularCardInstance | null;
  readonly canvas: HTMLCanvasElement | null;
  setAngle(x: number, y: number, immediate?: boolean): void;
  enableGyro(): Promise<boolean>;
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
}

/** @deprecated Use {@link LenticularCardHandle}. */
export type LenticularCardRef = LenticularCardHandle;

function shallowEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

/**
 * React wrapper. The card owns its own DOM below the mount point, so React
 * never diffs the canvas; props are pushed through `update()` instead.
 */
export const LenticularCard = forwardRef<LenticularCardHandle, LenticularCardProps>(
  function LenticularCard(props, ref) {
    const { width = '100%', style, wrapperClassName, onMount: _onMount, ...options } = props;
    const hostRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<LenticularCardInstance | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const onMountRef = useRef(props.onMount);
    onMountRef.current = props.onMount;

    useImperativeHandle(
      ref,
      () => ({
        get card() {
          return cardRef.current;
        },
        get canvas() {
          return cardRef.current?.canvas ?? null;
        },
        setAngle: (x, y, immediate) => cardRef.current?.setAngle(x, y, immediate),
        enableGyro: () => cardRef.current?.enableGyro() ?? Promise.resolve(false),
        toBlob: (type, quality) => cardRef.current?.toBlob(type, quality) ?? Promise.resolve(null),
      }),
      [],
    );

    // Mount once. Everything after this is an update, not a remount.
    useEffect(() => {
      if (!hostRef.current) return;
      const card = createLenticularCard(hostRef.current, optionsRef.current);
      cardRef.current = card;
      onMountRef.current?.(card);
      return () => {
        card.destroy();
        cardRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const {
      images,
      orientation,
      axis,
      lenticules,
      parallax,
      interlace,
      blend,
      sheen,
      lens,
      tilt,
      float,
      radius,
      motion,
      idleSweep,
      caption,
      className,
      fit,
      respectReducedMotion,
    } = options;

    // Callers rarely memoise the array; comparing its contents avoids a
    // full texture reload on every parent render.
    const framesRef = useRef<LenticularOptions['images']>(images);
    const frames = useMemo(() => {
      if (framesRef.current && shallowEqual(framesRef.current, images)) {
        return framesRef.current;
      }
      framesRef.current = images;
      return images;
    }, [images]);

    useEffect(() => {
      cardRef.current?.update({ images: frames });
    }, [frames]);

    useEffect(() => {
      cardRef.current?.update({
        orientation,
        axis,
        lenticules,
        parallax,
        interlace,
        blend,
        sheen,
        lens,
        tilt,
        float,
        radius,
        motion,
        idleSweep,
        caption,
        className,
        fit,
        respectReducedMotion,
      });
    }, [
      orientation,
      axis,
      lenticules,
      parallax,
      interlace,
      blend,
      sheen,
      lens,
      tilt,
      float,
      radius,
      motion,
      idleSweep,
      caption,
      className,
      fit,
      respectReducedMotion,
    ]);

    return <div ref={hostRef} className={wrapperClassName} style={{ width, ...style }} />;
  },
);
