import { motion } from 'motion/react';
import { ArrowUpRight, Sliders } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { CardField } from './CardField';

const EASE = [0.32, 0.72, 0, 1] as const;

interface LandingProps {
  /** The live hero card, rendered by the parent so it keeps its ref. */
  hero: ReactNode;
  onMakeOne: () => void;
  onOpenStudio: () => void;
  replyTo?: string;
}

/**
 * One fold, nothing below it. The card is the argument, so the page is built as
 * a stage around it: a field of cards receding into the dark, the real one lit
 * at the front, and two ways forward. Everything else lives behind the nav.
 */
export function Landing({ hero, onMakeOne, onOpenStudio, replyTo }: LandingProps) {
  return (
    <main className="landing" id="stage">
      <CardField />
      <div className="landing-vignette" aria-hidden />

      <div className="landing-inner">
        <div className="hero-copy">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            {replyTo ? (
              <>
                Send one back
                <br />
                to <em>{replyTo}</em>
              </>
            ) : (
              <>
                Give someone a card
                <br />
                they have to <em>tilt</em>
              </>
            )}
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: EASE }}
          >
            Two or three photos become one card that changes as you move it, the way
            a printed lenticular card does. Write a note, send the link, and they open
            something with your name on it.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.22, ease: EASE }}
          >
            <button className="btn btn-solid btn-lg" onClick={onMakeOne}>
              Make one for someone
              <span className="btn-well">
                <ArrowUpRight size={13} weight="bold" />
              </span>
            </button>
            <button className="btn btn-outline" onClick={onOpenStudio}>
              <Sliders size={15} weight="light" />
              Open the editor
            </button>
          </motion.div>

          <motion.p
            className="hero-foot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.36 }}
          >
            Free, and nothing expires.
          </motion.p>
        </div>

        <motion.div
          className="hero-card"
          initial={{ opacity: 0, y: 60, rotateX: 16 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 66, damping: 15, mass: 1.1 }}
        >
          {hero}
        </motion.div>
      </div>
    </main>
  );
}
