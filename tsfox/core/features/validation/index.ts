/**
 * @fileoverview Main entry point for validation system
 * @module tsfox/core/features/validation
 */

// Export the main factory
export { ValidationFactory as default, ValidationFactory } from './validation.factory';

// Export schema builder for easy access
export { SchemaBuilder } from './schema/schema.builder';

// Export commonly used middleware
export { 
  validateRequest, 
  validateBody, 
  validateQuery, 
  validateParams, 
  validateHeaders 
} from './middleware/request.middleware';

export { 
  validateResponse, 
  validateResponseByStatus, 
  ResponseSchemas 
} from './middleware/response.middleware';

// Export error classes
export { ValidationError } from './errors/validation.errors';

// Export key interfaces
export type { 
  SchemaInterface, 
  ValidationResult, 
  ValidationError as IValidationError 
} from './interfaces/validation.interface';

export type { 
  ValidationSchemas, 
  RequestValidationOptions 
} from './middleware/request.middleware';

export type { 
  ResponseValidationOptions 
} from './middleware/response.middleware';
