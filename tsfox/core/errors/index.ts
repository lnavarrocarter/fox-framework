/**
 * Error Handling System - Main Exports
 * 
 * Comprehensive error handling system for Fox Framework including
 * error classes, middleware, async handling, circuit breakers, 
 * retry mechanisms, and health checks.
 */

// Base Error Classes
export * from './base.error';

// Error Middleware
export * from './error.middleware';

// Async Error Handling
export * from './async-handler';

// Resilience Systems
export { 
  CircuitBreaker, 
  CircuitBreakerManager, 
  CircuitState, 
  type CircuitBreakerOptions,
  type CircuitBreakerStats 
} from '../resilience/circuit-breaker';

export { 
  retry, 
  retryLinear, 
  retryExponential, 
  retryOnCondition,
  RetryConditions,
  RetryManager,
  retryable,
  type RetryOptions as ResilienceRetryOptions,
  type RetryStats 
} from '../resilience/retry';

// Health Check System
export * from '../health/health-check';

// Legacy exports for backward compatibility
export { FoxError, HttpError, ValidationError, SystemError, BusinessError } from '../error.enhanced';
export { createErrorHandler as createLegacyErrorHandler } from '../error.middleware';

/**
 * Quick setup function for comprehensive error handling
 */
export function setupErrorHandling(options: {
  includeStack?: boolean;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  enableHealthChecks?: boolean;
} = {}) {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    enableCircuitBreaker = true,
    enableRetry = true,
    enableHealthChecks = true
  } = options;

  // Setup global async error handlers
  if (enableRetry || enableCircuitBreaker) {
    const { setupGlobalAsyncErrorHandlers } = require('./async-handler');
    setupGlobalAsyncErrorHandlers();
  }

  return {
    // Error middleware factory
    createErrorHandler: (customOptions?: any) => {
      const { createErrorHandler } = require('./error.middleware');
      return createErrorHandler({
        includeStack,
        ...customOptions
      });
    },

    // Circuit breaker manager
    ...(enableCircuitBreaker && {
      CircuitBreakerManager: require('../resilience/circuit-breaker').CircuitBreakerManager
    }),

    // Retry utilities
    ...(enableRetry && {
      retry: require('../resilience/retry').retry,
      retryExponential: require('../resilience/retry').retryExponential,
      RetryConditions: require('../resilience/retry').RetryConditions
    }),

    // Health check system
    ...(enableHealthChecks && {
      HealthChecker: require('../health/health-check').HealthChecker,
      defaultHealthChecks: require('../health/health-check').defaultHealthChecks,
      createHealthCheckMiddleware: require('../health/health-check').createHealthCheckMiddleware
    })
  };
}
