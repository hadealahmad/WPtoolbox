import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.js', 'tests/bundle-size.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
