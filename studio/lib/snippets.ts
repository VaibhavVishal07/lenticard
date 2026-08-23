import { diffFromDefaults, type CardSettings } from './presets';

const KEBAB: Record<string, string> = { idleSweep: 'idle-sweep' };

function jsxValue(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : `{${String(value)}}`;
}

function imageList(images: string[]): string {
  return images.map((src) => `  '${src}'`).join(',\n');
}

function isLocal(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

/**
 * Local uploads are blob:/data: URLs, which mean nothing outside this tab.
 * Rather than emit code that quietly breaks — or paste a megabyte of base64
 * into the snippet — they appear as the paths the user needs to create.
 */
export function hasLocalImages(images: string[]): boolean {
  return images.some(isLocal);
}

export function toDisplayPaths(images: string[], names: string[]): string[] {
  return images.map((src, i) =>
    isLocal(src) ? `/frames/${names[i] ?? `frame-${i + 1}.jpg`}` : src,
  );
}

const LOCAL_NOTE = `// Replace these with URLs your site can actually serve —
// the ones from the studio only exist inside that browser tab.`;

export function reactSnippet(
  images: string[],
  settings: CardSettings,
  caption: string,
  local: boolean,
): string {
  const diff = diffFromDefaults(settings);
  const props = Object.entries(diff)
    .map(([key, value]) => `      ${key}=${jsxValue(value)}`)
    .join('\n');
  const captionProp = caption ? `\n      caption="${caption}"` : '';
  const note = local ? `${LOCAL_NOTE}\n` : '';

  return `import { LenticularCard } from 'lenticard/react';

${note}const frames = [
${imageList(images)},
];

export function Hero() {
  return (
    <LenticularCard
      images={frames}${captionProp}
${props}
      width={480}
    />
  );
}
`;
}

export function elementSnippet(
  images: string[],
  settings: CardSettings,
  caption: string,
  local: boolean,
): string {
  const diff = diffFromDefaults(settings);
  const attrs = Object.entries(diff)
    .map(([key, value]) => `  ${KEBAB[key] ?? key}="${String(value)}"`)
    .join('\n');
  const captionAttr = caption ? `\n  caption="${caption}"` : '';
  const note = local
    ? '<!-- Swap these for URLs your site can serve. -->\n'
    : '';

  return `<script src="https://cdn.jsdelivr.net/npm/lenticard/dist/lenticard-element.iife.js"></script>

${note}<lenticular-card
  style="width: 480px"
  images="${images.join(',')}"${captionAttr}
${attrs}
></lenticular-card>
`;
}

export function vanillaSnippet(
  images: string[],
  settings: CardSettings,
  caption: string,
  local: boolean,
): string {
  const diff = diffFromDefaults(settings) as Record<string, unknown>;
  if (caption) diff.caption = caption;
  const body = Object.entries(diff)
    .map(([key, value]) => `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`)
    .join('\n');
  const note = local ? `${LOCAL_NOTE}\n` : '';

  return `import { createLenticularCard } from 'lenticard';

${note}const card = createLenticularCard('#card', {
  images: [
${imageList(images)},
  ],
${body}
});

// card.setAngle(-1, 0);   drive it yourself
// card.enableGyro();      ask for the gyroscope on iOS
// card.destroy();         clean up
`;
}

export function configSnippet(settings: CardSettings, caption: string): string {
  const diff = diffFromDefaults(settings) as Record<string, unknown>;
  if (caption) diff.caption = caption;
  return `${JSON.stringify(diff, null, 2)}\n`;
}
