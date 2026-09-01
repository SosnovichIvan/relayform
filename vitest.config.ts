import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': `${import.meta.dirname}/src` } },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/features/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}', 'src/widgets/**/*.{ts,tsx}', 'src/app/api/**/*.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
