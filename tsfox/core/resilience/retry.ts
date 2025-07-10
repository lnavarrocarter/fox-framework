/**
 * Retry Mechanism for Fox Framework
 * 
 * Provides configurable retry logic with exponential backoff,
 * jitter, and custom retry conditions.
 */

import { RetryError } from '../errors/base.error';

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryStats {
  attempts: number;
  totalDelay: number;
  lastError?: Error;
  successful: boolean;
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    successful: false
  };

  let lastError: Error;
  let delay = options.delay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    stats.attempts = attempt;
    
    try {
      const result = await operation();
      stats.successful = true;
      return result;
    } catch (error) {
      lastError = error as Error;
      stats.lastError = lastError;

      // Check if we should retry this error
      if (options.retryCondition && !options.retryCondition(lastError)) {
        break;
      }

      // Don't delay on the last attempt
      if (attempt === options.maxAttempts) {
        break;
      }

      // Call retry callback if provided
      if (options.onRetry) {
        options.onRetry(lastError, attempt);
      }

      // Calculate delay with optional jitter
      let actualDelay = delay;
      if (options.jitter) {
        // Add random jitter (±25%)
        const jitterRange = delay * 0.25;
        actualDelay = delay + (Math.random() - 0.5) * 2 * jitterRange;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, Math.max(0, actualDelay)));
      stats.totalDelay += actualDelay;

      // Calculate next delay with backoff
      if (options.backoffMultiplier) {
        delay = Math.min(
          delay * options.backoffMultiplier,
          options.maxDelay || delay * 10
        );
      }
    }
  }

  throw new RetryError(
    `Operation failed after ${options.maxAttempts} attempts: ${lastError!.message}`,
    options.maxAttempts,
    lastError!
  );
}

/**
 * Retry with linear backoff
 */
export async function retryLinear<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return retry(operation, {
    maxAttempts,
    delay: delayMs,
    backoffMultiplier: 1 // Linear (no exponential increase)
  });
}

/**
 * Retry with exponential backoff
 */
export async function retryExponential<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<T> {
  return retry(operation, {
    maxAttempts,
    delay: initialDelayMs,
    backoffMultiplier: 2,
    maxDelay: maxDelayMs,
    jitter: true
  });
}

/**
 * Retry only for specific error types
 */
export async function retryOnCondition<T>(
  operation: () => Promise<T>,
  condition: (error: Error) => boolean,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return retry(operation, {
    maxAttempts,
    delay: delayMs,
    retryCondition: condition
  });
}

/**
 * Default retry conditions
 */
export const RetryConditions = {
  /**
   * Retry on network errors
   */
  networkErrors: (error: Error): boolean => {
    const networkErrorCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'];
    return networkErrorCodes.some(code => error.message.includes(code));
  },

  /**
   * Retry on HTTP 5xx errors
   */
  serverErrors: (error: any): boolean => {
    return error.status >= 500 && error.status < 600;
  },

  /**
   * Retry on specific HTTP status codes
   */
  httpStatus: (statusCodes: number[]) => (error: any): boolean => {
    return statusCodes.includes(error.status);
  },

  /**
   * Retry on temporary errors (combining network and server errors)
   */
  temporaryErrors: (error: any): boolean => {
    return RetryConditions.networkErrors(error) || RetryConditions.serverErrors(error);
  },

  /**
   * Never retry (useful for testing or specific scenarios)
   */
  never: (): boolean => false,

  /**
   * Always retry (use with caution)
   */
  always: (): boolean => true
};

/**
 * Retry decorator for class methods
 */
export function retryable(options: RetryOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Retry manager for coordinating multiple retry operations
 */
export class RetryManager {
  private activeRetries = new Map<string, Promise<any>>();
  private retryStats = new Map<string, RetryStats[]>();

  /**
   * Execute operation with retry, ensuring only one retry per key
   */
  async executeWithRetry<T>(
    key: string,
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    // If already retrying this operation, return the existing promise
    if (this.activeRetries.has(key)) {
      return this.activeRetries.get(key) as Promise<T>;
    }

    const retryPromise = this.performRetry(key, operation, options);
    this.activeRetries.set(key, retryPromise);

    try {
      const result = await retryPromise;
      return result;
    } finally {
      this.activeRetries.delete(key);
    }
  }

  /**
   * Internal retry execution with stats tracking
   */
  private async performRetry<T>(
    key: string,
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await retry(operation, {
        ...options,
        onRetry: (error, attempt) => {
          // Track retry stats
          if (!this.retryStats.has(key)) {
            this.retryStats.set(key, []);
          }
          
          const stats = this.retryStats.get(key)!;
          stats.push({
            attempts: attempt,
            totalDelay: Date.now() - startTime,
            lastError: error,
            successful: false
          });

          // Call original onRetry if provided
          if (options.onRetry) {
            options.onRetry(error, attempt);
          }
        }
      });

      // Mark as successful
      const stats = this.retryStats.get(key);
      if (stats && stats.length > 0) {
        stats[stats.length - 1].successful = true;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get retry statistics for a key
   */
  getRetryStats(key: string): RetryStats[] {
    return this.retryStats.get(key) || [];
  }

  /**
   * Get all retry statistics
   */
  getAllRetryStats(): Record<string, RetryStats[]> {
    const allStats: Record<string, RetryStats[]> = {};
    for (const [key, stats] of this.retryStats) {
      allStats[key] = stats;
    }
    return allStats;
  }

  /**
   * Clear retry statistics
   */
  clearRetryStats(key?: string): void {
    if (key) {
      this.retryStats.delete(key);
    } else {
      this.retryStats.clear();
    }
  }

  /**
   * Get active retry operations count
   */
  getActiveRetryCount(): number {
    return this.activeRetries.size;
  }

  /**
   * Check if operation is currently being retried
   */
  isRetrying(key: string): boolean {
    return this.activeRetries.has(key);
  }
}
