import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const EASE = [0.32, 0.72, 0, 1] as const;

export type CaseTexture = 'clear' | 'frosted' | 'carbon' | 'holo';

export const CASE_TEXTURES: Array<{ id: CaseTexture; label: string }> = [
  { id: 'clear', label: 'Gloss' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'carbon', label: 'Textured' },
  { id: 'holo', label: 'Holo edge' },
];

/**
 * The stripe down the label. The label itself stays white on every one of
 * these, because a grading label is a document and documents are read.
 */
export const CASE_TINTS = [
  { id: 'red', label: 'Red', value: '#d5352b' },
  { id: 'ink', label: 'Ink', value: '#1b1d22' },
  { id: 'gold', label: 'Gold', value: '#b8912f' },
  { id: 'green', label: 'Green', value: '#1c7a4f' },
  { id: 'blue', label: 'Blue', value: '#2657b8' },
  { id: 'violet', label: 'Violet', value: '#6b3fc4' },
];

interface SlabProps {
  encased: boolean;
  /** The card's name, printed as the middle line of the label. */
  label?: string;
  /** The set line above the name. */
  sublabel?: string;
  serial?: string;
  tint?: string;
  texture?: CaseTexture;
  grade?: string;
  onAngle?: (x: number, y: number) => void;
  /** False parks it flat and stops it listening. */
  interactive?: boolean;
  children: ReactNode;
}

/** Fixed-looking but deterministic bar widths, so the barcode never reflows. */
const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1];

/**
 * A graded holder.
 *
 * Built from a real one: a black acrylic shell with stepped ledges, a recessed
 * tray holding a white label, and the card suspended in a well below it. The
 * label carries what a grader's label carries — set line, name, number, a large
 * grade, the sub-grades, a cert number and a barcode — because that is the part
 * people actually read, and it is white for the same reason.
 *
 * Depth is real: the backing plate, shell, card and front sheet each sit at
 * their own Z, so rotating the assembly slides them against each other.
 */
export function Slab({
  encased,
  label = 'Lenticular',
  sublabel = 'LENTICARD',
  serial = 'LC-0000000',
  tint = '#d5352b',
  texture = 'clear',
  grade = '10',
  onAngle,
  interactive = true,
  children,
}: SlabProps) {
  const rig = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 150, damping: 21, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-1, 1], [-16, 16]), spring);
  const rotateX = useSpring(useTransform(py, [-1, 1], [12, -12]), spring);
  const shine = useTransform(px, [-1, 1], ['16%', '84%']);

  const track = useCallback(
    (event: PointerEvent) => {
      const node = rig.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const hold = (v: number) => Math.max(-1.3, Math.min(1.3, v));
      px.set(hold(x));
      py.set(hold(y));
      onAngle?.(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    },
    [px, py, onAngle],
  );

  useEffect(() => {
    if (!interactive) {
      px.set(0);
      py.set(0);
      return;
    }
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
  }, [track, px, py, onAngle, interactive]);

  return (
    <div className="rig" ref={rig}>
      <motion.div
        className="slab"
        data-encased={encased}
        data-texture={texture}
        style={{ rotateX, rotateY, ['--tint' as string]: tint }}
      >
        <div className="slab-back" />

        <div className="slab-shell">
          {/* The recessed tray the label sits in. */}
          <div className="lab-tray">
            <div className="lab">
              <div className="lab-main">
                <div className="lab-left">
                  <span className="lab-set">{sublabel}</span>
                  <span className="lab-name">{label}</span>
                  <span className="lab-num">LENTICULAR · 3 FRAME</span>
                </div>
                <div className="lab-grade">
                  <span className="lab-grade-w">GEM MINT</span>
                  <span className="lab-grade-n">{grade}</span>
                </div>
              </div>


              <div className="lab-foot">
                <span className="lab-bars" aria-hidden>
                  {BARS.map((w, i) => (
                    <i key={i} style={{ width: `${w}px` }} />
                  ))}
                </span>
                <span className="lab-cert">{serial}</span>
              </div>
            </div>
          </div>

          {/* The ledge between label and card, and the well itself. */}
          <div className="slab-ledge" />
          <div className="slab-well">
            <span className="slab-tab" aria-hidden />
          </div>
        </div>

        <motion.div
          className="slab-card"
          animate={
            encased
              ? { y: '0%', scale: 1, z: 14, rotateZ: 0 }
              : { y: ['0%', '-58%', '-8%'], scale: [1, 1.04, 1.24], z: 110, rotateZ: [0, -3, 0] }
          }
          transition={{
            duration: encased ? 0.72 : 1.1,
            times: encased ? undefined : [0, 0.55, 1],
            ease: EASE,
          }}
        >
          {children}
        </motion.div>

        <motion.div className="slab-glass" style={{ ['--shine' as string]: shine }} />

        <span className="slab-edge slab-edge-t" />
        <span className="slab-edge slab-edge-b" />
        <span className="slab-edge slab-edge-l" />
        <span className="slab-edge slab-edge-r" />
      </motion.div>
    </div>
  );
}
