import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto API for tests - use Object.defineProperty for read-only properties
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        // Simple mock implementation
        return new ArrayBuffer(32);
      })
    }
  },
  writable: true,
  configurable: true
});

// Mock Gun.js for testing
global.Gun = {
  SEA: {
    pair: vi.fn(async () => ({
      pub: 'test-public-key-' + Math.random(),
      priv: 'test-private-key-' + Math.random()
    })),
    sign: vi.fn(async (data, key) => 'test-signature'),
    verify: vi.fn(async (signature, data, pubKey) => true)
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    hostname: 'localhost',
    href: 'http://localhost:3000',
    protocol: 'http:',
    reload: vi.fn()
  },
  writable: true,
  configurable: true
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});