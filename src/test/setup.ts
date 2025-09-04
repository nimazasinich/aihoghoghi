import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Import our enhanced testing utilities
import { persianTextMatchers } from './utils/persianTextMatchers';
import { webSocketMockFactory } from './utils/webSocketMockFactory';
import { aiServiceMockFactory } from './utils/aiServiceMockResponses';
import { databaseMockFactory } from './utils/databaseMockUtilities';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Extend expect with our custom Persian text matchers
expect.extend(persianTextMatchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  
  // Cleanup our mock factories
  webSocketMockFactory.cleanup();
  databaseMockFactory.resetMockData();
});

// Setup jsdom environment - ensure it's available for all tests
import { JSDOM } from 'jsdom';

// Only set up JSDOM if not already available
if (typeof global.document === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  // Set up global DOM objects
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  // Ensure document is available globally
  Object.defineProperty(global, 'document', {
    value: dom.window.document,
    writable: true
  });

  Object.defineProperty(global, 'window', {
    value: dom.window,
    writable: true
  });

  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true
  });

  // Ensure HTMLElement is available
  Object.defineProperty(global, 'HTMLElement', {
    value: dom.window.HTMLElement,
    writable: true
  });

  // Ensure Element is available
  Object.defineProperty(global, 'Element', {
    value: dom.window.Element,
    writable: true
  });
}

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

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

// Mock document for jsdom
Object.defineProperty(document, 'querySelector', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document, 'querySelectorAll', {
  value: vi.fn(() => []),
  writable: true
});

Object.defineProperty(document, 'addEventListener', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn(),
  writable: true
});

// Persian text testing utilities
export const persianTextMatchers = {
  toContainPersianText: (received: string, expected: string) => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasPersian = persianRegex.test(received);
    const containsExpected = received.includes(expected);
    
    return {
      pass: hasPersian && containsExpected,
      message: () => `Expected "${received}" to contain Persian text "${expected}"`
    };
  },
  
  toBeValidPersianText: (received: string) => {
    const persianRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,!?؛:()]+$/;
    const isValid = persianRegex.test(received);
    
    return {
      pass: isValid,
      message: () => `Expected "${received}" to be valid Persian text`
    };
  }
};

// Extend expect with Persian matchers
expect.extend(persianTextMatchers);

// Declare custom matchers for TypeScript
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidPersianText(): T;
    toContainPersianText(expected: string): T;
    toHavePersianDirection(): T;
    toBeRTLText(): T;
  }
}

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime: async (renderFn: () => Promise<void>) => {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  },
  
  measureApiCall: async (apiCall: () => Promise<any>) => {
    const start = performance.now();
    const result = await apiCall();
    const end = performance.now();
    return { result, duration: end - start };
  }
};

// Mock data factories
export const mockDataFactory = {
  createDocument: (overrides = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    title: 'سند حقوقی نمونه',
    content: 'محتوای سند حقوقی به زبان فارسی',
    category: 'قانون مدنی',
    source: 'قوه قضائیه',
    date: new Date().toISOString(),
    url: 'https://example.com/document',
    confidence: 0.95,
    ...overrides
  }),
  
  createSearchResult: (overrides = {}) => ({
    documents: Array.from({ length: 10 }, () => mockDataFactory.createDocument()),
    total: 100,
    page: 1,
    hasMore: true,
    ...overrides
  }),
  
  createCategory: (overrides = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    name: 'دسته‌بندی حقوقی',
    count: Math.floor(Math.random() * 1000),
    ...overrides
  }),
  
  createSource: (overrides = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    name: 'منبع حقوقی',
    url: 'https://example.com',
    reliability: 0.9,
    lastScraped: new Date().toISOString(),
    ...overrides
  })
};

// WebSocket mock factory
export const createWebSocketMock = (options = {}) => {
  const mock = {
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
    ...options
  };
  
  return mock;
};

// AI service mock responses
export const aiServiceMocks = {
  getClassificationResponse: () => ({
    category: 'قانون مدنی',
    confidence: 0.95,
    keywords: ['قرارداد', 'مالکیت', 'حقوق'],
    summary: 'خلاصه سند حقوقی'
  }),
  
  getSearchEnhancementResponse: () => ({
    enhancedQuery: 'جستجوی بهبود یافته',
    suggestions: ['قانون مدنی', 'قانون تجارت', 'قانون کار'],
    relatedTerms: ['حقوق', 'قانون', 'مقررات']
  })
};

// Database mock utilities
export const databaseMocks = {
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
  mockConnection: {
    query: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn()
  }
};