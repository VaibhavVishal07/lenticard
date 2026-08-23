import { useEffect, useRef } from 'react';

interface TurnProps {
  /** The plain photograph. What the card is when nobody is touching it. */
  flat: string;
  /** The print drawn at four angles, blended between as the cursor moves. */
  views: string[];
}

/** How fast the turn catches up to the cursor. Higher is snappier. */
const CHASE = 0.16;

/** How fast the lens fades in when you arrive and out when you leave. */
const FADE = 0.09;

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
export function Turn({ flat, views }: TurnProps) {
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const card = node.closest('.tc') ?? node;
    const layers = Array.from(node.querySelectorAll<HTMLImageElement>('.tc-view'));
    if (layers.length < 2) return;

    // Where the cursor is (0..1), and where the lens has got to.
    let target = 0.5;
    let turn = 0.5;
    // Whether the pointer is on the card, and how far the lens has come up.
    let wanted = 0;
    let strength = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;

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

      const settled =
        Math.abs(target - turn) < 0.0015 && Math.abs(wanted - strength) < 0.0015;
      if (!settled) frame = requestAnimationFrame(paint);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const move = (event: Event) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width) return;
      const x = (event as PointerEvent).clientX;
      target = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      wanted = 1;
      wake();
    };

    const leave = () => {
      wanted = 0;
      // Settle back to straight on, so it is not left frozen at an angle.
      target = 0.5;
      wake();
    };

    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerleave', leave);
    paint();

    return () => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [views]);

  return (
    <span className="tc-turn" ref={host}>
      <img className="tc-still tc-flat" src={flat} alt="" loading="lazy" />
      {views.map((src, i) => (
        <img key={i} className="tc-still tc-view" src={src} alt="" loading="lazy" />
      ))}
    </span>
  );
}
