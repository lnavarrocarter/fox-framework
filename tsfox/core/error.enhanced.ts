/**
 * Enhanced Error Handling System for Fox Framework
 * Comprehensive error classes and utilities
 */

export enum ErrorCode {
  // HTTP Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILESYSTEM_ERROR = 'FILESYSTEM_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  
  // Business Logic Errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RESOURCE_NOT_AVAILABLE = 'RESOURCE_NOT_AVAILABLE',
  OPERATION_NOT_PERMITTED = 'OPERATION_NOT_PERMITTED'
}

export interface ErrorContext {
  timestamp: Date;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  stack?: string;
  metadata?: Record<string, any>;
}

/**
 * Base error class for Fox Framework
 */
export abstract class FoxError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    context: Partial<ErrorContext> = {},
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = {
      timestamp: new Date(),
      ...context
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.context.timestamp,
      requestId: this.context.requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }

  /**
   * Create error response for HTTP
   */
  toHttpResponse(): {
    error: {
      message: string;
      code: string;
      timestamp: string;
      requestId?: string;
      details?: any;
    };
  } {
    return {
      error: {
        message: this.message,
        code: this.code,
        timestamp: this.context.timestamp.toISOString(),
        requestId: this.context.requestId,
        ...(this.getPublicDetails && { details: this.getPublicDetails() })
      }
    };
  }

  /**
   * Override in subclasses to provide public error details
   */
  protected getPublicDetails?(): any;
}

/**
 * HTTP-related errors
 */
export class HttpError extends FoxError {
  constructor(
    message: string,
    statusCode: number,
    code?: ErrorCode,
    context?: Partial<ErrorContext>
  ) {
    const errorCode = code || HttpError.getCodeFromStatus(statusCode);
    super(message, errorCode, statusCode, context);
  }

  static getCodeFromStatus(statusCode: number): ErrorCode {
    switch (statusCode) {
      case 400: return ErrorCode.BAD_REQUEST;
      case 401: return ErrorCode.UNAUTHORIZED;
      case 403: return ErrorCode.FORBIDDEN;
      case 404: return ErrorCode.NOT_FOUND;
      case 405: return ErrorCode.METHOD_NOT_ALLOWED;
      case 409: return ErrorCode.CONFLICT;
      case 422: return ErrorCode.VALIDATION_ERROR;
      case 500: return ErrorCode.INTERNAL_SERVER_ERROR;
      case 501: return ErrorCode.NOT_IMPLEMENTED;
      case 502: return ErrorCode.BAD_GATEWAY;
      case 503: return ErrorCode.SERVICE_UNAVAILABLE;
      case 504: return ErrorCode.GATEWAY_TIMEOUT;
      default: return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  // Convenience static methods
  static badRequest(message: string = 'Bad Request', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 400, ErrorCode.BAD_REQUEST, context);
  }

  static unauthorized(message: string = 'Unauthorized', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 401, ErrorCode.UNAUTHORIZED, context);
  }

  static forbidden(message: string = 'Forbidden', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 403, ErrorCode.FORBIDDEN, context);
  }

  static notFound(message: string = 'Not Found', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 404, ErrorCode.NOT_FOUND, context);
  }

  static methodNotAllowed(message: string = 'Method Not Allowed', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 405, ErrorCode.METHOD_NOT_ALLOWED, context);
  }

  static conflict(message: string = 'Conflict', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 409, ErrorCode.CONFLICT, context);
  }

  static internalServerError(message: string = 'Internal Server Error', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, context);
  }

  static serviceUnavailable(message: string = 'Service Unavailable', context?: Partial<ErrorContext>): HttpError {
    return new HttpError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, context);
  }
}

/**
 * Validation errors with field details
 */
export interface ValidationField {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

export class ValidationError extends FoxError {
  public readonly fields: ValidationField[];

  constructor(
    message: string,
    fields: ValidationField[] = [],
    context?: Partial<ErrorContext>
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 422, context);
    this.fields = fields;
  }

  protected getPublicDetails(): any {
    return {
      fields: this.fields
    };
  }

  static fieldError(field: string, message: string, value?: any): ValidationError {
    return new ValidationError(
      `Validation failed for field: ${field}`,
      [{ field, message, value }]
    );
  }

  static multipleFields(fields: ValidationField[]): ValidationError {
    return new ValidationError(
      'Multiple validation errors',
      fields
    );
  }
}

/**
 * System-level errors
 */
export class SystemError extends FoxError {
  constructor(
    message: string,
    code: ErrorCode,
    context?: Partial<ErrorContext>,
    cause?: Error
  ) {
    super(message, code, 500, context, false);
    
    if (cause) {
      this.context.metadata = {
        ...this.context.metadata,
        cause: {
          name: cause.name,
          message: cause.message,
          stack: cause.stack
        }
      };
    }
  }

  static database(message: string, cause?: Error, context?: Partial<ErrorContext>): SystemError {
    return new SystemError(message, ErrorCode.DATABASE_ERROR, context, cause);
  }

  static network(message: string, cause?: Error, context?: Partial<ErrorContext>): SystemError {
    return new SystemError(message, ErrorCode.NETWORK_ERROR, context, cause);
  }

  static filesystem(message: string, cause?: Error, context?: Partial<ErrorContext>): SystemError {
    return new SystemError(message, ErrorCode.FILESYSTEM_ERROR, context, cause);
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends FoxError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION,
    context?: Partial<ErrorContext>
  ) {
    super(message, code, 400, context);
  }

  static ruleViolation(message: string, context?: Partial<ErrorContext>): BusinessError {
    return new BusinessError(message, ErrorCode.BUSINESS_RULE_VIOLATION, context);
  }

  static resourceNotAvailable(message: string, context?: Partial<ErrorContext>): BusinessError {
    return new BusinessError(message, ErrorCode.RESOURCE_NOT_AVAILABLE, context);
  }

  static operationNotPermitted(message: string, context?: Partial<ErrorContext>): BusinessError {
    return new BusinessError(message, ErrorCode.OPERATION_NOT_PERMITTED, context);
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  static fromHttpStatus(
    statusCode: number,
    message?: string,
    context?: Partial<ErrorContext>
  ): HttpError {
    const defaultMessage = ErrorFactory.getDefaultMessage(statusCode);
    return new HttpError(message || defaultMessage, statusCode, undefined, context);
  }

  static fromError(error: Error, context?: Partial<ErrorContext>): FoxError {
    if (error instanceof FoxError) {
      return error;
    }

    // Try to determine error type from properties
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return new HttpError(
        error.message,
        error.statusCode as number,
        undefined,
        context
      );
    }

    // Default to system error
    return new SystemError(
      error.message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      context,
      error
    );
  }

  private static getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Validation Error',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };

    return messages[statusCode] || 'Unknown Error';
  }
}

/**
 * Error utilities for common operations
 */
export class ErrorUtils {
  /**
   * Check if error is operational (expected) or programming error
   */
  static isOperational(error: Error): boolean {
    if (error instanceof FoxError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extract safe error information for logging
   */
  static sanitizeForLogging(error: Error): Record<string, any> {
    const sanitized: Record<string, any> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if (error instanceof FoxError) {
      sanitized.code = error.code;
      sanitized.statusCode = error.statusCode;
      sanitized.context = error.context;
      sanitized.isOperational = error.isOperational;
    }

    return sanitized;
  }

  /**
   * Create a safe error response for clients
   */
  static createClientResponse(error: Error): Record<string, any> {
    if (error instanceof FoxError) {
      return error.toHttpResponse();
    }

    // Don't expose internal error details to clients
    return {
      error: {
        message: 'Internal Server Error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Check if error should be reported to monitoring
   */
  static shouldReport(error: Error): boolean {
    if (error instanceof FoxError) {
      // Don't report client errors (4xx) unless they're authentication/authorization
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return [ErrorCode.UNAUTHORIZED, ErrorCode.FORBIDDEN].includes(error.code);
      }
      // Report all server errors (5xx) and system errors
      return true;
    }

    // Report all non-Fox errors
    return true;
  }
}
