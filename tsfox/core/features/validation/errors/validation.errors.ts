/**
 * @fileoverview Validation-specific error classes
 * @module tsfox/core/features/validation/errors/validation.errors
 */

import { ValidationError as IValidationError } from '../interfaces/validation.interface';
import { FoxError, ErrorCode } from '../../../error.enhanced';

/**
 * Standard validation error codes
 */
export const ValidationErrors = {
  // General
  REQUIRED: 'required',
  TYPE_MISMATCH: 'type_mismatch',
  INVALID_VALUE: 'invalid_value',
  
  // String
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  EXACT_LENGTH: 'exact_length',
  INVALID_EMAIL: 'invalid_email',
  INVALID_URL: 'invalid_url',
  INVALID_UUID: 'invalid_uuid',
  INVALID_DATETIME: 'invalid_datetime',
  INVALID_CUID: 'invalid_cuid',
  PATTERN_MISMATCH: 'pattern_mismatch',
  
  // Number
  MIN_VALUE: 'min_value',
  MAX_VALUE: 'max_value',
  NOT_INTEGER: 'not_integer',
  NOT_POSITIVE: 'not_positive',
  NOT_NEGATIVE: 'not_negative',
  NOT_FINITE: 'not_finite',
  
  // Array
  MIN_ITEMS: 'min_items',
  MAX_ITEMS: 'max_items',
  EXACT_ITEMS: 'exact_items',
  DUPLICATE_ITEMS: 'duplicate_items',
  
  // Object
  UNKNOWN_PROPERTY: 'unknown_property',
  MISSING_PROPERTY: 'missing_property',
  
  // Date
  MIN_DATE: 'min_date',
  MAX_DATE: 'max_date',
  INVALID_DATE: 'invalid_date',
  
  // Schema
  SCHEMA_MISMATCH: 'schema_mismatch',
  UNION_NO_MATCH: 'union_no_match',
  DISCRIMINATOR_MISSING: 'discriminator_missing',
  
  // Custom
  CUSTOM_VALIDATION: 'custom_validation'
} as const;

/**
 * Validation error class for handling validation failures
 */
export class ValidationError extends FoxError {
  public readonly validationErrors: IValidationError[];

  constructor(
    message: string,
    validationErrors: IValidationError[] = [],
    statusCode: number = 400
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, statusCode);
    this.validationErrors = validationErrors;
    this.name = 'ValidationError';
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Create a validation error from a single field
   */
  static fromField(
    path: string[],
    message: string,
    code: string,
    value?: unknown
  ): ValidationError {
    return new ValidationError(
      `Validation failed for field: ${path.join('.')}`,
      [{
        path,
        message,
        code,
        value
      }]
    );
  }

  /**
   * Create a validation error for required field
   */
  static required(path: string[], value?: unknown): ValidationError {
    return ValidationError.fromField(
      path,
      `Field "${path.join('.')}" is required`,
      'any.required',
      value
    );
  }

  /**
   * Create a validation error for invalid type
   */
  static invalidType(
    path: string[], 
    expected: string, 
    actual: string, 
    value?: unknown
  ): ValidationError {
    return ValidationError.fromField(
      path,
      `Expected ${expected} but received ${actual}`,
      `${expected}.base`,
      value
    );
  }

  /**
   * Get formatted error messages for display
   */
  getFormattedErrors(): string[] {
    return this.validationErrors.map(error => {
      const fieldPath = error.path.length > 0 ? `${error.path.join('.')}: ` : '';
      return `${fieldPath}${error.message}`;
    });
  }

  /**
   * Get errors grouped by field path
   */
  getErrorsByField(): Record<string, string[]> {
    const errorsByField: Record<string, string[]> = {};
    
    this.validationErrors.forEach(error => {
      const fieldPath = error.path.join('.') || 'root';
      if (!errorsByField[fieldPath]) {
        errorsByField[fieldPath] = [];
      }
      errorsByField[fieldPath].push(error.message);
    });
    
    return errorsByField;
  }

  /**
   * Check if error exists for specific field
   */
  hasErrorForField(path: string[]): boolean {
    return this.validationErrors.some(error => 
      error.path.length === path.length &&
      error.path.every((segment, index) => segment === path[index])
    );
  }

  /**
   * Get first error for a specific field
   */
  getFirstErrorForField(path: string[]): IValidationError | undefined {
    return this.validationErrors.find(error => 
      error.path.length === path.length &&
      error.path.every((segment, index) => segment === path[index])
    );
  }

  /**
   * Convert to a plain object for JSON serialization
   */
  toJSON(): object {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
      errorsByField: this.getErrorsByField()
    };
  }
}

/**
 * Schema compilation error for invalid schema definitions
 */
export class SchemaError extends FoxError {
  public details?: any;

  constructor(message: string, details?: any) {
    super(message, ErrorCode.INTERNAL_SERVER_ERROR, 500);
    this.name = 'SchemaError';
    this.details = details;
    
    Object.setPrototypeOf(this, SchemaError.prototype);
  }

  /**
   * Create error for invalid schema type
   */
  static invalidType(type: string): SchemaError {
    return new SchemaError(`Invalid schema type: ${type}`);
  }

  /**
   * Create error for missing required schema property
   */
  static missingProperty(property: string): SchemaError {
    return new SchemaError(`Missing required schema property: ${property}`);
  }

  /**
   * Create error for invalid constraint value
   */
  static invalidConstraint(constraint: string, value: any): SchemaError {
    return new SchemaError(
      `Invalid constraint value for ${constraint}: ${value}`
    );
  }
}

/**
 * Custom validator error for user-defined validators
 */
export class CustomValidatorError extends ValidationError {
  public readonly validatorName: string;

  constructor(
    validatorName: string,
    message: string,
    path: string[] = [],
    value?: unknown
  ) {
    super(
      `Custom validator "${validatorName}" failed: ${message}`,
      [{
        path,
        message,
        code: `custom.${validatorName}`,
        value
      }]
    );
    this.validatorName = validatorName;
    this.name = 'CustomValidatorError';
    
    Object.setPrototypeOf(this, CustomValidatorError.prototype);
  }
}

/**
 * Async validation error for promise-based validators
 */
export class AsyncValidationError extends ValidationError {
  public details?: any;

  constructor(
    message: string,
    validationErrors: IValidationError[] = [],
    originalError?: Error
  ) {
    super(message, validationErrors);
    this.name = 'AsyncValidationError';
    
    if (originalError) {
      this.stack = originalError.stack;
      this.details = { originalError: originalError.message };
    }
    
    Object.setPrototypeOf(this, AsyncValidationError.prototype);
  }
}
