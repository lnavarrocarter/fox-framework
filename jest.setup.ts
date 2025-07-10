/**
 * Jest Setup Configuration for Fox Framework
 * Global test setup and configuration
 */

import 'jest';

// Global test timeout
jest.setTimeout(10000);

// Suppress console.log during tests unless needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Clear any timers
  jest.clearAllTimers();
});

// Global teardown
afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Global test utilities
(global as any).testUtils = {
  suppressConsole: () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  },
  
  restoreConsole: () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  },
  
  // Helper to create test timeout
  timeout: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';

// Custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidFoxServer(): R;
      toBeValidConfig(): R;
    }
  }
  
  var testUtils: {
    suppressConsole: () => void;
    restoreConsole: () => void;
    timeout: (ms: number) => Promise<void>;
  };
}

expect.extend({
  toBeValidFoxServer(received) {
    const pass = received && 
                 typeof received.listen === 'function' &&
                 typeof received.get === 'function' &&
                 typeof received.post === 'function';
    
    return {
      message: () => 'Expected value to be a valid Fox server instance',
      pass
    };
  },
  
  toBeValidConfig(received) {
    const pass = received && 
                 typeof received.port === 'number' && 
                 typeof received.env === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid config`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid config`,
        pass: false,
      };
    }
  }
});
