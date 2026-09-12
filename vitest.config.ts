import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // macOS AppleDouble junk (._*) must never be picked up as tests
    exclude: ['**/node_modules/**', '**/._*', '**/._*/**'],
  },
})
