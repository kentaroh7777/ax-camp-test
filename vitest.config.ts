import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['chrome-extension/src/**/*.{test,spec}.{js,ts,tsx}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      include: ['chrome-extension/src/**/*.{js,ts,tsx}'],
      exclude: ['chrome-extension/src/**/*.d.ts', 'tests/**']
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'chrome-extension/src'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  }
})