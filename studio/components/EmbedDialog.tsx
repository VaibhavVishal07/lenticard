import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, DownloadSimple, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { CardSettings } from '../lib/presets';
import { configSnippet, elementSnippet, reactSnippet, vanillaSnippet } from '../lib/snippets';

type TabId = 'react' | 'element' | 'vanilla' | 'json';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'react', label: 'React' },
  { id: 'element', label: 'Web component' },
  { id: 'vanilla', label: 'Vanilla JS' },
  { id: 'json', label: 'Config' },
];

interface EmbedDialogProps {
  open: boolean;
  /** Paths as they should appear in the snippet, not the live blob URLs. */
  images: string[];
  /** Whether the real frames are tab-local, which changes the advice below. */
  local: boolean;
  settings: CardSettings;
  caption: string;
  onClose: () => void;
  onDownloadHtml: () => void;
}

export function EmbedDialog({
  open,
  images,
  local,
  settings,
  caption,
  onClose,
  onDownloadHtml,
}: EmbedDialogProps) {
  const [tab, setTab] = useState<TabId>('react');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    switch (tab) {
      case 'react':
        return reactSnippet(images, settings, caption, local);
      case 'element':
        return elementSnippet(images, settings, caption, local);
      case 'vanilla':
        return vanillaSnippet(images, settings, caption, local);
      case 'json':
        return configSnippet(settings, caption);
    }
  }, [tab, images, settings, caption, local]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => setCopied(false), [tab, open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Embed this card"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-inner">
            <div className="dialog-head">
              <h2>Put this card in your project</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={16} weight="light" />
              </button>
            </div>

            <div className="dialog-tabs" role="tablist">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  className="console-tab"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <pre className="code">
              <code>{code}</code>
            </pre>

            <div className="dialog-foot">
              <span className="note">
                {local
                  ? 'Your uploads live only in this tab. Download the self-contained file to share the card as-is.'
                  : 'These frames are already public URLs, so the snippet will work as pasted.'}
              </span>
              <button className="btn btn-outline" onClick={onDownloadHtml}>
                <DownloadSimple size={15} weight="light" />
                Self-contained .html
              </button>
              <button className="btn btn-solid" onClick={copy}>
                {copied ? 'Copied' : 'Copy code'}
                <span className="btn-well">
                  {copied ? (
                    <Check size={13} weight="bold" />
                  ) : (
                    <Copy size={13} weight="light" />
                  )}
                </span>
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
