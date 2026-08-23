import { Check, Copy, PaperPlaneTilt, WhatsappLogo, XLogo } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { OCCASIONS, type Occasion } from '../lib/occasions';
import { diffFromDefaults, type CardSettings } from '../lib/presets';
import { encodePayload, packFrames, SHARE_VERSION, SIZE_WARNING } from '../lib/share';
import { store } from '../lib/stores';

interface SendPanelProps {
  images: string[];
  settings: CardSettings;
  title: string;
  themeId: string;
  layout: string;
  tint: string;
  texture: string;
  replyTo?: string;
  onError: (message: string) => void;
}

/**
 * Sending, as a panel beside the card rather than a dialog over it. On a wide
 * screen the thing being sent stays in view the whole time, which is the point;
 * on a phone the panel simply stacks under it.
 */
export function SendPanel({
  images,
  settings,
  title,
  themeId,
  layout,
  tint,
  texture,
  replyTo,
  onError,
}: SendPanelProps) {
  const [occasion, setOccasion] = useState<Occasion>(OCCASIONS[OCCASIONS.length - 1]);
  const [to, setTo] = useState(replyTo ?? '');
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Any change invalidates the link that was already built.
  useEffect(() => {
    setLink('');
    setCopied(false);
  }, [occasion, to, from, note, images, settings, title]);

  async function build(): Promise<string> {
    if (link) return link;
    const packed = await packFrames(images);
    const bytes = await encodePayload({
      meta: {
        v: SHARE_VERSION,
        from: from.trim() || undefined,
        note: (note.trim() || occasion.prompt).slice(0, 240),
        occasion: occasion.id,
        caption: title,
        theme: themeId,
        layout,
        tint,
        texture,
        settings: diffFromDefaults(settings),
        mime: packed.mime,
      },
      frames: packed.frames,
    });
    const url = await store.save(bytes);
    setLink(url);
    return url;
  }

  async function run(action: (url: string) => void | Promise<void>) {
    if (working || images.length < 2) return;
    setWorking(true);
    try {
      await action(await build());
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const message = () =>
    to.trim()
      ? `${to.trim()} — I made you a lenticular trading card. Tilt it.`
      : 'I made you a lenticular trading card. Tilt it.';

  return (
    <div className="send">
      <div className="step-head">
        <h2>Send it</h2>
        <p>The card travels inside the link. No account, nothing expires.</p>
      </div>

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
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="two-up">
        <div className="field">
          <label className="field-label" htmlFor="send-to">To</label>
          <input
            id="send-to"
            className="text-input"
            value={to}
            placeholder="Their name"
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="send-from">From</label>
          <input
            id="send-from"
            className="text-input"
            value={from}
            placeholder="You"
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="send-note">A note</label>
        <textarea
          id="send-note"
          className="text-input"
          rows={2}
          maxLength={240}
          value={note}
          placeholder={occasion.prompt}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* On a phone the share sheet is the whole point: it opens the thread. */}
      <div className="send-actions">
        {canShare && (
          <button
            className="btn btn-holo btn-lg send-primary"
            disabled={working || images.length < 2}
            onClick={() =>
              void run(async (url) => {
                await navigator
                  .share({ title: 'A card for you', text: message(), url })
                  .catch(() => undefined);
              })
            }
          >
            <PaperPlaneTilt size={16} weight="bold" />
            {working ? 'Wrapping…' : 'Share'}
          </button>
        )}

        <button
          className={`btn ${canShare ? 'btn-outline' : 'btn-holo btn-lg send-primary'}`}
          disabled={working || images.length < 2}
          onClick={() =>
            void run(async (url) => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1900);
            })
          }
        >
          {copied ? <Check size={15} weight="bold" /> : <Copy size={15} weight="light" />}
          {copied ? 'Copied' : working ? 'Wrapping…' : 'Copy link'}
        </button>

        <button
          className="btn btn-outline"
          disabled={working || images.length < 2}
          onClick={() =>
            void run((url) => {
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`${message()} ${url}`)}`,
                '_blank',
                'noopener',
              );
            })
          }
        >
          <WhatsappLogo size={16} weight="fill" />
          WhatsApp
        </button>

        <button
          className="btn btn-outline"
          disabled={working || images.length < 2}
          onClick={() =>
            void run((url) => {
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(message())}&url=${encodeURIComponent(url)}`,
                '_blank',
                'noopener',
              );
            })
          }
        >
          <XLogo size={15} weight="fill" />
          Post
        </button>
      </div>

      {link && (
        <div className="field">
          <span className="field-label">
            Their link
            <span className="field-value">
              {store.short ? 'hosted' : `${Math.round(link.length / 1024)} KB`}
            </span>
          </span>
          <input className="text-input link-out" readOnly value={link} />
          {link.length > SIZE_WARNING && (
            <p className="hint-warn">
              A long link. It pastes fine, but some apps shorten what they show.
              Drop a photo to make it lighter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
