import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@mpg/shared': path.resolve(__dirname, '../shared') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/components/**', 'src/pages/auth/**', 'src/context/**'],
      thresholds: { lines: 70, branches: 80 },
    },
  },
});
