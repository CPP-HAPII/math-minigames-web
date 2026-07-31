import { defineConfig } from 'vitest/config';
import path from 'path';

// Minimal config for testing plain TypeScript modules (no React/Next runtime
// involved) — 'node' environment, and the same '@/*' alias tsconfig.json
// defines, since lib/services/analyticsService.ts imports via that alias.
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['lib/services/analyticsService.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
