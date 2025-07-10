/**
 * Async Error Handling Utilities for Fox Framework
 * 
 * Provides utilities for handling async operations safely and
 * catching unhandled promise rejections.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, SystemError } from './base.error';

/**
 * Type for async request handlers
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wrapper for async route handlers that automatically catches errors
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Alias for asyncHandler for middleware usage
 */
export function asyncMiddleware(fn: AsyncRequestHandler) {
  return asyncHandler(fn);
}

/**
 * Safe async operation wrapper with optional fallback
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    console.error('Safe async operation failed:', error);
    return fallback;
  }
}

/**
 * Safe async operation with error callback
 */
export async function safeAsyncWithCallback<T>(
  operation: () => Promise<T>,
  onError: (error: Error) => void,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    onError(error as Error);
    return fallback;
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new SystemError(timeoutMessage, { timeoutMs }));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Retry async operation with exponential backoff
 */
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryCondition?: (error: Error) => boolean;
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.delay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (options.retryCondition && !options.retryCondition(lastError)) {
        throw lastError;
      }

      // Don't delay on the last attempt
      if (attempt === options.maxAttempts) {
        break;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with backoff
      if (options.backoffMultiplier) {
        delay = Math.min(
          delay * options.backoffMultiplier,
          options.maxDelay || delay * 10
        );
      }
    }
  }

  throw new SystemError(
    `Operation failed after ${options.maxAttempts} attempts: ${lastError!.message}`,
    { 
      attempts: options.maxAttempts,
      lastError: lastError!.message 
    },
    lastError!
  );
}

/**
 * Setup global error handlers for unhandled rejections and exceptions
 */
export function setupGlobalAsyncErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Convert to proper error
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const systemError = new SystemError(
      'Unhandled promise rejection',
      { 
        originalReason: reason,
        promiseString: promise.toString()
      },
      error
    );

    // Log the structured error
    console.error('[CRITICAL] Unhandled promise rejection:', systemError.toJSON());
    
    // In production, consider exiting the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting process due to unhandled rejection');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const systemError = new SystemError(
      'Uncaught exception',
      { 
        originalError: error.message,
        stack: error.stack
      },
      error
    );

    console.error('[CRITICAL] Uncaught exception:', systemError.toJSON());
    
    // Always exit on uncaught exceptions
    console.error('Exiting process due to uncaught exception');
    process.exit(1);
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    // Give the server time to close existing connections
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  });

  // Handle SIGINT (Ctrl+C) gracefully
  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}

/**
 * Promise-based sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch async operations with concurrency control
 */
export async function batchAsync<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function processItem(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await operation(items[currentIndex], currentIndex);
      } catch (error) {
        // Re-throw to maintain error handling
        throw error;
      }
    }
  }

  // Create workers up to the concurrency limit
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => processItem());
  
  // Wait for all workers to complete
  await Promise.all(workers);
  
  return results;
}
