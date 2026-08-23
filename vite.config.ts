import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The studio app. Base is set for project-page hosting on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.PAGES_BASE ?? '/',
  build: { outDir: 'dist-studio', sourcemap: true },
});
