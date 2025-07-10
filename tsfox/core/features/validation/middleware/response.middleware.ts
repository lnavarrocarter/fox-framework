/**
 * @fileoverview Response validation middleware
 * @module tsfox/core/features/validation/middleware/response.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { SchemaInterface } from '../interfaces/validation.interface';
import { ValidationError } from '../errors/validation.errors';

/**
 * Options for response validation middleware
 */
export interface ResponseValidationOptions {
  /**
   * Status codes to validate responses for
   * Default: [200, 201, 202]
   */
  statusCodes?: number[];
  
  /**
   * Whether to log validation errors
   */
  logErrors?: boolean;
  
  /**
   * Whether to strip unknown fields from response
   */
  stripUnknown?: boolean;
  
  /**
   * Custom error handler for validation failures
   */
  onValidationError?: (error: ValidationError, req: Request, res: Response) => void;
  
  /**
   * Whether to skip validation in production
   */
  skipInProduction?: boolean;
}

/**
 * Create response validation middleware
 */
export function validateResponse<T>(
  schema: SchemaInterface<T>,
  options: ResponseValidationOptions = {}
) {
  const {
    statusCodes = [200, 201, 202],
    logErrors = true,
    stripUnknown = false,
    onValidationError,
    skipInProduction = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation in production if configured
    if (skipInProduction && process.env.NODE_ENV === 'production') {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to validate response
    res.json = function(body: any): Response {
      // Only validate responses with configured status codes
      if (statusCodes.includes(res.statusCode)) {
        try {
          const result = schema.validate(body);
          
          if (!result.success) {
            const validationError = new ValidationError(
              'Response validation failed',
              result.errors || []
            );

            if (logErrors) {
              console.error('Response validation failed:', {
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                errors: result.errors
              });
            }

            if (onValidationError) {
              onValidationError(validationError, req, res);
              // Don't continue with original response, let the error handler manage
              return originalJson({
                error: 'Response Validation Error',
                message: 'Custom validation error handler called'
              });
            }

            // In development, return validation error details
            if (process.env.NODE_ENV !== 'production') {
              return originalJson({
                error: 'Response Validation Error',
                message: 'The response does not match the expected schema',
                details: result.errors,
                originalResponse: body
              });
            }
          } else {
            // Use validated/transformed data
            body = result.data;
          }
        } catch (error) {
          if (logErrors) {
            console.error('Response validation error:', error);
          }

          // In case of validation error, return original response in production
          if (process.env.NODE_ENV === 'production') {
            return originalJson(body);
          } else {
            return originalJson({
              error: 'Response Validation Error',
              message: 'An error occurred while validating the response',
              originalResponse: body
            });
          }
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Create response validation middleware for multiple schemas based on status code
 */
export function validateResponseByStatus(
  schemas: Record<number, SchemaInterface<any>>,
  options: Omit<ResponseValidationOptions, 'statusCodes'> = {}
) {
  const statusCodes = Object.keys(schemas).map(Number);
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation in production if configured
    if (options.skipInProduction && process.env.NODE_ENV === 'production') {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to validate response
    res.json = function(body: any): Response {
      const schema = schemas[res.statusCode];
      
      if (schema) {
        try {
          const result = schema.validate(body);
          
          if (!result.success) {
            const validationError = new ValidationError(
              `Response validation failed for status ${res.statusCode}`,
              result.errors || []
            );

            if (options.logErrors !== false) {
              console.error('Response validation failed:', {
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                errors: result.errors
              });
            }

            if (options.onValidationError) {
              options.onValidationError(validationError, req, res);
              // Don't continue with original response, let the error handler manage
              return originalJson({
                error: 'Response Validation Error',
                message: `Custom validation error handler called for status ${res.statusCode}`
              });
            }

            // In development, return validation error details
            if (process.env.NODE_ENV !== 'production') {
              return originalJson({
                error: 'Response Validation Error',
                message: `The response does not match the expected schema for status ${res.statusCode}`,
                details: result.errors,
                originalResponse: body
              });
            }
          } else {
            // Use validated/transformed data
            body = result.data;
          }
        } catch (error) {
          if (options.logErrors !== false) {
            console.error('Response validation error:', error);
          }

          // In case of validation error, return original response in production
          if (process.env.NODE_ENV === 'production') {
            return originalJson(body);
          } else {
            return originalJson({
              error: 'Response Validation Error',
              message: 'An error occurred while validating the response',
              originalResponse: body
            });
          }
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Helper to create common response validation schemas
 */
export class ResponseSchemas {
  /**
   * Standard success response schema
   */
  static success<T>(dataSchema: SchemaInterface<T>) {
    // This would use the schema builder when it's fully functional
    return {
      validate: (data: any) => {
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          if (data.success === true) {
            const dataResult = dataSchema.validate(data.data);
            if (dataResult.success) {
              return { success: true, data: { success: true, data: dataResult.data } };
            }
            return dataResult;
          }
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: 'Expected success response format',
            code: 'response.format',
            value: data
          }]
        };
      },
      sanitize: (data: any) => data,
      describe: () => ({ type: 'object', required: true }),
      optional: () => ResponseSchemas.success(dataSchema),
      required: () => ResponseSchemas.success(dataSchema),
      default: (val: any) => ResponseSchemas.success(dataSchema),
      custom: (rule: any) => ResponseSchemas.success(dataSchema)
    };
  }

  /**
   * Standard error response schema
   */
  static error() {
    return {
      validate: (data: any) => {
        if (data && typeof data === 'object' && 'error' in data && 'message' in data) {
          return { success: true, data };
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: 'Expected error response format',
            code: 'response.format',
            value: data
          }]
        };
      },
      sanitize: (data: any) => data,
      describe: () => ({ type: 'object', required: true }),
      optional: () => ResponseSchemas.error(),
      required: () => ResponseSchemas.error(),
      default: (val: any) => ResponseSchemas.error(),
      custom: (rule: any) => ResponseSchemas.error()
    };
  }

  /**
   * Paginated response schema
   */
  static paginated<T>(itemSchema: SchemaInterface<T>) {
    return {
      validate: (data: any) => {
        if (data && typeof data === 'object' && 
            'data' in data && Array.isArray(data.data) &&
            'pagination' in data && typeof data.pagination === 'object') {
          
          // Validate each item in the data array
          for (let i = 0; i < data.data.length; i++) {
            const itemResult = itemSchema.validate(data.data[i]);
            if (!itemResult.success) {
              return {
                success: false,
                errors: itemResult.errors?.map(err => ({
                  ...err,
                  path: ['data', i.toString(), ...err.path]
                }))
              };
            }
          }
          
          return { success: true, data };
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: 'Expected paginated response format',
            code: 'response.format',
            value: data
          }]
        };
      },
      sanitize: (data: any) => data,
      describe: () => ({ type: 'object', required: true }),
      optional: () => ResponseSchemas.paginated(itemSchema),
      required: () => ResponseSchemas.paginated(itemSchema),
      default: (val: any) => ResponseSchemas.paginated(itemSchema),
      custom: (rule: any) => ResponseSchemas.paginated(itemSchema)
    };
  }
}
