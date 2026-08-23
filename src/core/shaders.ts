import { MAX_FRAMES } from './types';

export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * GLSL ES 1.0 forbids indexing a sampler array with a non-constant expression,
 * so the frame lookup is unrolled into an if-chain at compile time.
 */
function frameSelector(frames: number): string {
  if (frames === 1) return `  return texture2D(uTex0, fitUv(uv, uFit0));`;
  const lines: string[] = [];
  for (let i = 0; i < frames; i++) {
    const test = i === frames - 1 ? 'else' : `${i === 0 ? 'if' : 'else if'} (idx < ${i}.5)`;
    lines.push(`  ${test} { return texture2D(uTex${i}, fitUv(uv, uFit${i})); }`);
  }
  return lines.join('\n');
}

function samplerUniforms(frames: number): string {
  return Array.from(
    { length: frames },
    (_, i) => `uniform sampler2D uTex${i};\nuniform vec2 uFit${i};`,
  ).join('\n');
}

export function buildFragmentShader(frames: number): string {
  const n = Math.max(1, Math.min(frames, MAX_FRAMES));
  return `
precision highp float;

varying vec2 vUv;

${samplerUniforms(n)}

uniform float uCount;      // active frames
uniform float uLpi;        // lenticules across the card
uniform float uAngle;      // viewing angle along the parallax axis, -1..1
uniform float uParallax;   // how far the angle pushes through the stack
uniform float uSpread;     // how much of the stack one lenticule reveals (interlace)
uniform float uBlend;      // cross-frame softness
uniform float uSheen;      // ridge specular
uniform float uLens;       // ridge refraction
uniform float uAxis;       // 0 = vertical ridges, 1 = horizontal
uniform float uAA;         // pixel footprint in lenticule space, kills moire

vec2 fitUv(vec2 uv, vec2 fit) {
  return uv * fit + (0.5 - 0.5 * fit);
}

vec4 frameAt(float idx, vec2 uv) {
${frameSelector(n)}
}

void main() {
  vec2 uv = vUv;

  // Position inside the current lenticule, -0.5 .. 0.5.
  float coord = mix(uv.x, uv.y, uAxis);
  float f = fract(coord * uLpi) - 0.5;

  // A lenticule refracts: where you are under the ridge and where you are
  // standing both decide which slice of the stack reaches your eye.
  float view = clamp(f * 2.0 * uSpread + uAngle * uParallax, -1.0, 1.0);

  float last = max(uCount - 1.0, 0.0);
  float t = (view * 0.5 + 0.5) * last;
  float i0 = floor(t);
  float i1 = min(i0 + 1.0, last);
  float frac = t - i0;

  // Widen the crossover by the pixel footprint so fine interlaces stay smooth
  // instead of aliasing into moire bands.
  float edge = clamp(uBlend, 0.0, 1.0) * 0.5 + uAA;
  float w = edge < 0.0005 ? step(0.5, frac)
                          : smoothstep(0.5 - edge, 0.5 + edge, frac);

  // The ridge acts as a weak cylindrical lens across its own width.
  float mag = f * uLens / uLpi;
  vec2 lensOffset = mix(vec2(mag, 0.0), vec2(0.0, mag), uAxis);
  vec2 suv = clamp(uv + lensOffset, 0.0, 1.0);

  vec3 color = mix(frameAt(i0, suv), frameAt(i1, suv), w).rgb;

  // Plastic: a highlight down the crown of each ridge, a seam in each valley.
  float crown = pow(1.0 - min(abs(f) * 2.0, 1.0), 6.0);
  color += crown * uSheen * (0.35 + 0.65 * (uAngle * 0.5 + 0.5)) * 0.5;
  color *= 1.0 - smoothstep(0.40, 0.5, abs(f)) * uSheen * 0.30;

  gl_FragColor = vec4(color, 1.0);
}
`;
}
