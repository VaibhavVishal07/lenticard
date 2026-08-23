// The studio's "self-contained HTML" export inlines the runtime, so the built
// element bundle has to be servable next to the app.
import { copyFile, mkdir } from 'node:fs/promises';

const source = 'dist/lenticard-element.iife.js';
const target = 'public/lenticard-element.iife.js';

await mkdir('public', { recursive: true });
await copyFile(source, target);
console.log(`copied ${source} -> ${target}`);
