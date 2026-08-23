/**
 * The card on the home page.
 *
 * Three frames of the same creature at slightly different poses — which is what
 * a lenticular card actually needs. Unrelated images flip; near-identical
 * frames of one subject *move*, and that is the difference between a novelty
 * and something that looks like an object.
 *
 * Served from public/ rather than drawn, because these are finished card art.
 */
export function buildDefaultCard(): string[] {
  const base = import.meta.env.BASE_URL;
  return [`${base}cards/astra-1.jpg`, `${base}cards/astra-2.jpg`, `${base}cards/astra-3.jpg`];
}
