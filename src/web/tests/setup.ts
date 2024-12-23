// @testing-library/jest-dom version 6.0.0
import '@testing-library/jest-dom';
// whatwg-fetch version 3.6.0
import 'whatwg-fetch';
// resize-observer-polyfill version 1.5.1
import ResizeObserverPolyfill from 'resize-observer-polyfill';

/**
 * Creates a type-safe mock implementation of window.matchMedia
 * @param query - Media query string to match against
 * @returns MediaQueryList mock object with event handling support
 */
const mockMatchMedia = (query: string): MediaQueryList => {
  // Validate media query string format
  if (typeof query !== 'string') {
    throw new Error('Media query must be a string');
  }

  // Initialize listeners array for event handling
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];

  // Create MediaQueryList mock object
  const mediaQueryList: MediaQueryList = {
    matches: false,
    media: query,
    onchange: null,
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      // Deprecated but included for legacy support
      listeners.push(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      // Deprecated but included for legacy support
      listeners = listeners.filter(l => l !== listener);
    },
    addEventListener: (type: string, listener: EventListener) => {
      if (type === 'change') {
        listeners.push(listener as (event: MediaQueryListEvent) => void);
      }
    },
    removeEventListener: (type: string, listener: EventListener) => {
      if (type === 'change') {
        listeners = listeners.filter(l => l !== listener);
      }
    },
    dispatchEvent: (event: Event): boolean => {
      if (event.type === 'change') {
        listeners.forEach(listener => listener(event as MediaQueryListEvent));
        return true;
      }
      return false;
    }
  };

  return mediaQueryList;
};

// Configure global mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation(mockMatchMedia)
});

// Setup ResizeObserver mock
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverPolyfill
});

// Extend Jest matchers with @testing-library/jest-dom
expect.extend({
  // Add custom matchers if needed in the future
});

// Error handling for fetch responses
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    return response;
  } catch (error) {
    // Enhance error with request details
    const enhancedError = new Error(`Fetch error: ${error.message}`);
    enhancedError.request = args[0];
    enhancedError.options = args[1];
    throw enhancedError;
  }
};

// Configure testing environment
beforeAll(() => {
  // Add any global setup needed before all tests
});

afterAll(() => {
  // Clean up any global resources after all tests
});

beforeEach(() => {
  // Reset any mocks or state before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
});