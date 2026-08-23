import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { LenticularCard } from '../../src/react/LenticularCard';
import { buildIntroFrames, LOADING_STEPS } from '../lib/intro';
import type { Theme } from '../lib/theme';

interface IntroProps {
  theme: Theme;
  /** Set once the studio has its frames ready and can take over. */
  ready: boolean;
  onDone: () => void;
}

/** Long enough to watch one full flip, short enough not to be in the way. */
const MINIMUM_MS = 3000;
const STEP_MS = 620;

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * The loading state is the pitch: three panels interlaced into one card that
 * sweeps itself, with the print-shop steps ticking over underneath.
 */
export function Intro({ theme, ready, onDone }: IntroProps) {
  const [elapsed, setElapsed] = useState(false);
  const [step, setStep] = useState(0);
  const frames = useMemo(() => buildIntroFrames(theme === 'dark'), [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => setElapsed(true), MINIMUM_MS);
    const ticker = window.setInterval(
      () => setStep((s) => (s + 1) % LOADING_STEPS.length),
      STEP_MS,
    );
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (ready && elapsed) onDone();
  }, [ready, elapsed, onDone]);

  // Skipping is always available — nobody should sit through it twice.
  useEffect(() => {
    window.addEventListener('keydown', onDone);
    return () => window.removeEventListener('keydown', onDone);
  }, [onDone]);

  return (
    <motion.div
      className="intro"
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(16px)' }}
      transition={{ duration: 0.6, ease: EASE }}
      onClick={onDone}
      role="status"
      aria-label="Loading lenticard"
    >
      <div className="intro-inner">
        <motion.p
          className="intro-hello"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="intro-dot" aria-hidden />
          lenticard
        </motion.p>

        <motion.div
          className="intro-card"
          initial={{ opacity: 0, y: 64, rotateX: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 78, damping: 15, mass: 1.1 }}
        >
          <LenticularCard
            images={frames}
            orientation="landscape"
            motion="auto"
            lenticules={132}
            interlace={0.3}
            parallax={1.2}
            blend={0.24}
            sheen={0.34}
            tilt={11}
            float={7}
            radius={22}
          />
        </motion.div>

        <motion.div
          className="intro-foot"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.55, ease: EASE }}
        >
          <span className="intro-bar" aria-hidden>
            <span />
          </span>

          <span className="intro-step">
            <AnimatePresence mode="wait">
              <motion.span
                key={step}
                initial={{ opacity: 0, y: 9 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -9 }}
                transition={{ duration: 0.26, ease: EASE }}
              >
                {LOADING_STEPS[step]}
              </motion.span>
            </AnimatePresence>
          </span>

          <span className="intro-skip">press anything to skip</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function IntroLayer(props: IntroProps & { show: boolean }) {
  const { show, ...rest } = props;
  return <AnimatePresence>{show && <Intro {...rest} />}</AnimatePresence>;
}
