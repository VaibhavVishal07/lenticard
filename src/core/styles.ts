/**
 * Shipped as a string and injected once per document. A library that makes the
 * host site remember to import a stylesheet is a library people file issues about.
 */
export const STYLE_ID = 'lenticard-styles';

export const CARD_CSS = `
.lc-root {
  --lc-radius: 20px;
  --lc-tilt-x: 0deg;
  --lc-tilt-y: 0deg;
  --lc-lift: 0px;
  --lc-glare-x: 50%;
  --lc-glare-y: 50%;
  --lc-glare: 0;
  --lc-energy: 0;
  --lc-sheen: 0.35;
  --lc-shadow: rgba(8, 10, 24, 0.45);

  /* Must not shrink-to-fit: the canvas sizes itself from the card, so a
     shrink-wrapping root would feed its own width back in and collapse. */
  display: block;
  width: 100%;
  position: relative;
  max-width: 100%;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.lc-stage {
  position: relative;
  perspective: 1400px;
  perspective-origin: 50% 50%;
  width: 100%;
}

.lc-card {
  position: relative;
  width: 100%;
  aspect-ratio: var(--lc-aspect, 1.5);
  border-radius: var(--lc-radius);
  overflow: hidden;
  transform-style: preserve-3d;
  transform:
    translate3d(0, var(--lc-lift), 0)
    rotateX(var(--lc-tilt-x))
    rotateY(var(--lc-tilt-y));
  will-change: transform;
  isolation: isolate;
  background: #0b0d16;
  box-shadow:
    0 1px 1px rgba(255, 255, 255, 0.14) inset,
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 2px 6px rgba(8, 10, 24, 0.28),
    0 24px 60px -18px var(--lc-shadow);
}

/* A round card ignores the radius setting and takes the shadow with it. */
.lc-root[data-orientation='circle'] .lc-card { border-radius: 50%; }
.lc-root[data-orientation='circle'] .lc-shadow {
  left: 14%;
  right: 14%;
  bottom: -4%;
}

.lc-canvas {
  /* Absolute, so the canvas never contributes to layout at all. */
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

/* Every overlay is inert: the card must stay one pointer target. */
.lc-card > .lc-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* The bright spot that tracks the pointer across the laminate. */
.lc-glare {
  background: radial-gradient(
    58% 58% at var(--lc-glare-x) var(--lc-glare-y),
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0.12) 42%,
    rgba(255, 255, 255, 0) 72%
  );
  mix-blend-mode: soft-light;
  opacity: calc(0.35 + 0.65 * var(--lc-glare));
  transition: opacity 220ms ease;
}

/* A second, tighter band that only shows up at real tilt. */
.lc-flare {
  background: linear-gradient(
    var(--lc-flare-angle, 105deg),
    transparent 32%,
    rgba(255, 255, 255, 0.22) 47%,
    rgba(190, 225, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.22) 53%,
    transparent 68%
  );
  mix-blend-mode: plus-lighter;
  opacity: calc(0.5 * var(--lc-energy));
}

/* Physical ridge texture, kept under the shader's own sheen. */
.lc-ridges {
  background-image: repeating-linear-gradient(
    var(--lc-ridge-angle, 90deg),
    rgba(255, 255, 255, 0.055) 0 1px,
    rgba(0, 0, 0, 0.05) 1px 2px,
    transparent 2px var(--lc-ridge-pitch, 4px)
  );
  opacity: calc(0.5 * var(--lc-sheen));
  mix-blend-mode: overlay;
}

/* Printed edge: a bright top lip and a dark bottom one read as thickness. */
.lc-edge {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 -1px 0 rgba(0, 0, 0, 0.32) inset,
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

/* Held in the hand, the shadow drops further away and softens — the card is
   reading as further off the surface than a cursor ever lifts it. */
.lc-root[data-held='true'] .lc-shadow {
  filter: blur(26px);
  bottom: -11%;
}

.lc-shadow {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -6%;
  height: 14%;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, var(--lc-shadow), transparent 72%);
  filter: blur(18px);
  transform: translate3d(calc(var(--lc-shadow-x, 0) * 1px), 0, 0)
             scale(calc(1 - 0.12 * var(--lc-energy)));
  opacity: calc(0.75 - 0.2 * var(--lc-energy));
  pointer-events: none;
  z-index: -1;
}

.lc-caption {
  margin: 14px 2px 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  letter-spacing: 0.01em;
  opacity: 0.7;
  text-align: center;
}

.lc-root[data-state='loading'] .lc-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, #131725 30%, #1e2436 50%, #131725 70%);
  background-size: 220% 100%;
  animation: lc-shimmer 1.4s ease-in-out infinite;
}

.lc-root[data-state='error'] .lc-card {
  display: grid;
  place-items: center;
  padding: 24px;
  background: #1a1320;
  color: #ffb4b4;
  font-size: 0.8125rem;
  text-align: center;
}

@keyframes lc-shimmer {
  from { background-position: 120% 0; }
  to   { background-position: -120% 0; }
}

/* CSS-mask fallback: real strip interlacing for machines without WebGL. */
.lc-fallback { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
.lc-fallback-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  will-change: mask-position, -webkit-mask-position;
}

@media (prefers-reduced-motion: reduce) {
  .lc-card { transition: none; }
  .lc-root[data-reduced='true'] .lc-card { transform: none; }
}
`;

export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CARD_CSS;
  doc.head.appendChild(style);
}
