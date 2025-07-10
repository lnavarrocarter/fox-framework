/**
 * @fileoverview Core validation interfaces for Fox Framework
 * @module tsfox/core/features/validation/interfaces/validation.interface
 */

/**
 * Main validation interface that defines core validation operations
 */
export interface ValidationInterface {
  /**
   * Validate data against a schema synchronously
   */
  validate<T>(data: unknown, schema: Schema<T>): ValidationResult<T>;
  
  /**
   * Validate data against a schema asynchronously
   */
  validateAsync<T>(data: unknown, schema: Schema<T>): Promise<ValidationResult<T>>;
  
  /**
   * Sanitize data according to schema rules
   */
  sanitize<T>(data: unknown, schema: Schema<T>): T;
  
  /**
   * Transform data using a transformer function
   */
  transform<T, U>(data: T, transformer: Transformer<T, U>): U;
}

/**
 * Schema interface that defines validation rules and operations
 */
export interface SchemaInterface<T = any> {
  /**
   * Validate data against this schema
   */
  validate(data: unknown, config?: ValidationConfig): ValidationResult<T>;
  
  /**
   * Sanitize data according to this schema
   */
  sanitize(data: unknown): T;
  
  /**
   * Get a description of this schema
   */
  describe(): SchemaDescription;
  
  /**
   * Make this schema optional
   */
  optional(): SchemaInterface<T | undefined>;
  
  /**
   * Make this schema required
   */
  required(): SchemaInterface<T>;
  
  /**
   * Set a default value for this schema
   */
  default(value: T): SchemaInterface<T>;
  
  /**
   * Add a custom validation rule
   */
  custom(rule: ValidatorInterface<T>): SchemaInterface<T>;
}

/**
 * Validator interface for custom validators
 */
export interface ValidatorInterface<T = any> {
  /**
   * Validator name
   */
  name: string;
  
  /**
   * Validation function
   */
  validate: (value: unknown) => ValidationResult<T>;
  
  /**
   * Error message for validation failures
   */
  message?: string;
  
  /**
   * Error code for validation failures
   */
  code?: string;
}

/**
 * Validation result containing success status and data/errors
 */
export interface ValidationResult<T = any> {
  /**
   * Whether validation was successful
   */
  success: boolean;
  
  /**
   * Validated and transformed data (only present if success is true)
   */
  data?: T;
  
  /**
   * Validation errors (only present if success is false)
   */
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Path to the field that failed validation
   */
  path: string[];
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Error code for programmatic handling
   */
  code: string;
  
  /**
   * The value that failed validation
   */
  value?: unknown;
}

/**
 * Schema description for introspection and documentation
 */
export interface SchemaDescription {
  /**
   * Type of the schema (string, number, object, etc.)
   */
  type: string;
  
  /**
   * Whether the field is required
   */
  required: boolean;
  
  /**
   * Additional constraints and validation rules
   */
  constraints?: Record<string, any>;
  
  /**
   * Child schemas for object types
   */
  children?: Record<string, SchemaDescription>;
}

/**
 * Configuration options for validation
 */
export interface ValidationConfig {
  /**
   * Stop validation on first error
   */
  abortEarly?: boolean;
  
  /**
   * Allow unknown fields in objects
   */
  allowUnknown?: boolean;
  
  /**
   * Remove unknown fields from result
   */
  stripUnknown?: boolean;
  
  /**
   * Context data for conditional validation
   */
  context?: Record<string, any>;
}

/**
 * Type alias for schema interface
 */
export type Schema<T> = SchemaInterface<T>;

/**
 * Transformer function type
 */
export type Transformer<T, U> = (value: T) => U;
