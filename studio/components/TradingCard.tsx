import { forwardRef, type ReactNode } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../../src/react/LenticularCard';
import { Turn } from './Turn';
import type { CardCopy, CardLayout, CardTheme } from '../lib/themes';

interface TradingCardProps {
  photos: string[];
  /** The plain photograph, shown when nothing is on the card. */
  still?: string;
  /** What the empty art window says before there are any photos. */
  emptyNote?: string;
  /** The print at several angles, blended by the cursor. Stands in for a live
      lens on the belt, where browsers cap WebGL contexts well below the number
      of cases on screen. */
  views?: string[];
  /** The photograph's own shape. A full bleed card takes it, so nothing of
      what you uploaded is trimmed to suit a standard card. */
  ratio?: number;
  /** The photograph's strongest colour, for whatever the template outlines
      the card with — so the frame looks like it belongs to the picture. */
  tint?: string;
  /** Let the card turn itself now and then, until someone points at it. */
  demo?: boolean;
  theme: CardTheme;
  copy: CardCopy;
  layout: CardLayout;
  lenticules: number;
  parallax: number;
  blend: number;
  sheen: number;
  /** 'none' when something else drives the angle, 'pointer' when nothing does. */
  drive?: 'none' | 'pointer';
  onError?: (error: Error) => void;
}

/**
 * The reverse of the card.
 *
 * Rendered as its own object rather than as a second face inside the card,
 * because the card does not turn on its own: it is sealed inside a holder, and
 * what turns is the holder with the card in it. So this is handed to the case,
 * which mounts it on the back of the same well the front is in — the two faces
 * are the two sides of one printed thing, and the assembly they are inside is
 * the part that rotates.
 *
 * A lenticular message rather than a printed one: the same words are stacked
 * at three depths, and because each layer sits further back than the one over
 * it and slides at its own rate, turning the card pulls them apart and pushes
 * them together again. That parallax *is* the depth — there is no 3D model
 * here, only three copies of a sentence moving at different speeds, which is
 * exactly how a lenticular postcard does it.
 *
 * Over the top: the ridge array the message is printed under, and a specular
 * band that travels across the ridges as the card turns, so the surface reads
 * as ribbed plastic catching a light rather than as flat board.
 *
 * The deep layers are aria-hidden. To a screen reader this is one message, not
 * the same sentence three times.
 */
/**
 * A line of handwriting, a character at a time.
 *
 * Two things this has to get right that a plain string does not.
 *
 * Words stay whole. Every character is its own inline-block so it can be
 * animated and nudged off the baseline, and the browser will happily break a
 * line between any two inline-level boxes — which split "terrible" across two
 * lines as "terrib / le". So the characters of a word are wrapped in a box
 * that will not break, and the spaces between those boxes are left as plain
 * text, which is the only place a break is now possible.
 *
 * All three depth layers are built the same way. Boxing each glyph changes
 * where the glyphs land — kerning goes, widths round differently — so a layer
 * drawn as a plain string no longer sits under one drawn per character, and
 * the parallax that was meant to read as depth read as a misprint instead.
 * Same markup on every layer, and they line up.
 */
function hand(text: string, live: boolean, withNib: boolean) {
  let index = 0;
  const parts = text.split(/(\s+)/);
  const lastWord = parts.reduce((last, p, i) => (/^\s+$/.test(p) || !p ? last : i), -1);

  return parts.map((part, partIndex) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) {
      index += part.length;
      return part;
    }
    return (
      <span className="ink-word" key={partIndex}>
        {[...part].map((ch) => {
          const i = index++;
          return (
            <span
              key={i}
              className={live ? 'ink' : 'ink ink-still'}
              style={{
                /* A hand does not sit on the baseline, and no two letters
                   lean the same way. Both come off the character's own
                   position, so they never change once written. */
                ['--lift' as string]: `${((i * 37) % 7) / 10 - 0.3}px`,
                ['--lean' as string]: `${((i * 53) % 5) / 4 - 0.5}deg`,
              }}
            >
              {ch}
            </span>
          );
        })}
        {/* The nib rests where the writing stopped. It rides at the end of
            the last word, so it moves along as words are added and sits
            waiting between them — which is what a pen in a hand does.

            It goes into every colour pass and is only shown on the top one.
            In the top layer alone it made that layer a nib wider than the
            two beneath, so its last line wrapped somewhere else and the
            passes came apart into a smear on that line only. Hidden rather
            than absent: visibility keeps the space. */}
        {withNib && partIndex === lastWord && (
          <span className={live ? 'nib' : 'nib nib-ghost'} aria-hidden />
        )}
      </span>
    );
  });
}

export function CardReverse({
  secret,
  from,
  theme,
  title,
  tint,
  writing = false,
}: {
  secret: string;
  from?: string;
  theme: CardTheme;
  title: string;
  /** The photograph's own colour, so both faces are lit by the same picture. */
  tint?: string;
  /** True while somebody is actually writing this, which is the only time
      a pen should be resting on the card. */
  writing?: boolean;
}) {
  const written = secret.trim();

  /**
   * How big the hand is, off how much there is of it.
   *
   * The card is a fixed shape, so the only variable is how much was
   * written. Five steps rather than three, so a short note is properly
   * large instead of being dropped to the size a long one needs, and the
   * smallest step is still set at a size that can be read — which it can
   * be, because the field will not accept more than fits.
   */
  const weight =
    written.length > 118
      ? 'xs'
      : written.length > 88
        ? 'sm'
        : written.length > 58
          ? 'md'
          : written.length > 30
            ? 'lg'
            : 'xl';

  /**
   * The size itself, off the same length, but continuous.
   *
   * Five steps meant a note one character past a boundary dropped a whole
   * size, and the drop was visible while somebody was still typing. This is
   * the same curve the steps were approximating, so a short note is set much
   * larger than it was and the longest one the field will take still lands
   * where it used to — which is the size that fits.
   */
  const size = written.length
    ? Math.min(12.6, Math.max(6.2, 32 / Math.pow(written.length, 0.33)))
    : 12;

  return (
    <div
      className="tc-back"
      style={{
        ['--board' as string]: theme.board,
        ['--ink' as string]: theme.ink,
        ['--accent' as string]: tint ?? theme.accent,
      }}
    >
      <span className="tc-back-weave" aria-hidden />
      <span className="tc-back-guilloche" aria-hidden />
      <span className="tc-back-glow" aria-hidden />
      <span className="tc-back-frame" aria-hidden />

      {/* The house mark, printed big and faint under everything, the way the
          back of a real card carries one. It is the only thing on this face
          that is the same on every card, which is what makes the rest of it
          read as yours. */}
      <span className="tc-back-seal" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>

      <div className="tc-back-top">
        <span className="tc-back-house">
          <i className="tc-back-house-chip" aria-hidden />
          Lenticard
        </span>
        {/* A cancel, the way a posted thing carries one. */}
        <span className="tc-back-post" aria-hidden>
          <b>{theme.glyph}</b>
          <em>{theme.set}</em>
        </span>
      </div>

      <div className="tc-back-inner">
        <span className="tc-back-eyebrow">
          <i aria-hidden>{theme.glyph}</i>
          For your eyes
        </span>

        {/* Empty while it is being written, so the case can turn to the back
            the moment somebody starts and they watch the words land on it
            rather than typing at a card that is facing the other way. */}
        {written ? (
          <div
            className="secret"
            data-size={weight}
            style={{ ['--secret-cqw' as string]: `${size.toFixed(2)}cqw` }}
          >
            {/* The two layers underneath are the parallax and nothing else —
                blurred past reading, and never animated. */}
            <span className="secret-layer secret-deep" aria-hidden>{hand(written, false, writing)}</span>
            <span className="secret-layer secret-mid" aria-hidden>{hand(written, false, writing)}</span>
            {/* The top layer is the one being written. Each character is
                keyed by its position, so React mounts exactly the ones that
                are new and only those lay their ink down — type a letter and
                that letter alone is written. */}
            <span className="secret-layer secret-top">{hand(written, true, writing)}</span>
          </div>
        ) : (
          <p className="secret-waiting">Your message goes here.</p>
        )}

        {from ? <span className="tc-back-sign">— {from}</span> : <span className="tc-back-rule" aria-hidden />}
      </div>

      <div className="tc-back-foot">
        <span className="tc-back-bars" aria-hidden />
        <span className="tc-back-foot-title">{title}</span>
        <span className="tc-back-grade">{theme.rarity}</span>
      </div>

      {/* The lens array, and the light travelling across it. */}
      <span className="tc-back-lens" aria-hidden />
      <span className="tc-back-sweep" aria-hidden />
    </div>
  );
}

/**
 * The card.
 *
 * Only the illustration goes through the lens. Every printed element is DOM on
 * top of the canvas, because text pushed through a lens array is text nobody
 * can read — the lens refracts each ridge a little, and a name smeared across
 * sixty of them stops being a word.
 *
 * Four templates, and they are four different objects rather than one card
 * recoloured: a full bleed, a bordered rookie, a dark chrome insert and a
 * refractor. Each is drawn from a real card — what the stock is made of, where
 * the window is cut, and where the name is struck all change between them.
 */
export const TradingCard = forwardRef<LenticularCardHandle, TradingCardProps>(
  function TradingCard(
    { photos, still, views, ratio, tint, demo, emptyNote, theme, copy, layout, lenticules, parallax, blend, sheen, drive = 'none', onError },
    ref,
  ) {
    const art = (fill: boolean): ReactNode => (
      <div className="tc-art" data-fill={fill}>
        {views && still ? (
          <Turn flat={still} views={views} demo={demo} />
        ) : still ? (
          <img className="tc-still" src={still} alt="" loading="lazy" />
        ) : photos.length < 2 ? (
          /* A lens needs two frames to have anything to refract between, so
             before there are two the window holds the card's own outline and
             says what goes in it. The card is still built — the template, the
             case, the label and the grade are all there — so what you are
             looking at is the thing you are filling rather than a placeholder
             standing in for it. */
          <div className="tc-empty">
            <span className="tc-empty-mark" aria-hidden />
            <span className="tc-empty-note">{emptyNote ?? 'Your photos go here'}</span>
            <span className="tc-empty-count" aria-hidden>
              {photos.length} / 2 minimum
            </span>
          </div>
        ) : (
        <LenticularCard
          ref={ref}
          images={photos}
          width="100%"
          style={{ height: '100%' }}
          axis="vertical"
          orientation={fill ? 'portrait' : 'landscape'}
          lenticules={lenticules}
          parallax={parallax}
          blend={blend}
          sheen={sheen}
          interlace={0.46}
          lens={0.72}
          motion={drive}
          tilt={drive === 'pointer' ? 9 : 0}
          float={0}
          radius={0}
          fit="contain"
          onError={onError}
        />
        )}
        <span className="tc-gloss" aria-hidden />
        <span className="tc-grain" aria-hidden />
      </div>
    );

    return (
      <article
        className="tc"
        data-tpl={layout}
        style={{
          ['--a' as string]: theme.plate[0],
          ['--b' as string]: theme.plate[1],
          ['--board' as string]: theme.board,
          ['--ink' as string]: theme.ink,
          /* Most templates take their accent from the photograph, so the
             frame looks like it belongs to the picture. A gilt card does
             not: the gold is the whole identity of the object, and a
             sigil card outlined in whatever colour the photo happened to be
             is just a dark card with a coloured border. */
          ['--accent' as string]: layout === 'sigil' ? theme.accent : tint ?? theme.accent,
          ['--edge' as string]: tint ?? theme.plate[1],
          ['--ratio' as string]: ratio ? String(ratio) : undefined,
        }}
      >
        {/* --- full bleed: the picture is the card ------------------------ */}
        {layout === 'fullart' && (
          <div className="tc-body">
            {art(true)}
            <span className="tc-vign" aria-hidden />
            <span className="tc-hair" aria-hidden />
          </div>
        )}

        {/* --- rookie: thick border, inner stock, struck name banner ------- */}
        {layout === 'rookie' && (
          <div className="tc-body">
            <div className="tc-inner">
              <div className="tc-window">
                {art(false)}
                <span className="tc-seal" aria-hidden>
                  {theme.glyph}
                </span>
              </div>
              <div className="tc-banner">
                <h2 className="tc-name">{copy.title}</h2>
                <span className="tc-eyebrow">{copy.stage}</span>
              </div>
              <div className="tc-ledger">
                <span>{theme.set}</span>
                <span>
                  {copy.statLabel} {copy.statValue}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- chrome: dark board, cut window, struck outline wordmark ----- */}
        {layout === 'chrome' && (
          <div className="tc-body">
            <span className="tc-hatch" aria-hidden />
            <span className="tc-wordmark" aria-hidden>
              {theme.badge}
            </span>
            <div className="tc-cut">{art(false)}</div>
            <span className="tc-rail" aria-hidden>
              {theme.set} · {theme.rarity}
            </span>
            <div className="tc-foot">
              <div className="tc-foot-name">
                <h2 className="tc-name">{copy.title}</h2>
                <span className="tc-eyebrow">{copy.stage}</span>
              </div>
              <div className="tc-plaque">
                <b>{copy.statValue}</b>
                <span>{copy.statLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* --- marquee: flat colour board, arched wordmark, name on a plate */}
        {layout === 'marquee' && (
          <div className="tc-body">
            {/* The head is a marquee, not a line of type: the set name curves
                across the top of the card in outlined display letters, which
                is the thing that makes a 1972 card recognisable from across a
                room. */}
            <span className="tc-arch" aria-hidden>
              {theme.set}
            </span>
            <div className="tc-port">
              {art(false)}
              <span className="tc-port-key" aria-hidden />
            </div>
            <div className="tc-plate-strip">
              <h2 className="tc-name">{copy.title}</h2>
            </div>
            <div className="tc-ledger">
              <span className="tc-eyebrow">{copy.stage}</span>
              <span>
                {copy.statLabel} {copy.statValue}
              </span>
            </div>
          </div>
        )}

        {/* --- kit: club colour cut on the diagonal, stat rail, big rating - */}
        {layout === 'kit' && (
          <div className="tc-body">
            <span className="tc-diag" aria-hidden />
            {/* The rating is the first thing read on a card like this, so it
                is the largest thing on it and sits in the corner on its own. */}
            <div className="tc-rating">
              <b>{copy.statValue}</b>
              <span>{copy.statLabel}</span>
            </div>
            <div className="tc-cutout">{art(true)}</div>
            <div className="tc-rail" aria-hidden>
              {copy.moves.map((m, i) => (
                <span key={i}>
                  <i>{m.name.slice(0, 3).toUpperCase()}</i>
                  {m.value}
                </span>
              ))}
              <span>
                <i>SET</i>
                {theme.set}
              </span>
            </div>
            <div className="tc-nameplate">
              <h2 className="tc-name">{copy.title}</h2>
              <span className="tc-eyebrow">{copy.stage}</span>
            </div>
          </div>
        )}

        {/* --- access: a laminated badge, notched for a lanyard ------------ */}
        {layout === 'badge' && (
          <div className="tc-body">
            <span className="tc-notch" aria-hidden />
            <span className="tc-punch" aria-hidden />
            <div className="tc-badge-head">
              <span className="tc-badge-mark" aria-hidden>
                {theme.glyph}
              </span>
              <span className="tc-eyebrow">{theme.set}</span>
            </div>
            <div className="tc-photo">{art(false)}</div>
            <div className="tc-rows">
              <h2 className="tc-name">{copy.title}</h2>
              <dl>
                <div>
                  <dt>Role</dt>
                  <dd>{copy.stage}</dd>
                </div>
                <div>
                  <dt>{copy.statLabel}</dt>
                  <dd>{copy.statValue}</dd>
                </div>
              </dl>
            </div>
            <span className="tc-code" aria-hidden />
          </div>
        )}

        {/* --- sigil: dark board, gilt filigree, a struck seal at the foot - */}
        {layout === 'sigil' && (
          <div className="tc-body">
            <div className="tc-art-full">{art(true)}</div>
            <span className="tc-veil" aria-hidden />
            <span className="tc-filigree tc-filigree-tl" aria-hidden />
            <span className="tc-filigree tc-filigree-tr" aria-hidden />
            <span className="tc-filigree tc-filigree-bl" aria-hidden />
            <span className="tc-filigree tc-filigree-br" aria-hidden />
            <span className="tc-rarity" aria-hidden>
              {theme.rarity}
            </span>
            <div className="tc-ribbon">
              <h2 className="tc-name">{copy.title}</h2>
              <span className="tc-eyebrow">{copy.stage}</span>
            </div>
            <span className="tc-seal" aria-hidden>
              {theme.glyph}
            </span>
          </div>
        )}


        {/* --- refractor: foil stock, octagon window, white name plate ----- */}
        {layout === 'refractor' && (
          <div className="tc-body">
            <span className="tc-foil" aria-hidden />
            <span className="tc-tab">{theme.badge}</span>
            <div className="tc-cut">
              <div className="tc-rule">{art(false)}</div>
            </div>
            <div className="tc-plate">
              <h2 className="tc-name">{copy.title}</h2>
              <span className="tc-eyebrow">
                {copy.stage} · {theme.rarity}
              </span>
            </div>
          </div>
        )}
      </article>
    );
  },
);
