import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Copy, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { OCCASIONS, type Occasion } from '../lib/occasions';
import type { CardSettings } from '../lib/presets';
import { diffFromDefaults } from '../lib/presets';
import { encodePayload, packFrames, SHARE_VERSION, SIZE_WARNING } from '../lib/share';
import { store } from '../lib/stores';

interface GiftDialogProps {
  open: boolean;
  images: string[];
  settings: CardSettings;
  caption: string;
  /** Prefilled when replying to a card someone sent. */
  replyTo?: string;
  onClose: () => void;
  onError: (message: string) => void;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function GiftDialog({
  open,
  images,
  settings,
  caption,
  replyTo,
  onClose,
  onError,
}: GiftDialogProps) {
  const [occasion, setOccasion] = useState<Occasion>(OCCASIONS[OCCASIONS.length - 1]);
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [size, setSize] = useState(0);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (replyTo) setTo(replyTo);
  }, [replyTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // A change to any input invalidates the link that was already built.
  useEffect(() => {
    setLink('');
    setCopied(false);
  }, [occasion, to, from, note, images, settings, caption]);

  async function build() {
    if (working || images.length < 2) return;
    setWorking(true);
    try {
      const packed = await packFrames(images);
      const bytes = await encodePayload({
        meta: {
          v: SHARE_VERSION,
          from: from.trim() || undefined,
          note: (note.trim() || occasion.prompt).slice(0, 240),
          occasion: occasion.id,
          caption: caption || undefined,
          settings: diffFromDefaults(settings),
          mime: packed.mime,
        },
        frames: packed.frames,
      });
      const url = await store.save(bytes);
      setLink(url);
      setSize(url.length);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1900);
    } catch {
      setCopied(false);
    }
  }

  async function send() {
    const text = to.trim()
      ? `${to.trim()} — I made you a lenticular card. Tilt it.`
      : 'I made you a lenticular card. Tilt it.';
    if (navigator.share) {
      // The native sheet is the whole point on a phone: it opens the thread.
      await navigator.share({ title: 'A card for you', text, url: link }).catch(() => undefined);
    } else {
      await copy();
    }
  }

  const heavy = link.length > SIZE_WARNING;

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
            aria-label="Send this card"
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: EASE }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-inner">
              <div className="dialog-head">
                <h2>Send it to someone</h2>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                  <X size={16} weight="light" />
                </button>
              </div>

              <div className="gift-body">
                <div className="field">
                  <span className="field-label">What is it for</span>
                  <div className="choices">
                    {OCCASIONS.map((item) => (
                      <button
                        key={item.id}
                        className="choice"
                        aria-pressed={item.id === occasion.id}
                        onClick={() => setOccasion(item)}
                      >
                        {item.id === occasion.id && (
                          <motion.span className="pill" layoutId="occasion-pill" />
                        )}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gift-names">
                  <div className="field">
                    <label className="field-label" htmlFor="gift-to">
                      To
                    </label>
                    <input
                      id="gift-to"
                      className="text-input"
                      value={to}
                      placeholder="Their name"
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="gift-from">
                      From
                    </label>
                    <input
                      id="gift-from"
                      className="text-input"
                      value={from}
                      placeholder="Your name"
                      onChange={(event) => setFrom(event.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="gift-note">
                    A note
                    <span className="field-value">{note.length}/240</span>
                  </label>
                  <textarea
                    id="gift-note"
                    className="text-input"
                    rows={2}
                    maxLength={240}
                    value={note}
                    placeholder={occasion.prompt}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>

                {link ? (
                  <div className="field">
                    <span className="field-label">
                      Their link
                      <span className="field-value">
                        {store.short ? 'hosted' : `${Math.round(size / 1024)} KB in the link`}
                      </span>
                    </span>
                    <input className="text-input link-out" readOnly value={link} />
                    {heavy && (
                      <p className="gift-warn">
                        That is a long link. It will paste fine, but some apps shorten
                        what they show. Drop a frame to make it lighter.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="gift-hint">
                    The card travels inside the link, so there is no account and nothing
                    expires. Whoever opens it sees a sealed card with your name on it.
                  </p>
                )}
              </div>

              <div className="dialog-foot">
                <span className="note">
                  {images.length < 2
                    ? 'Add at least two frames first.'
                    : `${images.length} frames · ${occasion.label.toLowerCase()}`}
                </span>

                {link ? (
                  <>
                    <button className="btn btn-outline" onClick={() => void copy()}>
                      {copied ? <Check size={15} weight="bold" /> : <Copy size={15} weight="light" />}
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                    <button className="btn btn-solid" onClick={() => void send()}>
                      Send it
                      <span className="btn-well">
                        <PaperPlaneTilt size={13} weight="bold" />
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-solid"
                    onClick={() => void build()}
                    disabled={working || images.length < 2}
                  >
                    {working ? 'Wrapping it…' : 'Wrap the card'}
                    <span className="btn-well">
                      <ArrowUpRight size={13} weight="bold" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
