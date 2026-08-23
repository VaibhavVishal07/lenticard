import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

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
  /** True while the card is sealed in the case. */
  encased: boolean;
  /** Printed large on the label. */
  label?: string;
  /** Printed small, under the label. */
  sublabel?: string;
  /** Serial along the foot. */
  serial?: string;
  /** Label stock colour. */
  tint?: string;
  texture?: CaseTexture;
  grade?: string;
  children: ReactNode;
}

/**
 * The acrylic case a graded card ships in.
 *
 * It exists for the moment it ends: sliding the card out is what makes the card
 * feel like an object worth having. So the shell is a sibling of the card
 * rather than its parent — the card never unmounts, never loses its WebGL
 * context, and simply rises out of a case that falls away behind it.
 */
export function Slab({
  encased,
  label = 'Lenticular',
  sublabel,
  serial,
  tint = '#e9eae4',
  texture = 'clear',
  grade = '10',
  children,
}: SlabProps) {
  return (
    <div className="encase" data-encased={encased}>
      <AnimatePresence>
        {encased && (
          <motion.div
            className="slab"
            data-texture={texture}
            style={{ ['--tint' as string]: tint }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, y: 28, filter: 'blur(6px)' }}
            transition={{ duration: 0.62, ease: EASE }}
            aria-hidden
          >
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
            <div className="slab-gloss" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="encase-card"
        animate={encased ? { y: 0, scale: 1 } : { y: [0, -20, 0], scale: 1.1 }}
        transition={{
          y: { duration: 0.78, ease: EASE },
          scale: { duration: 0.62, ease: EASE },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
