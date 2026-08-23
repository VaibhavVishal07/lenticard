import { motion } from 'motion/react';
import { MoonStars, Sun } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { Theme } from '../lib/theme';

interface DockProps {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  children: ReactNode;
}

/**
 * The only navigation. It sits at the bottom because the card is the subject
 * and the subject belongs at eye level — a bar across the top pushes it down
 * and turns the page into a document with a header.
 */
export function Dock({ theme, onTheme, children }: DockProps) {
  return (
    <motion.div
      className="dock"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      <span className="mark">
        <span className="mark-chip" aria-hidden />
        lenticard
      </span>

      <span className="dock-sep" aria-hidden />

      <div className="dock-actions">{children}</div>

      <button
        className="icon-btn"
        onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        {theme === 'dark' ? (
          <Sun size={16} weight="light" />
        ) : (
          <MoonStars size={16} weight="light" />
        )}
      </button>
    </motion.div>
  );
}
