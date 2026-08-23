import { defineConfig } from 'vite';

// Self-registering <lenticular-card> bundle: one script tag, no imports, no deps.
export default defineConfig({
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: 'src/element/index.ts',
      name: 'Lenticard',
      formats: ['iife', 'es'],
      fileName: (format) =>
        format === 'iife' ? 'lenticard-element.iife.js' : 'lenticard-element.js',
    },
  },
});
