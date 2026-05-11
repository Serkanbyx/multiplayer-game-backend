import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/*.integration.test.ts'],
    setupFiles: ['src/__tests__/setup.integration.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    sequence: { concurrent: false },
    fileParallelism: false,
  },
});
