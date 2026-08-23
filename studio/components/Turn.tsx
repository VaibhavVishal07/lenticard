import { useEffect, useRef } from 'react';

interface TurnProps {
  /** The plain photograph. What the card is when nobody is touching it. */
  flat: string;
  /** The print drawn at several angles, blended between as the cursor moves. */
  views: string[];
  /** Turn itself now and then, so the belt shows what a card does without
      waiting for someone to find it with a cursor. */
  demo?: boolean;
}

/** How fast the turn catches up to the cursor. Higher is snappier. */
const CHASE = 0.38;

/** How fast the lens fades in when you arrive and out when you leave. */
const FADE = 0.16;

/**
 * How much of the card a full sweep takes.
 *
 * Below one, the middle of the card covers the whole range and the edges are
 * held at the extremes — so a small movement turns the card a long way. At one
 * you have to travel the entire width to see everything, which is work.
 */
const REACH = 0.5;

/**
 * A lens you have to turn.
 *
 * Off the pointer this is a photograph — no ridges, no split colour, nothing.
 * The lens is something the card does when you are handling it, not a texture
 * printed on it, and a belt of cards all flipping on their own on a timer is
 * eight things demanding attention at once.
 *
 * Under the pointer, the four angles blend by cursor position. The trick that
 * makes the blend clean is compositing rather than opacity arithmetic: the
 * angle below is painted solid and only the angle above it carries the
 * fractional opacity, so what you see is exactly (1-w)·A + w·B and the card is
 * never see-through. Both are scaled by a strength that eases in and out, so
 * arriving and leaving are dissolves rather than switches.
 *
 * Nothing here goes through React. The position is written straight to
 * `style.opacity` inside a frame loop — a state update per pointer event would
 * re-render the whole card sixty times a second to change two numbers.
 */
export function Turn({ flat, views, demo = false }: TurnProps) {
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const card = node.closest('.tc') ?? node;
    // A leaning case on a moving belt is a small target to chase, so the
    // pointer is taken from the slot, which reaches into the gap either side.
    const zone = node.closest('.stack-slot') ?? card;
    const layers = Array.from(node.querySelectorAll<HTMLImageElement>('.tc-view'));
    if (layers.length < 2) return;

    // Where the cursor is (0..1), and where the lens has got to.
    let target = 0.5;
    let turn = 0.5;
    // Whether the pointer is on the card, and how far the lens has come up.
    let wanted = 0;
    let strength = 0;
    let frame = 0;

    // The unattended sweep: when it started, when the next one is due, and
    // whether a real pointer has ever arrived — after that the card is yours
    // and it stops performing.
    let sweptAt = 0;
    let nextSweep = performance.now() + 2600 + Math.random() * 9000;
    let touched = false;
    let timer = 0;

    const onScreen = () => {
      const box = zone.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight;
    };

    const paint = () => {
      frame = 0;
      const now = performance.now();

      // Nobody is holding it, so it turns on its own — up, across and back,
      // and down again. Off-screen cases are skipped rather than delayed, so
      // the belt is not full of performances nobody can see.
      if (demo && !touched) {
        if (!sweptAt && now >= nextSweep) {
          if (onScreen()) sweptAt = now;
          else nextSweep = now + 2000 + Math.random() * 3000;
        }
        if (sweptAt) {
          const t = (now - sweptAt) / 2600;
          if (t >= 1) {
            sweptAt = 0;
            nextSweep = now + 7000 + Math.random() * 12000;
            wanted = 0;
            target = 0.5;
          } else {
            wanted = t < 0.16 ? t / 0.16 : t > 0.84 ? (1 - t) / 0.16 : 1;
            target = 0.5 - Math.sin(t * Math.PI * 2) * 0.5;
          }
        }
      }

      turn += (target - turn) * CHASE;
      strength += (wanted - strength) * FADE;

      const span = layers.length - 1;
      const t = Math.max(0, Math.min(span, turn * span));
      const lower = Math.min(span - 1, Math.floor(t));
      const mix = t - lower;

      for (let i = 0; i < layers.length; i++) {
        const opacity =
          i === lower ? strength : i === lower + 1 ? mix * strength : 0;
        layers[i].style.opacity = opacity.toFixed(3);
      }

      // The lens sheet itself is drawn in CSS at the size the card actually
      // is. Baking it into the sheet does not work: two hundred ridges on an
      // 800px bitmap are sub-pixel once the browser has scaled it down to a
      // case in the belt, so the box filter averages them away and what is
      // left is three photographs dissolving into each other.
      node.style.setProperty('--lens', strength.toFixed(3));

      const settled =
        !sweptAt &&
        Math.abs(target - turn) < 0.0015 &&
        Math.abs(wanted - strength) < 0.0015;
      if (!settled) {
        frame = requestAnimationFrame(paint);
        return;
      }
      // Parked. A frame loop cannot notice the next sweep falling due, so a
      // timer wakes it — otherwise the card sleeps for good.
      if (demo && !touched) {
        timer = window.setTimeout(() => {
          timer = 0;
          wake();
        }, Math.max(120, nextSweep - performance.now()));
      }
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const move = (event: Event) => {
      touched = true;
      sweptAt = 0;
      const rect = card.getBoundingClientRect();
      if (!rect.width) return;
      const x = (event as PointerEvent).clientX;
      const across = (x - rect.left) / rect.width;
      const turned = (across - 0.5) / REACH + 0.5;
      target = Math.max(0, Math.min(1, turned));
      wanted = 1;
      wake();
    };

    const leave = () => {
      wanted = 0;
      // Settle back to straight on, so it is not left frozen at an angle.
      target = 0.5;
      wake();
    };

    zone.addEventListener('pointermove', move, { passive: true });
    zone.addEventListener('pointerleave', leave);
    paint();

    return () => {
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerleave', leave);
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [views, demo]);

  return (
    <span className="tc-turn" ref={host}>
      {/* Never deferred. This is the card at rest, and a case scrolling into
          the belt with its photograph still loading is an empty frame. */}
      <img className="tc-still tc-flat" src={flat} alt="" />
      {views.map((src, i) => (
        <img key={i} className="tc-still tc-view" src={src} alt="" loading="lazy" />
      ))}
      <span className="tc-lens" aria-hidden />
    </span>
  );
}
