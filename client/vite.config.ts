import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true }),
  ],
  server: { port: 5173 },
  resolve: { alias: { '@mpg/shared': path.resolve(__dirname, '../shared') } },
});
