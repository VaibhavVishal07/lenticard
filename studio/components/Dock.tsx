import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * The only navigation, at the bottom, because the card is the subject and a bar
 * across the top pushes it down the page.
 */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="dock-rail">
      <motion.div
        className="dock"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="dock-actions">{children}</div>
      </motion.div>
    </div>
  );
}
