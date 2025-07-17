import { vi } from 'vitest';
import '@testing-library/jest-dom'; // この行を追加

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.getComputedStyle for Ant Design components
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn(() => ''),
  })),
});
