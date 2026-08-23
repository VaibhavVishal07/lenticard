import { forwardRef } from 'react';
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
 * The card, laid out the way a real one is: name plate with a stage line and a
 * value at the top right, illustration window, numbered move rows with energy
 * costs, a weakness / resistance / retreat strip, flavour text, and a footer
 * carrying the illustrator credit, set, number and rarity.
 *
 * Only the illustration is lenticular. Everything printed is DOM sitting on top
 * of the canvas, because text pushed through the shader is text nobody can
 * read — the lens refracts every ridge a little, and a name smeared across
 * sixty of them stops being a word. Keeping the printing out of the interlace
 * also leaves it selectable, sharp at any size, and out of the share link.
 */
export const TradingCard = forwardRef<LenticularCardHandle, TradingCardProps>(
  function TradingCard(
    { photos, theme, copy, layout, lenticules, parallax, blend, sheen, onError },
    ref,
  ) {
    const art = (
      <div className="tc-art">
        <LenticularCard
          ref={ref}
          images={photos}
          axis="vertical"
          orientation={layout === 'trading' ? 'landscape' : 'portrait'}
          lenticules={lenticules}
          parallax={parallax}
          blend={blend}
          sheen={sheen}
          interlace={0.46}
          lens={0.72}
          motion="none"
          tilt={0}
          float={0}
          radius={layout === 'full' ? 0 : 4}
          fit="cover"
          onError={onError}
        />
        <span className="tc-frames">{photos.length}-FRAME</span>
      </div>
    );

    const plate = (
      <header className="tc-plate">
        <div className="tc-names">
          <span className="tc-stage">{copy.stage}</span>
          <h2 className="tc-title">{copy.title}</h2>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-label">{copy.statLabel}</span>
          <span className="tc-stat-value">{copy.statValue}</span>
          <span className="tc-type" aria-hidden>{theme.glyph}</span>
        </div>
      </header>
    );

    return (
      <article
        className="tc"
        data-layout={layout}
        style={{
          ['--tc-a' as string]: theme.plate[0],
          ['--tc-b' as string]: theme.plate[1],
          ['--tc-board' as string]: theme.board,
          ['--tc-ink' as string]: theme.ink,
          ['--tc-accent' as string]: theme.accent,
        }}
      >
        <div className="tc-board">
          {layout === 'trading' && (
            <>
              {plate}
              {art}
              <div className="tc-moves">
                {copy.moves.map((move, i) => (
                  <div className="tc-move" key={i}>
                    <span className="tc-cost" aria-label={`${move.cost} energy`}>
                      {Array.from({ length: move.cost }, (_, p) => (
                        <span className="tc-pip" key={p} />
                      ))}
                    </span>
                    <span className="tc-move-body">
                      <span className="tc-move-name">{move.name}</span>
                      <span className="tc-move-text">{move.text}</span>
                    </span>
                    <span className="tc-move-value">{move.value}</span>
                  </div>
                ))}
              </div>
              <div className="tc-strip">
                {['Weakness', 'Resists', 'Retreat'].map((label, i) => (
                  <div className="tc-strip-cell" key={label}>
                    <span className="tc-strip-label">{label}</span>
                    <span className="tc-strip-value">{copy.strip[i]}</span>
                  </div>
                ))}
              </div>
              <p className="tc-flavour">{copy.flavour}</p>
              <footer className="tc-foot">
                <span>illus. you</span>
                <span className="tc-foot-right">
                  <span className="tc-set">{theme.set}</span>
                  <span className="tc-rarity">{theme.rarity}</span>
                </span>
              </footer>
            </>
          )}

          {layout === 'full' && (
            <>
              {art}
              <div className="tc-overlay">
                <span className="tc-stage">{copy.stage}</span>
                <h2 className="tc-title">{copy.title}</h2>
                <span className="tc-badge">{theme.badge}</span>
              </div>
            </>
          )}

          {layout === 'instant' && (
            <>
              {art}
              <div className="tc-caption">
                <h2 className="tc-title">{copy.title}</h2>
                <p className="tc-flavour">{copy.flavour}</p>
                <span className="tc-badge">{theme.label}</span>
              </div>
            </>
          )}

          {layout === 'minimal' && (
            <>
              {art}
              <footer className="tc-min">
                <h2 className="tc-title">{copy.title}</h2>
                <span className="tc-badge">{theme.badge}</span>
              </footer>
            </>
          )}
        </div>
      </article>
    );
  },
);
