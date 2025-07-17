import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local before all tests run.
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Keep existing setup for vitest-dom and other mocks.
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock chrome APIs for tests that need it.
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  }
} as any

// The global fetch mock was interfering with real API calls in integration tests.
// It has been removed. Tests that require a mocked fetch should use vi.spyOn(global, 'fetch').

// Mock environment variables
process.env.NODE_ENV = 'test'