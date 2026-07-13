/**
 * Unit-test config. Deliberately independent of vite.config.ts — the app
 * config loads the Cloudflare Workers plugin, which is incompatible with
 * vitest's node environment. Unit tests cover pure modules only; e2e goes
 * through `deepspace test` (Playwright).
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
