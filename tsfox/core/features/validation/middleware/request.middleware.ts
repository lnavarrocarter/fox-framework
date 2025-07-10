/**
 * @fileoverview Request validation middleware
 * @module tsfox/core/features/validation/middleware/request.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { SchemaInterface } from '../interfaces/validation.interface';
import { ValidationError } from '../errors/validation.errors';

/**
 * Validation schemas for different parts of the request
 */
export interface ValidationSchemas {
  /**
   * Schema for request body validation
   */
  body?: SchemaInterface<any>;
  
  /**
   * Schema for query parameters validation
   */
  query?: SchemaInterface<any>;
  
  /**
   * Schema for route parameters validation
   */
  params?: SchemaInterface<any>;
  
  /**
   * Schema for request headers validation
   */
  headers?: SchemaInterface<any>;
}

/**
 * Options for request validation middleware
 */
export interface RequestValidationOptions {
  /**
   * Stop validation on first error
   */
  abortEarly?: boolean;
  
  /**
   * Strip unknown fields from validated data
   */
  stripUnknown?: boolean;
  
  /**
   * Allow unknown fields in validated data
   */
  allowUnknown?: boolean;
  
  /**
   * Convert string values to appropriate types
   */
  convert?: boolean;
  
  /**
   * Custom error handler
   */
  errorHandler?: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Create request validation middleware
 */
export function validateRequest(
  schemas: ValidationSchemas, 
  options: RequestValidationOptions = {}
) {
  const {
    abortEarly = false,
    stripUnknown = false,
    allowUnknown = false,
    convert = true,
    errorHandler
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const allErrors: any[] = [];

    try {
      // Validate body
      if (schemas.body && req.body !== undefined) {
        const result = schemas.body.validate(req.body);
        if (result.success) {
          req.body = result.data;
        } else if (result.errors) {
          const bodyErrors = result.errors.map(error => ({
            ...error,
            path: ['body', ...error.path]
          }));
          
          if (abortEarly) {
            const validationError = new ValidationError('Request body validation failed', bodyErrors);
            if (errorHandler) {
              return errorHandler(validationError, req, res, next);
            }
            return res.status(400).json({
              error: 'Validation Error',
              message: 'Request body validation failed',
              details: bodyErrors
            });
          }
          
          allErrors.push(...bodyErrors);
        }
      }

      // Validate query parameters
      if (schemas.query && req.query) {
        const result = schemas.query.validate(req.query);
        if (result.success) {
          req.query = result.data;
        } else if (result.errors) {
          const queryErrors = result.errors.map(error => ({
            ...error,
            path: ['query', ...error.path]
          }));
          
          if (abortEarly) {
            const validationError = new ValidationError('Query parameters validation failed', queryErrors);
            if (errorHandler) {
              return errorHandler(validationError, req, res, next);
            }
            return res.status(400).json({
              error: 'Validation Error',
              message: 'Query parameters validation failed',
              details: queryErrors
            });
          }
          
          allErrors.push(...queryErrors);
        }
      }

      // Validate route parameters
      if (schemas.params && req.params) {
        const result = schemas.params.validate(req.params);
        if (result.success) {
          req.params = result.data;
        } else if (result.errors) {
          const paramsErrors = result.errors.map(error => ({
            ...error,
            path: ['params', ...error.path]
          }));
          
          if (abortEarly) {
            const validationError = new ValidationError('Route parameters validation failed', paramsErrors);
            if (errorHandler) {
              return errorHandler(validationError, req, res, next);
            }
            return res.status(400).json({
              error: 'Validation Error',
              message: 'Route parameters validation failed',
              details: paramsErrors
            });
          }
          
          allErrors.push(...paramsErrors);
        }
      }

      // Validate headers
      if (schemas.headers && req.headers) {
        const result = schemas.headers.validate(req.headers);
        if (result.success) {
          // Note: We don't override req.headers as it might break Express functionality
          // Instead, store validated headers in a custom property
          (req as any).validatedHeaders = result.data;
        } else if (result.errors) {
          const headersErrors = result.errors.map(error => ({
            ...error,
            path: ['headers', ...error.path]
          }));
          
          if (abortEarly) {
            const validationError = new ValidationError('Request headers validation failed', headersErrors);
            if (errorHandler) {
              return errorHandler(validationError, req, res, next);
            }
            return res.status(400).json({
              error: 'Validation Error',
              message: 'Request headers validation failed',
              details: headersErrors
            });
          }
          
          allErrors.push(...headersErrors);
        }
      }

      // If there were any validation errors and not aborting early, handle them
      if (allErrors.length > 0) {
        const validationError = new ValidationError('Request validation failed', allErrors);
        if (errorHandler) {
          return errorHandler(validationError, req, res, next);
        }
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: allErrors
        });
      }

      // All validations passed
      next();

    } catch (error) {
      // Handle unexpected errors during validation
      const validationError = error instanceof ValidationError 
        ? error 
        : new ValidationError('Unexpected validation error', []);
        
      if (errorHandler) {
        return errorHandler(validationError, req, res, next);
      }
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during request validation'
      });
    }
  };
}

/**
 * Validate only request body
 */
export function validateBody<T>(schema: SchemaInterface<T>, options?: RequestValidationOptions) {
  return validateRequest({ body: schema }, options);
}

/**
 * Validate only query parameters
 */
export function validateQuery<T>(schema: SchemaInterface<T>, options?: RequestValidationOptions) {
  return validateRequest({ query: schema }, options);
}

/**
 * Validate only route parameters
 */
export function validateParams<T>(schema: SchemaInterface<T>, options?: RequestValidationOptions) {
  return validateRequest({ params: schema }, options);
}

/**
 * Validate only request headers
 */
export function validateHeaders<T>(schema: SchemaInterface<T>, options?: RequestValidationOptions) {
  return validateRequest({ headers: schema }, options);
}
