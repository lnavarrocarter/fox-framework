/**
 * Enhanced Error Handler Middleware for Fox Framework
 * 
 * Provides comprehensive error handling with improved logging, 
 * recovery mechanisms, and client response formatting.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, HttpError, ValidationError, SystemError } from './base.error';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logger?: (error: Error, req: Request) => void;
  fallbackErrorCode?: string;
  customHandlers?: Map<string, ErrorHandler>;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
}

export type ErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

/**
 * Enhanced Error Handler Middleware Class
 */
export class ErrorHandlerMiddleware {
  private options: Required<ErrorHandlerOptions>;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      includeStack: process.env.NODE_ENV === 'development',
      logger: this.defaultLogger,
      fallbackErrorCode: 'INTERNAL_SERVER_ERROR',
      customHandlers: new Map(),
      enableCircuitBreaker: true,
      enableRetry: true,
      ...options
    };
  }

  /**
   * Main error handling middleware
   */
  handle() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Skip if response already sent
      if (res.headersSent) {
        return next(error);
      }

      // Log the error
      this.options.logger(error, req);

      // Handle known error types
      if (error instanceof BaseError) {
        return this.handleKnownError(error, req, res);
      }

      // Handle unknown errors
      return this.handleUnknownError(error, req, res);
    };
  }

  /**
   * Handle errors that extend BaseError
   */
  private handleKnownError(error: BaseError, req: Request, res: Response) {
    const customHandler = this.options.customHandlers.get(error.constructor.name);
    
    if (customHandler) {
      return customHandler(error, req, res, () => {});
    }

    const response: any = {
      error: {
        message: error.message,
        code: error.errorCode,
        status: error.statusCode,
        timestamp: new Date().toISOString(),
        requestId: this.getRequestId(req),
        ...(this.options.includeStack && { stack: error.stack }),
        ...(error.context && { context: this.sanitizeContext(error.context) })
      }
    };

    // Add specific fields for validation errors
    if (error instanceof ValidationError) {
      response.error.fields = error.fields;
    }

    res.status(error.statusCode).json(response);
  }

  /**
   * Handle unknown errors safely
   */
  private handleUnknownError(error: Error, req: Request, res: Response) {
    const statusCode = 500;
    const response = {
      error: {
        message: 'Internal server error',
        code: this.options.fallbackErrorCode,
        status: statusCode,
        timestamp: new Date().toISOString(),
        requestId: this.getRequestId(req),
        ...(this.options.includeStack && { 
          stack: error.stack,
          originalMessage: error.message 
        })
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Default error logger
   */
  private defaultLogger(error: Error, req: Request): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: this.getRequestId(req),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };

    // Use different log levels based on error type
    if (error instanceof BaseError && error.isOperational) {
      console.warn('Operational error occurred:', JSON.stringify(logData, null, 2));
    } else {
      console.error('System error occurred:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Add custom error handler for specific error types
   */
  addCustomHandler(errorType: string, handler: ErrorHandler): void {
    this.options.customHandlers.set(errorType, handler);
  }

  /**
   * Remove custom error handler
   */
  removeCustomHandler(errorType: string): boolean {
    return this.options.customHandlers.delete(errorType);
  }

  /**
   * Get or generate request ID
   */
  private getRequestId(req: Request): string {
    return req.headers['x-request-id'] as string || 
           req.headers['x-correlation-id'] as string ||
           this.generateRequestId();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Sanitize error context for safe logging
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Factory function to create error handler middleware
 */
export function createErrorHandler(options?: ErrorHandlerOptions) {
  const middleware = new ErrorHandlerMiddleware(options);
  return middleware.handle();
}
