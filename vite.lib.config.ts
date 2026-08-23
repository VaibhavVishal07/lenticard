import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build. React stays external so consumers dedupe on their own copy.
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: {
        lenticard: 'src/index.ts',
        'lenticard-react': 'src/react/index.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
