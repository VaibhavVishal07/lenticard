import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const EASE = [0.32, 0.72, 0, 1] as const;

export type CaseTexture = 'clear' | 'frosted' | 'carbon' | 'holo';

export const CASE_TEXTURES: Array<{ id: CaseTexture; label: string }> = [
  { id: 'clear', label: 'Clear' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'carbon', label: 'Carbon' },
  { id: 'holo', label: 'Holo' },
];

/** Label stock. Deep enough that the printed text stays readable on it. */
export const CASE_TINTS = [
  { id: 'bone', label: 'Bone', value: '#e9eae4' },
  { id: 'rose', label: 'Rose', value: '#f0b7c6' },
  { id: 'gold', label: 'Gold', value: '#e8c877' },
  { id: 'mint', label: 'Mint', value: '#a9dfc9' },
  { id: 'ice', label: 'Ice', value: '#b6cbe8' },
  { id: 'slate', label: 'Slate', value: '#4c5260' },
];

interface SlabProps {
  encased: boolean;
  label?: string;
  sublabel?: string;
  serial?: string;
  tint?: string;
  texture?: CaseTexture;
  grade?: string;
  /** Viewing angle, -1..1 on each axis. The caller feeds this to the card. */
  onAngle?: (x: number, y: number) => void;
  children: ReactNode;
}

/**
 * The case, as an actual object.
 *
 * Depth is the whole point, so it is built as separated layers in 3D rather
 * than a panel with a gradient on it: a dark backing plate, the shell and its
 * printed label, the card, and the front sheet of acrylic — each at its own Z.
 * Rotating the assembly slides those layers against each other, and that
 * parallax is what reads as thickness. Nothing rotates on its own; the whole
 * thing turns together, the way a slab does when you tilt it in your hand.
 */
export function Slab({
  encased,
  label = 'Lenticular',
  sublabel,
  serial,
  tint = '#e9eae4',
  texture = 'clear',
  grade = '10',
  onAngle,
  children,
}: SlabProps) {
  const rig = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 140, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-1, 1], [-17, 17]), spring);
  const rotateX = useSpring(useTransform(py, [-1, 1], [13, -13]), spring);
  const shine = useTransform(px, [-1, 1], ['18%', '82%']);
  const lift = useSpring(useTransform(py, [-1, 1], [10, -10]), spring);

  const track = useCallback(
    (event: PointerEvent) => {
      const node = rig.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      // Beyond the case the angle keeps reading, just gently, so the card is
      // alive whenever the pointer is anywhere near it.
      const clamp = (v: number) => Math.max(-1.4, Math.min(1.4, v));
      px.set(clamp(x));
      py.set(clamp(y));
      onAngle?.(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    },
    [px, py, onAngle],
  );

  useEffect(() => {
    const reset = () => {
      px.set(0);
      py.set(0);
      onAngle?.(0, 0);
    };
    window.addEventListener('pointermove', track, { passive: true });
    document.addEventListener('pointerleave', reset);
    return () => {
      window.removeEventListener('pointermove', track);
      document.removeEventListener('pointerleave', reset);
    };
  }, [track, px, py, onAngle]);

  return (
    <div className="rig" ref={rig}>
      <motion.div
        className="slab3d"
        data-encased={encased}
        data-texture={texture}
        style={{ rotateX, rotateY, y: lift, ['--tint' as string]: tint }}
      >
        {/* Backing plate, furthest from the eye. */}
        <div className="slab-back" />

        {/* The shell and its printed label. */}
        <div className="slab-body">
          <div className="slab-label">
            <div className="slab-id">
              <span className="slab-brand">
                <span className="slab-chip" />
                LENTICARD
              </span>
              <span className="slab-title">{label}</span>
              {sublabel && <span className="slab-sub">{sublabel}</span>}
            </div>
            <div className="slab-grade">
              <span className="slab-grade-w">GEM MINT</span>
              <span className="slab-grade-n">{grade}</span>
            </div>
          </div>
          <div className="slab-well" />
          {serial && <div className="slab-serial">{serial}</div>}
        </div>

        {/* The card, floating inside the acrylic. */}
        <motion.div
          className="slab-card"
          animate={
            encased
              ? { y: '0%', scale: 1, z: 10, rotateZ: 0, opacity: 1 }
              : { y: ['0%', '-62%', '-6%'], scale: [1, 1.06, 1.22], z: 90, rotateZ: [0, -3.5, 0] }
          }
          transition={{
            duration: encased ? 0.7 : 1.05,
            times: encased ? undefined : [0, 0.55, 1],
            ease: EASE,
          }}
        >
          {children}
        </motion.div>

        {/* Front sheet of acrylic: the only layer that carries a hard specular. */}
        <motion.div className="slab-glass" style={{ ['--shine' as string]: shine }} />

        {/* The four cut edges, which is what actually says "thick". */}
        <span className="slab-edge slab-edge-t" />
        <span className="slab-edge slab-edge-b" />
        <span className="slab-edge slab-edge-l" />
        <span className="slab-edge slab-edge-r" />
      </motion.div>
    </div>
  );
}
