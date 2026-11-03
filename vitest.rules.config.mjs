import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
