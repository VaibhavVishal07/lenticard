import { forwardRef, type ReactNode } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../../src/react/LenticularCard';
import { Turn } from './Turn';
import type { CardCopy, CardLayout, CardTheme } from '../lib/themes';

interface TradingCardProps {
  photos: string[];
  /** The plain photograph, shown when nothing is on the card. */
  still?: string;
  /** The print at four angles, blended by the cursor. Stands in for a live
      lens on the belt, where browsers cap WebGL contexts well below the number
      of cases on screen. */
  views?: string[];
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
    { photos, still, views, theme, copy, layout, lenticules, parallax, blend, sheen, drive = 'none', onError },
    ref,
  ) {
    const art = (fill: boolean): ReactNode => (
      <div className="tc-art" data-fill={fill}>
        {views && still ? (
          <Turn flat={still} views={views} />
        ) : still ? (
          <img className="tc-still" src={still} alt="" loading="lazy" />
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
          ['--accent' as string]: theme.accent,
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
