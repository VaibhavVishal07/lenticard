import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const EASE = [0.32, 0.72, 0, 1] as const;

export type CaseKind = 'slab' | 'toploader' | 'sleeve' | 'pack';

/**
 * What the card is sold in.
 *
 * These replaced a row of colour swatches. A red holder and a blue holder are
 * the same object twice; a graded slab, a toploader, a soft sleeve and a
 * heat-sealed pack are four different things to be handed, and which one it
 * arrives in says more than what colour it is.
 *
 * Every kind still carries the printing somewhere on the case — a label, a
 * foot strip, a flap, a header — because the card itself stays pristine.
 */
export const CASE_KINDS: Array<{ id: CaseKind; label: string; hint: string }> = [
  { id: 'slab', label: 'Graded slab', hint: 'Rigid acrylic holder with a grading label' },
  { id: 'toploader', label: 'Toploader', hint: 'Clear rigid sleeve, printing along the foot' },
  { id: 'sleeve', label: 'Sleeve', hint: 'Soft poly sleeve with a folded flap' },
  { id: 'pack', label: 'Sealed pack', hint: 'Heat-sealed bag with a printed header' },
];

interface SlabProps {
  encased: boolean;
  /** The card's name, printed as the middle line of the label. */
  label?: string;
  /** How many frames are actually in the card, for the label's number line. */
  frames?: number;
  /** The set line above the name. */
  sublabel?: string;
  serial?: string;
  /** What the card is sold in. */
  kind?: CaseKind;
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
  frames = 3,
  kind = 'slab',
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

  // The case tilts only under the pointer. Listening on the window meant it
  // swung around while you were reading something on the other side of the
  // page, which reads as a thing wobbling on its own rather than a thing you
  // are holding.
  useEffect(() => {
    const node = rig.current;
    const rest = () => {
      px.set(0);
      py.set(0);
    };
    if (!node || !interactive) {
      rest();
      return;
    }
    const leave = () => {
      rest();
      onAngle?.(0, 0);
    };
    node.addEventListener('pointermove', track, { passive: true });
    node.addEventListener('pointerleave', leave);
    return () => {
      node.removeEventListener('pointermove', track);
      node.removeEventListener('pointerleave', leave);
      rest();
    };
  }, [track, px, py, onAngle, interactive]);;

  return (
    <div className="rig" ref={rig}>
      <motion.div
        className="slab"
        data-encased={encased}
        data-kind={kind}
        style={{ rotateX, rotateY }}
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
                  <span className="lab-num">
                    LENTICULAR{frames ? ` · ${frames} FRAME` : ' · UNFILLED'}
                  </span>
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

        {/* Soft plastic. The crinkle is what separates a bag from a box — a
            flat clear rectangle reads as glass no matter how it is tinted. */}
        {(kind === 'sleeve' || kind === 'pack') && (
          <span className="slab-crinkle" aria-hidden />
        )}
        {kind === 'sleeve' && <span className="slab-flap" aria-hidden />}
        {kind === 'pack' && <span className="slab-seal" aria-hidden />}

        <span className="slab-edge slab-edge-t" />
        <span className="slab-edge slab-edge-b" />
        <span className="slab-edge slab-edge-l" />
        <span className="slab-edge slab-edge-r" />
      </motion.div>
    </div>
  );
}
