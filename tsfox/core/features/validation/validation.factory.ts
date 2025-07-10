/**
 * @fileoverview Main validation factory for Fox Framework
 * @module tsfox/core/features/validation/validation.factory
 */

import { ValidationInterface } from './interfaces/validation.interface';
import { SchemaBuilder } from './schema/schema.builder';
import { ValidationError } from './errors/validation.errors';
import { 
  validateRequest, 
  validateBody, 
  validateQuery, 
  validateParams, 
  validateHeaders,
  ValidationSchemas,
  RequestValidationOptions 
} from './middleware/request.middleware';
import { 
  validateResponse, 
  validateResponseByStatus,
  ResponseValidationOptions,
  ResponseSchemas 
} from './middleware/response.middleware';

/**
 * Main validation factory class
 */
export class ValidationFactory implements ValidationInterface {
  /**
   * Schema builder instance
   */
  static readonly schema = SchemaBuilder;

  /**
   * Request validation middleware
   */
  static readonly request = {
    validate: validateRequest,
    body: validateBody,
    query: validateQuery,
    params: validateParams,
    headers: validateHeaders
  };

  /**
   * Response validation middleware
   */
  static readonly response = {
    validate: validateResponse,
    byStatus: validateResponseByStatus,
    schemas: ResponseSchemas
  };

  /**
   * Error classes
   */
  static readonly errors = {
    ValidationError,
    create: (message: string, errors: any[] = []) => new ValidationError(message, errors)
  };

  /**
   * Validate data against a schema synchronously
   */
  validate<T>(data: unknown, schema: any): any {
    return schema.validate(data);
  }

  /**
   * Validate data against a schema asynchronously
   */
  async validateAsync<T>(data: unknown, schema: any): Promise<any> {
    return schema.validate(data);
  }

  /**
   * Sanitize data according to schema rules
   */
  sanitize<T>(data: unknown, schema: any): T {
    return schema.sanitize(data);
  }

  /**
   * Transform data using a transformer function
   */
  transform<T, U>(data: T, transformer: (value: T) => U): U {
    return transformer(data);
  }

  /**
   * Create a validation middleware for Express routes
   */
  static middleware(schemas: ValidationSchemas, options?: RequestValidationOptions) {
    return validateRequest(schemas, options);
  }

  /**
   * Create validation middleware for specific request parts
   */
  static bodyValidation<T>(schema: any, options?: RequestValidationOptions) {
    return validateBody(schema, options);
  }

  static queryValidation<T>(schema: any, options?: RequestValidationOptions) {
    return validateQuery(schema, options);
  }

  static paramsValidation<T>(schema: any, options?: RequestValidationOptions) {
    return validateParams(schema, options);
  }

  static headersValidation<T>(schema: any, options?: RequestValidationOptions) {
    return validateHeaders(schema, options);
  }

  /**
   * Create response validation middleware
   */
  static responseValidation<T>(schema: any, options?: ResponseValidationOptions) {
    return validateResponse(schema, options);
  }

  /**
   * Create response validation middleware by status code
   */
  static responseByStatusValidation(schemas: Record<number, any>, options?: Omit<ResponseValidationOptions, 'statusCodes'>) {
    return validateResponseByStatus(schemas, options);
  }

  /**
   * Utility methods for common validations
   */
  static utils = {
    /**
     * Check if a value is valid according to schema
     */
    isValid: (value: unknown, schema: any): boolean => {
      const result = schema.validate(value);
      return result.success;
    },

    /**
     * Parse value with schema, throw if invalid
     */
    parse: <T>(value: unknown, schema: any): T => {
      const result = schema.validate(value);
      if (!result.success) {
        throw new ValidationError('Validation failed', result.errors || []);
      }
      return result.data;
    },

    /**
     * Safe parse that returns result object
     */
    safeParse: <T>(value: unknown, schema: any) => {
      return schema.validate(value);
    },

    /**
     * Create a custom validator
     */
    createValidator: (name: string, validateFn: (value: any) => boolean | { success: boolean; errors?: any[] }, message?: string) => {
      return {
        name,
        validate: (value: any) => {
          const result = validateFn(value);
          if (typeof result === 'boolean') {
            return result 
              ? { success: true, data: value }
              : { 
                  success: false, 
                  errors: [{ 
                    path: [], 
                    message: message || `${name} validation failed`, 
                    code: `custom.${name}`,
                    value 
                  }] 
                };
          }
          return result.success 
            ? { success: true, data: value }
            : { success: false, errors: result.errors };
        },
        message
      };
    }
  };

  /**
   * Integration helpers for router
   */
  static integration = {
    /**
     * Create validation decorator for route handlers
     */
    validateRoute: (schemas: ValidationSchemas, options?: RequestValidationOptions) => {
      return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args: any[]) {
          const [req, res, next] = args;
          
          try {
            // Apply validation
            const middleware = validateRequest(schemas, options);
            await new Promise<void>((resolve, reject) => {
              middleware(req, res, (err?: any) => {
                if (err) reject(err);
                else resolve();
              });
            });
            
            // Call original method if validation passes
            return originalMethod.apply(this, args);
          } catch (error) {
            if (error instanceof ValidationError) {
              return res.status(400).json({
                error: 'Validation Error',
                message: error.message,
                details: error.validationErrors
              });
            }
            throw error;
          }
        };
        
        return descriptor;
      };
    },

    /**
     * Create OpenAPI schema from validation schema
     */
    toOpenAPI: (schema: any) => {
      // This would convert internal schema to OpenAPI format
      const description = schema.describe();
      return {
        type: description.type,
        required: description.required,
        properties: description.children,
        ...description.constraints
      };
    }
  };
}

// Export factory as default
export default ValidationFactory;

// Export commonly used items
export {
  SchemaBuilder,
  ValidationError,
  validateRequest,
  validateResponse,
  ResponseSchemas
};

// Export all interfaces (avoiding conflicts)
export * from './interfaces/validation.interface';
export * from './interfaces/schema.interface';
export { 
  ValidationContext,
  SchemaState,
  ValidationRule,
  ValidationHelpers,
  PreprocessorFunction,
  PostprocessorFunction,
  ValidationConfig as SchemaValidationConfig
} from './schema/schema.types';
export * from './middleware/request.middleware';
export * from './middleware/response.middleware';
export * from './errors/validation.errors';
