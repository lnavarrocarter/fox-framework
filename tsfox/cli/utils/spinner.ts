/**
 * Ora Wrapper for Jest Compatibility
 * Handles ES Module import issues in test environment
 */

import type { Ora, Options } from 'ora';

interface MockSpinner {
  start: (text?: string) => MockSpinner;
  succeed: (text?: string) => MockSpinner;
  fail: (text?: string) => MockSpinner;
  warn: (text?: string) => MockSpinner;
  info: (text?: string) => MockSpinner;
  stop: () => MockSpinner;
  clear: () => MockSpinner;
  text: string;
}

/**
 * Create a spinner instance
 */
export async function createSpinner(options?: Options | string): Promise<Ora | MockSpinner> {
  // Check if we're in a test environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    // Return a mock spinner for tests
    const mockSpinner: MockSpinner = {
      start: (text?: string) => {
        if (text) mockSpinner.text = text;
        return mockSpinner;
      },
      succeed: (text?: string) => {
        if (text) console.log(`✅ ${text}`);
        return mockSpinner;
      },
      fail: (text?: string) => {
        if (text) console.log(`❌ ${text}`);
        return mockSpinner;
      },
      warn: (text?: string) => {
        if (text) console.log(`⚠️ ${text}`);
        return mockSpinner;
      },
      info: (text?: string) => {
        if (text) console.log(`ℹ️ ${text}`);
        return mockSpinner;
      },
      stop: () => mockSpinner,
      clear: () => mockSpinner,
      text: typeof options === 'string' ? options : (options as Options)?.text || ''
    };
    
    return mockSpinner;
  }

  // In production/development, use the real ora
  try {
    const { default: ora } = await import('ora');
    return ora(options);
  } catch (error) {
    // Fallback if ora import fails
    console.warn('Ora not available, using fallback spinner');
    const mockSpinner: MockSpinner = {
      start: (text?: string) => {
        if (text) console.log(`🔄 ${text}`);
        return mockSpinner;
      },
      succeed: (text?: string) => {
        if (text) console.log(`✅ ${text}`);
        return mockSpinner;
      },
      fail: (text?: string) => {
        if (text) console.log(`❌ ${text}`);
        return mockSpinner;
      },
      warn: (text?: string) => {
        if (text) console.log(`⚠️ ${text}`);
        return mockSpinner;
      },
      info: (text?: string) => {
        if (text) console.log(`ℹ️ ${text}`);
        return mockSpinner;
      },
      stop: () => mockSpinner,
      clear: () => mockSpinner,
      text: typeof options === 'string' ? options : (options as Options)?.text || ''
    };
    
    return mockSpinner;
  }
}

export default createSpinner;
