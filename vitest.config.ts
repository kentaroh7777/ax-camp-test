import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['chrome-extension/src/**/*.{test,spec}.{js,ts,tsx}', 'tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      include: ['chrome-extension/src/**/*.{js,ts,tsx}'],
      exclude: ['chrome-extension/src/**/*.d.ts', 'tests/**']
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 180000, // 3分に延長
    hookTimeout: 120000, // 2分に延長
    teardownTimeout: 120000, // 2分に延長
    // ブラウザテスト用設定
    browser: {
      enabled: false, // デフォルトは無効、必要時に有効化
      name: 'chromium',
      provider: 'playwright',
      headless: false // ヘッドありモード
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'chrome-extension/src'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  }
})