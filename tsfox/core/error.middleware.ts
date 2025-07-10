/**
 * Error Handling Middleware for Fox Framework
 * Global error handling, logging, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { FoxError, ErrorUtils, HttpError, ErrorCode } from './error.enhanced';

export interface ErrorHandlerConfig {
  logger?: ErrorLogger;
  includeStackTrace?: boolean;
  reportToMonitoring?: boolean;
  customErrorMap?: Map<string, (error: Error) => FoxError>;
}

export interface ErrorLogger {
  error(message: string, error: Error, context?: any): void;
  warn(message: string, error: Error, context?: any): void;
  info(message: string, context?: any): void;
}

/**
 * Console-based error logger (default implementation)
 */
export class ConsoleErrorLogger implements ErrorLogger {
  error(message: string, error: Error, context?: any): void {
    console.error(`[ERROR] ${message}`, {
      error: ErrorUtils.sanitizeForLogging(error),
      context
    });
  }

  warn(message: string, error: Error, context?: any): void {
    console.warn(`[WARN] ${message}`, {
      error: ErrorUtils.sanitizeForLogging(error),
      context
    });
  }

  info(message: string, context?: any): void {
    console.info(`[INFO] ${message}`, context);
  }
}

/**
 * Error handling middleware factory
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}) {
  const logger = config.logger || new ConsoleErrorLogger();
  const includeStackTrace = config.includeStackTrace ?? (process.env.NODE_ENV === 'development');
  const reportToMonitoring = config.reportToMonitoring ?? true;

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    // Generate request ID if not present
    const requestId = req.headers['x-request-id'] as string || generateRequestId();

    // Convert to FoxError
    let foxError: FoxError;
    if (error instanceof FoxError) {
      foxError = error;
    } else {
      // Try custom error mapping first
      foxError = tryCustomMapping(error, config.customErrorMap) || 
                 convertToFoxError(error, req, requestId);
    }

    // Add request context
    foxError.context.requestId = requestId;
    foxError.context.path = req.path;
    foxError.context.method = req.method;
    foxError.context.headers = sanitizeHeaders(req.headers);
    
    // Add request body for non-GET requests (be careful with sensitive data)
    if (req.method !== 'GET' && req.body) {
      foxError.context.body = sanitizeBody(req.body);
    }

    // Log error appropriately
    logError(foxError, logger);

    // Report to monitoring if configured
    if (reportToMonitoring && ErrorUtils.shouldReport(foxError)) {
      reportErrorToMonitoring(foxError);
    }

    // Send error response
    sendErrorResponse(foxError, res, includeStackTrace);
  };
}

/**
 * Async wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Convert to error if needed
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const foxError = new HttpError(
      'Unhandled promise rejection',
      500,
      ErrorCode.INTERNAL_SERVER_ERROR,
      { metadata: { originalReason: reason } }
    );

    // Log error
    console.error('[CRITICAL] Unhandled promise rejection:', ErrorUtils.sanitizeForLogging(foxError));
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting process due to unhandled rejection');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const foxError = new HttpError(
      'Uncaught exception',
      500,
      ErrorCode.INTERNAL_SERVER_ERROR,
      { metadata: { originalError: error.message } }
    );

    console.error('[CRITICAL] Uncaught exception:', ErrorUtils.sanitizeForLogging(foxError));
    
    // Always exit on uncaught exceptions
    console.error('Exiting process due to uncaught exception');
    process.exit(1);
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    console.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    console.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

/**
 * Middleware for 404 errors (should be last middleware)
 */
export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const error = HttpError.notFound(
      `Route ${req.method} ${req.path} not found`,
      {
        path: req.path,
        method: req.method
      }
    );
    next(error);
  };
}

/**
 * Middleware to add request ID to all requests
 */
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  };
}

// Helper functions

function tryCustomMapping(
  error: Error, 
  customErrorMap?: Map<string, (error: Error) => FoxError>
): FoxError | null {
  if (!customErrorMap) return null;

  const mapper = customErrorMap.get(error.constructor.name);
  return mapper ? mapper(error) : null;
}

function convertToFoxError(error: Error, req: Request, requestId: string): FoxError {
  // Check for common error types
  if (error.name === 'ValidationError') {
    return new HttpError(
      error.message,
      422,
      ErrorCode.VALIDATION_ERROR,
      { requestId }
    );
  }

  if (error.name === 'CastError' || error.name === 'TypeError') {
    return HttpError.badRequest(
      'Invalid data provided',
      { requestId, metadata: { originalError: error.message } }
    );
  }

  if (error.name === 'MongoError' || error.message.includes('database')) {
    return HttpError.internalServerError(
      'Database error occurred',
      { requestId }
    );
  }

  // Default to internal server error
  return HttpError.internalServerError(
    'An unexpected error occurred',
    { requestId }
  );
}

function sanitizeHeaders(headers: any): Record<string, string> {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

function logError(error: FoxError, logger: ErrorLogger): void {
  const logContext = {
    requestId: error.context.requestId,
    path: error.context.path,
    method: error.context.method,
    code: error.code,
    statusCode: error.statusCode
  };

  if (error.statusCode >= 500) {
    logger.error(`Server Error: ${error.message}`, error, logContext);
  } else if (error.statusCode >= 400) {
    logger.warn(`Client Error: ${error.message}`, error, logContext);
  } else {
    logger.info(`Request processed with error: ${error.message}`, logContext);
  }
}

function sendErrorResponse(error: FoxError, res: Response, includeStackTrace: boolean): void {
  const response = error.toHttpResponse();

  // Add stack trace in development
  if (includeStackTrace && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request ID
  if (error.context.requestId) {
    response.error.requestId = error.context.requestId;
  }

  res.status(error.statusCode).json(response);
}

function reportErrorToMonitoring(error: FoxError): void {
  // This would integrate with your monitoring service
  // Examples: Sentry, Bugsnag, New Relic, etc.
  
  try {
    // Example integration point
    if (process.env.SENTRY_DSN) {
      // Sentry.captureException(error);
    }
    
    if (process.env.MONITORING_WEBHOOK_URL) {
      // Send to webhook
      // fetch(process.env.MONITORING_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(error.toJSON()) });
    }
  } catch (monitoringError) {
    console.error('Failed to report error to monitoring:', monitoringError);
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Circuit breaker implementation for resilient error handling
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 120000 // 2 minutes
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw HttpError.serviceUnavailable('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryHandler {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 10000
  ) {}

  async execute<T>(
    fn: () => Promise<T>,
    retryCondition?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (attempt === this.maxRetries || 
            (retryCondition && !retryCondition(lastError))) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
