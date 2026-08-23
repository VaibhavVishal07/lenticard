import { forwardRef, type ReactNode } from 'react';
import { LenticularCard, type LenticularCardHandle } from '../../src/react/LenticularCard';
import type { CardCopy, CardLayout, CardTheme } from '../lib/themes';

interface TradingCardProps {
  photos: string[];
  theme: CardTheme;
  copy: CardCopy;
  layout: CardLayout;
  lenticules: number;
  parallax: number;
  blend: number;
  sheen: number;
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
 * The five templates are different objects rather than one card recoloured:
 * the frame material, where the art sits, whether there is a border at all and
 * where the name goes all change between them.
 */
export const TradingCard = forwardRef<LenticularCardHandle, TradingCardProps>(
  function TradingCard(
    { photos, theme, copy, layout, lenticules, parallax, blend, sheen, onError },
    ref,
  ) {
    const art = (fill: boolean): ReactNode => (
      <div className="tc-art" data-fill={fill}>
        <LenticularCard
          ref={ref}
          images={photos}
          axis="vertical"
          orientation={fill ? 'portrait' : 'landscape'}
          lenticules={lenticules}
          parallax={parallax}
          blend={blend}
          sheen={sheen}
          interlace={0.46}
          lens={0.72}
          motion="none"
          tilt={0}
          float={0}
          radius={0}
          fit="cover"
          onError={onError}
        />
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
        {layout === 'fullart' && (
          <div className="tc-body">
            {art(true)}
            <span className="tc-vign" aria-hidden />
          </div>
        )}

        {layout === 'classic' && (
          <div className="tc-body">
            <div className="tc-bevel">
              {art(false)}
              <div className="tc-plate">
                <span className="tc-eyebrow">{copy.stage}</span>
                <h2 className="tc-name">{copy.title}</h2>
              </div>
            </div>
            <div className="tc-rows">
              {copy.moves.map((m, i) => (
                <div className="tc-row" key={i}>
                  <span className="tc-pips">
                    {Array.from({ length: m.cost }, (_, p) => <i key={p} />)}
                  </span>
                  <span className="tc-row-name">{m.name}</span>
                  <span className="tc-row-val">{m.value}</span>
                </div>
              ))}
            </div>
            <div className="tc-strip">
              {['WEAK', 'RESIST', 'RETREAT'].map((k, i) => (
                <span key={k}>
                  <b>{k}</b>
                  {copy.strip[i]}
                </span>
              ))}
            </div>
            <div className="tc-foot">
              <span>{theme.set}</span>
              <span>
                {copy.statLabel} {copy.statValue} · {theme.rarity}
              </span>
            </div>
          </div>
        )}

        {layout === 'kaboom' && (
          <div className="tc-body">
            {art(true)}
            <span className="tc-shout" aria-hidden>{theme.badge}</span>
            <span className="tc-rc">{copy.statValue}</span>
            <div className="tc-chrome">
              <span className="tc-chrome-sm">{copy.stage.split('·')[0].trim()}</span>
              <h2 className="tc-chrome-name">{copy.title}</h2>
            </div>
          </div>
        )}

        {layout === 'prism' && (
          <div className="tc-body">
            <div className="tc-cut">{art(false)}</div>
            <div className="tc-neon" />
            <div className="tc-prism-foot">
              <h2 className="tc-name">{copy.title}</h2>
              <span className="tc-eyebrow">{theme.badge}</span>
              <div className="tc-rows">
                {copy.moves.map((m, i) => (
                  <div className="tc-row" key={i}>
                    <span className="tc-row-name">{m.name}</span>
                    <span className="tc-row-val">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {layout === 'retro' && (
          <div className="tc-body">
            <div className="tc-inner">
              {art(false)}
              <div className="tc-banner">
                <h2 className="tc-name">{copy.title}</h2>
              </div>
              <div className="tc-retro-foot">
                <span className="tc-eyebrow">{theme.set}</span>
                <span className="tc-eyebrow">
                  {copy.statLabel} {copy.statValue}
                </span>
              </div>
            </div>
          </div>
        )}

        {layout === 'museum' && (
          <div className="tc-body">
            {art(false)}
            <div className="tc-museum">
              <h2 className="tc-name">{copy.title}</h2>
              <p className="tc-flavour">{copy.flavour}</p>
              <span className="tc-rule" />
              <span className="tc-eyebrow">
                {theme.set} · {theme.rarity}
              </span>
            </div>
          </div>
        )}
      </article>
    );
  },
);
