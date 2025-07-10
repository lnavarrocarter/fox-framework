/**
 * @fileoverview Schema types and definitions for validation system
 * @module tsfox/core/features/validation/schema/schema.types
 */

import { 
  ValidationResult, 
  ValidationError, 
  SchemaDescription,
  SchemaInterface 
} from '../interfaces/validation.interface';
import {
  StringConstraints,
  NumberConstraints,
  ObjectConstraints,
  ArrayConstraints,
  BooleanConstraints,
  DateConstraints,
  BaseConstraints
} from '../interfaces/schema.interface';

/**
 * Schema validation context
 */
export interface ValidationContext {
  /**
   * Current path being validated
   */
  path: string[];
  
  /**
   * Original root data
   */
  root: any;
  
  /**
   * Parent data object
   */
  parent?: any;
  
  /**
   * Validation configuration
   */
  config: ValidationConfig;
  
  /**
   * Key of current field being validated
   */
  key?: string;
  
  /**
   * Additional context data
   */
  context?: Record<string, any>;
}

/**
 * Validation configuration options
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
   * Convert values to proper types when possible
   */
  convert?: boolean;
  
  /**
   * Language for error messages
   */
  language?: string;
  
  /**
   * Custom error messages
   */
  messages?: Record<string, string>;
  
  /**
   * Skip functions for conditional validation
   */
  skipFunctions?: boolean;
  
  /**
   * External context for validation
   */
  context?: Record<string, any>;
}

/**
 * Schema compiler options
 */
export interface SchemaCompilerOptions {
  /**
   * Generate optimized validation functions
   */
  optimized?: boolean;
  
  /**
   * Cache compiled schemas
   */
  cache?: boolean;
  
  /**
   * Include debug information
   */
  debug?: boolean;
  
  /**
   * Custom validation functions
   */
  extensions?: Record<string, any>;
}

/**
 * Internal schema state
 */
export interface SchemaState {
  /**
   * Schema type
   */
  type: string;
  
  /**
   * Validation constraints
   */
  constraints: BaseConstraints;
  
  /**
   * Required flag
   */
  isRequired: boolean;
  
  /**
   * Optional flag
   */
  isOptional: boolean;
  
  /**
   * Default value
   */
  defaultValue?: any;
  
  /**
   * Validation flags
   */
  flags: Record<string, any>;
  
  /**
   * Custom validation rules
   */
  rules: ValidationRule[];
  
  /**
   * Pre-processing functions
   */
  preprocessors: PreprocessorFunction[];
  
  /**
   * Post-processing functions
   */
  postprocessors: PostprocessorFunction[];
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /**
   * Rule name
   */
  name: string;
  
  /**
   * Validation function
   */
  validate: (value: any, helpers: ValidationHelpers) => ValidationResult<any>;
  
  /**
   * Rule parameters
   */
  params?: any;
  
  /**
   * Error message template
   */
  message?: string;
  
  /**
   * Error code
   */
  code?: string;
  
  /**
   * Priority for rule execution
   */
  priority?: number;
}

/**
 * Validation helpers for custom rules
 */
export interface ValidationHelpers {
  /**
   * Current validation context
   */
  context: ValidationContext;
  
  /**
   * Create validation error
   */
  error(code: string, message?: string, value?: any): ValidationError;
  
  /**
   * Get message template
   */
  message(template: string, params?: Record<string, any>): string;
  
  /**
   * Clone current state
   */
  clone(): ValidationHelpers;
  
  /**
   * Warn about deprecation
   */
  warn(message: string): void;
}

/**
 * Preprocessor function type
 */
export type PreprocessorFunction = (value: any, helpers: ValidationHelpers) => any;

/**
 * Postprocessor function type
 */
export type PostprocessorFunction = (value: any, helpers: ValidationHelpers) => any;

/**
 * Schema reference for recursive schemas
 */
export interface SchemaReference {
  /**
   * Reference key
   */
  key: string;
  
  /**
   * Reference path
   */
  path?: string;
  
  /**
   * Context mapping
   */
  contextMapping?: Record<string, string>;
}

/**
 * Conditional schema definition
 */
export interface ConditionalSchema {
  /**
   * Condition to evaluate
   */
  condition: {
    /**
     * Key to check
     */
    key: string;
    
    /**
     * Expected value or predicate
     */
    is?: any | ((value: any) => boolean);
    
    /**
     * Existence check
     */
    exists?: boolean;
  };
  
  /**
   * Schema to use when condition is true
   */
  then?: SchemaInterface<any>;
  
  /**
   * Schema to use when condition is false
   */
  otherwise?: SchemaInterface<any>;
}

/**
 * Alternative schema for union types
 */
export interface AlternativeSchema {
  /**
   * Alternative schemas to try
   */
  alternatives: SchemaInterface<any>[];
  
  /**
   * Match mode: first successful or all must match
   */
  mode: 'one' | 'all';
  
  /**
   * Custom error message for no matches
   */
  message?: string;
}

/**
 * Extension definition for custom schema types
 */
export interface SchemaExtension {
  /**
   * Extension type name
   */
  type: string;
  
  /**
   * Base schema type to extend
   */
  base?: string;
  
  /**
   * Coercion function
   */
  coerce?: (value: any, helpers: ValidationHelpers) => any;
  
  /**
   * Validation rules
   */
  rules?: Record<string, ValidationRule>;
  
  /**
   * Description generator
   */
  describe?: (schema: any) => Partial<SchemaDescription>;
}

/**
 * Type inference utilities
 */
export type InferSchemaType<T> = T extends SchemaInterface<infer U> ? U : never;

/**
 * Object shape type for object schemas
 */
export type ObjectShape<T = any> = {
  [K in keyof T]: SchemaInterface<T[K]>;
};

/**
 * Conditional type for optional fields
 */
export type OptionalFields<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Conditional type for required fields
 */
export type RequiredFields<T> = {
  [K in keyof T]: undefined extends T[K] ? never : K;
}[keyof T];

/**
 * Schema compilation result
 */
export interface CompiledSchema<T = any> {
  /**
   * Compiled validation function
   */
  validate: (value: unknown, context?: ValidationContext) => ValidationResult<T>;
  
  /**
   * Schema description
   */
  describe: () => SchemaDescription;
  
  /**
   * Schema serialization
   */
  serialize: () => string;
  
  /**
   * Source schema
   */
  source: SchemaInterface<T>;
}
