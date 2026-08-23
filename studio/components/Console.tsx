import { AnimatePresence, motion } from 'motion/react';
import { CaretDown } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export interface ConsoleTab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface ConsoleProps {
  tabs: ConsoleTab[];
  active: string | null;
  onSelect: (id: string | null) => void;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Controls live in a dock floating over the work rather than in a sidebar
 * pinned beside it. The card is the thing being made, so it keeps the room;
 * a panel opens upward only while you are actually adjusting something.
 */
export function Console({ tabs, active, onSelect, actions, children }: ConsoleProps) {
  return (
    <div className="console">
      <div className="console-inner">
        <AnimatePresence initial={false}>
          {active && (
            <motion.div
              className="console-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
              style={{ overflow: 'hidden', borderTop: 'none', borderBottom: '1px solid var(--hair)' }}
            >
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.06, ease: [0.32, 0.72, 0, 1] }}
              >
                {children}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="console-tabs" role="tablist" aria-label="Card controls">
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                className="console-tab"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(selected ? null : tab.id)}
              >
                {selected && (
                  <motion.span
                    className="pill"
                    layoutId="console-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 40 }}
                  />
                )}
                {tab.icon}
                {tab.label}
              </button>
            );
          })}

          <span className="console-spacer" />

          {active && (
            <button
              className="icon-btn"
              onClick={() => onSelect(null)}
              aria-label="Collapse controls"
            >
              <CaretDown size={15} weight="light" />
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
