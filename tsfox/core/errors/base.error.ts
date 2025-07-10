/**
 * Base Error Classes for Fox Framework
 * 
 * This file defines the foundational error classes that all framework errors
 * should extend from, providing consistent error handling patterns.
 */

export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON for logging/debugging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString(),
      isOperational: this.isOperational
    };
  }

  /**
   * Get client-safe error representation
   */
  toClientError(): Record<string, any> {
    return {
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * HTTP Error class for web request errors
 */
export class HttpError extends BaseError {
  readonly isOperational = true;

  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errorCode: string = 'HTTP_ERROR',
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, context, cause);
  }

  /**
   * Factory methods for common HTTP errors
   */
  static badRequest(message: string = 'Bad Request', context?: Record<string, any>): HttpError {
    return new HttpError(400, message, 'BAD_REQUEST', context);
  }

  static unauthorized(message: string = 'Unauthorized', context?: Record<string, any>): HttpError {
    return new HttpError(401, message, 'UNAUTHORIZED', context);
  }

  static forbidden(message: string = 'Forbidden', context?: Record<string, any>): HttpError {
    return new HttpError(403, message, 'FORBIDDEN', context);
  }

  static notFound(message: string = 'Not Found', context?: Record<string, any>): HttpError {
    return new HttpError(404, message, 'NOT_FOUND', context);
  }

  static conflict(message: string = 'Conflict', context?: Record<string, any>): HttpError {
    return new HttpError(409, message, 'CONFLICT', context);
  }

  static internalServerError(message: string = 'Internal Server Error', context?: Record<string, any>): HttpError {
    return new HttpError(500, message, 'INTERNAL_SERVER_ERROR', context);
  }

  static notImplemented(message: string = 'Not Implemented', context?: Record<string, any>): HttpError {
    return new HttpError(501, message, 'NOT_IMPLEMENTED', context);
  }

  static serviceUnavailable(message: string = 'Service Unavailable', context?: Record<string, any>): HttpError {
    return new HttpError(503, message, 'SERVICE_UNAVAILABLE', context);
  }
}

/**
 * Validation Error for input validation failures
 */
export interface ValidationFieldError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly fields: ValidationFieldError[],
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fields: this.fields
    };
  }

  toClientError(): Record<string, any> {
    return {
      ...super.toClientError(),
      fields: this.fields
    };
  }
}

/**
 * System Error for internal system failures
 */
export class SystemError extends BaseError {
  readonly statusCode = 500;
  readonly errorCode = 'SYSTEM_ERROR';
  readonly isOperational = false;

  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message, context, cause);
  }
}

/**
 * Configuration Error for setup/config issues
 */
export class ConfigurationError extends BaseError {
  readonly statusCode = 500;
  readonly errorCode = 'CONFIGURATION_ERROR';
  readonly isOperational = false;

  constructor(
    message: string,
    public readonly configKey: string,
    context?: Record<string, any>
  ) {
    super(message, { ...context, configKey });
  }
}

/**
 * Business Logic Error for domain-specific errors
 */
export class BusinessError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'BUSINESS_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly businessCode: string,
    context?: Record<string, any>
  ) {
    super(message, { ...context, businessCode });
  }
}

/**
 * Retry Error for failed retry operations
 */
export class RetryError extends BaseError {
  readonly statusCode = 500;
  readonly errorCode = 'RETRY_EXHAUSTED';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message, { attempts }, lastError);
  }
}
