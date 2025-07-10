/**
 * Test utilities and helpers for Fox Framework testing
 */

import { ServerConfig } from '../core/types';
import { RequestMethod } from '../core/enums/methods.enums';
import { RequestMethodsContext } from '../core/enums/request.enums';

/**
 * Creates a mock server configuration for testing
 */
function createMockConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 3000,
    env: 'test',
    jsonSpaces: 2,
    staticFolder: 'public',
    ...overrides
  };
}

/**
 * Creates mock request definitions for testing
 */
function createMockRequests(requests: Partial<RequestMethodsContext>[] = []): RequestMethodsContext[] {
  return requests.map(req => ({
    method: req.method || RequestMethod.GET,
    path: req.path || '/',
    callback: req.callback || jest.fn()
  }));
}

/**
 * Creates a mock Express request object
 */
function createMockRequest(overrides: any = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '/',
    path: '/',
    ...overrides
  };
}

/**
 * Creates a mock Express response object
 */
function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    locals: {}
  };

  return res;
}

/**
 * Creates a mock Express next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Waits for a specified amount of time (useful for async tests)
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Captures console output for testing
 */
class ConsoleCapture {
  private originalConsole: any;
  private logs: string[] = [];
  private errors: string[] = [];
  private warns: string[] = [];

  start() {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    console.log = (...args: any[]) => {
      this.logs.push(args.join(' '));
    };

    console.error = (...args: any[]) => {
      this.errors.push(args.join(' '));
    };

    console.warn = (...args: any[]) => {
      this.warns.push(args.join(' '));
    };
  }

  stop() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
  }

  getLogs() {
    return [...this.logs];
  }

  getErrors() {
    return [...this.errors];
  }

  getWarns() {
    return [...this.warns];
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
  }
}

/**
 * Mock file system utilities
 */
class MockFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  setFile(path: string, content: string) {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  deleteFile(path: string) {
    this.files.delete(path);
  }

  setDirectory(path: string) {
    this.directories.add(path);
  }

  hasDirectory(path: string): boolean {
    return this.directories.has(path);
  }

  deleteDirectory(path: string) {
    this.directories.delete(path);
  }

  clear() {
    this.files.clear();
    this.directories.clear();
  }

  getAllFiles(): string[] {
    return Array.from(this.files.keys());
  }

  getAllDirectories(): string[] {
    return Array.from(this.directories);
  }
}

/**
 * Test data factories
 */
class TestDataFactory {
  /**
   * Creates test user data
   */
  static createUser(overrides: any = {}) {
    return {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      ...overrides
    };
  }

  /**
   * Creates test post data
   */
  static createPost(overrides: any = {}) {
    return {
      id: 1,
      title: 'Test Post',
      content: 'This is a test post content',
      authorId: 1,
      published: true,
      createdAt: new Date('2023-01-01'),
      ...overrides
    };
  }

  /**
   * Creates test error objects
   */
  static createError(message = 'Test error', status = 500) {
    const error = new Error(message) as any;
    error.status = status;
    return error;
  }

  /**
   * Creates test route data
   */
  static createRoute(overrides: any = {}) {
    return {
      method: RequestMethod.GET,
      path: '/test',
      callback: jest.fn(),
      ...overrides
    };
  }
}

/**
 * Assertion helpers
 */
class TestAssertions {
  /**
   * Asserts that a function was called with specific arguments
   */
  static assertCalledWith(mockFn: jest.Mock, ...expectedArgs: any[]) {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Asserts that a mock response has specific status and body
   */
  static assertResponse(mockRes: any, expectedStatus: number, expectedBody?: any) {
    expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
    if (expectedBody !== undefined) {
      expect(mockRes.json).toHaveBeenCalledWith(expectedBody);
    }
  }

  /**
   * Asserts that an object has all required properties
   */
  static assertHasProperties(obj: any, properties: string[]) {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
    });
  }

  /**
   * Asserts that a string contains all expected substrings
   */
  static assertContainsAll(str: string, substrings: string[]) {
    substrings.forEach(substring => {
      expect(str).toContain(substring);
    });
  }
}

/**
 * Performance testing utilities
 */
class PerformanceTestHelper {
  /**
   * Measures execution time of a function
   */
  static async measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    return {
      result,
      time: end - start
    };
  }

  /**
   * Runs a function multiple times and returns statistics
   */
  static async runBenchmark<T>(
    fn: () => Promise<T> | T,
    iterations = 100
  ): Promise<{
    average: number;
    min: number;
    max: number;
    total: number;
    results: T[];
  }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, time } = await this.measureExecutionTime(fn);
      times.push(time);
      results.push(result);
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      total: times.reduce((a, b) => a + b, 0),
      results
    };
  }
}

/**
 * Memory testing utilities
 */
class MemoryTestHelper {
  /**
   * Gets current memory usage
   */
  static getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  /**
   * Monitors memory usage during function execution
   */
  static async monitorMemoryUsage<T>(fn: () => Promise<T> | T): Promise<{
    result: T;
    memoryBefore: NodeJS.MemoryUsage | null;
    memoryAfter: NodeJS.MemoryUsage | null;
    memoryDiff: Partial<NodeJS.MemoryUsage> | null;
  }> {
    const memoryBefore = this.getMemoryUsage();
    const result = await fn();
    const memoryAfter = this.getMemoryUsage();

    let memoryDiff: Partial<NodeJS.MemoryUsage> | null = null;
    if (memoryBefore && memoryAfter) {
      memoryDiff = {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        external: memoryAfter.external - memoryBefore.external
      };
    }

    return {
      result,
      memoryBefore,
      memoryAfter,
      memoryDiff
    };
  }
}

/**
 * Test environment setup utilities
 */
class TestEnvironment {
  /**
   * Sets up test environment variables
   */
  static setupEnv(env: Record<string, string> = {}) {
    const originalEnv = { ...process.env };
    
    Object.assign(process.env, {
      NODE_ENV: 'test',
      PORT: '3000',
      ...env
    });

    return () => {
      process.env = originalEnv;
    };
  }

  /**
   * Clears all mocks and timers
   */
  static cleanup() {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  }

  /**
   * Sets up common test spies
   */
  static setupSpies() {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    return {
      consoleLogSpy,
      consoleErrorSpy,
      consoleWarnSpy,
      restore: () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      }
    };
  }
}

// Export all utilities
export {
  createMockConfig,
  createMockRequests,
  createMockRequest,
  createMockResponse,
  createMockNext,
  wait,
  ConsoleCapture,
  MockFileSystem,
  TestDataFactory,
  TestAssertions,
  PerformanceTestHelper,
  MemoryTestHelper,
  TestEnvironment
};
