/**
 * Occasions are the gift wrap. The studio keeps its single lime accent, but a
 * received card is a different surface with a different job — it should feel
 * like it was chosen for the person opening it, so each occasion carries its
 * own seal, copy and tint on the greeting screen only.
 */

export interface Occasion {
  id: string;
  label: string;
  /** Drawn into the wax seal. */
  seal: string;
  /** Headline above the sealed envelope, with {from} substituted. */
  tease: string;
  /** What the button on the envelope says. */
  open: string;
  /** Placeholder for the sender's note. */
  prompt: string;
  /** Greeting-screen tint. Kept under 80% saturation so it never screams. */
  tint: string;
  tintInk: string;
}

export const OCCASIONS: Occasion[] = [
  {
    id: 'birthday',
    label: 'Birthday',
    seal: '✦',
    tease: '{from} made you something for your birthday',
    open: 'Open your card',
    prompt: 'Happy birthday. Tilt this one — it changes.',
    tint: '#e0a23c',
    tintInk: '#1c1204',
  },
  {
    id: 'thanks',
    label: 'Thank you',
    seal: '❖',
    tease: '{from} wanted to say thank you',
    open: 'Read it',
    prompt: 'Thank you, properly this time.',
    tint: '#6fbf8f',
    tintInk: '#04160c',
  },
  {
    id: 'missyou',
    label: 'Missing you',
    seal: '♁',
    tease: '{from} is thinking of you',
    open: 'Open it',
    prompt: 'Three of my favourite photos of us.',
    tint: '#8f9ee0',
    tintInk: '#0a0d1c',
  },
  {
    id: 'congrats',
    label: 'Congratulations',
    seal: '★',
    tease: '{from} is celebrating you',
    open: 'See it',
    prompt: 'You did the thing. Look at you.',
    tint: '#d98a9e',
    tintInk: '#1c060d',
  },
  {
    id: 'justbecause',
    label: 'Just because',
    seal: '◈',
    tease: '{from} sent you a card',
    open: 'Open it',
    prompt: 'No occasion. Just tilt it.',
    tint: '#c3f53c',
    tintInk: '#0b1004',
  },
];

export const DEFAULT_OCCASION = OCCASIONS[OCCASIONS.length - 1];

export function findOccasion(id: string | undefined): Occasion {
  return OCCASIONS.find((item) => item.id === id) ?? DEFAULT_OCCASION;
}

export function teaseFor(occasion: Occasion, from: string | undefined): string {
  return occasion.tease.replace('{from}', from?.trim() || 'Someone');
}
