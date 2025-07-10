/**
 * @fileoverview String validation schema implementation
 * @module tsfox/core/features/validation/validators/string.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { StringSchemaInterface, StringConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * String schema implementation
 */
export class StringSchema extends BaseSchema<string> implements StringSchemaInterface {
  protected constraints: StringConstraints;

  constructor() {
    super('string');
    this.constraints = {};
  }

  /**
   * Type-specific validation for strings
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<string> {
    // Type coercion if enabled
    if (context.config.convert && typeof data !== 'string') {
      if (data === null || data === undefined) {
        // Handle in parent class
        return { success: false, errors: [] };
      }
      
      // Try to convert to string
      try {
        data = String(data);
      } catch (error) {
        return {
          success: false,
          errors: [{
            path: [...context.path],
            message: 'Cannot convert value to string',
            code: 'string.convert',
            value: data
          }]
        };
      }
    }

    if (typeof data !== 'string') {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected string',
          code: 'type_mismatch',
          value: data
        }]
      };
    }

    const errors: ValidationError[] = [];
    let processedValue = data;

    // Apply string transformations
    if (this.constraints.trim) {
      processedValue = processedValue.trim();
    }
    
    if (this.constraints.lowercase) {
      processedValue = processedValue.toLowerCase();
    }
    
    if (this.constraints.uppercase) {
      processedValue = processedValue.toUpperCase();
    }

    // Apply custom transform function
    if ((this as any)._transformFn) {
      processedValue = (this as any)._transformFn(processedValue);
    }

    // Length validations
    if (this.constraints.length !== undefined && processedValue.length !== this.constraints.length) {
      errors.push({
        path: [...context.path],
        message: `String must be exactly ${this.constraints.length} characters long`,
        code: 'exact_length',
        value: data
      });
    }

    if (this.constraints.min !== undefined && processedValue.length < this.constraints.min) {
      errors.push({
        path: [...context.path],
        message: `String must be at least ${this.constraints.min} characters long`,
        code: 'min_length',
        value: data
      });
    }

    if (this.constraints.max !== undefined && processedValue.length > this.constraints.max) {
      errors.push({
        path: [...context.path],
        message: `String must be at most ${this.constraints.max} characters long`,
        code: 'max_length',
        value: data
      });
    }

    // Pattern validations
    if (this.constraints.pattern && !this.constraints.pattern.test(processedValue)) {
      const code = (this as any)._patternCode || 'pattern_mismatch';
      errors.push({
        path: [...context.path],
        message: `String does not match required pattern`,
        code,
        value: data
      });
    }

    // Format validations
    if (this.constraints.email && !this.isValidEmail(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'String must be a valid email address',
        code: 'invalid_email',
        value: data
      });
    }

    if (this.constraints.url && !this.isValidUrl(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'String must be a valid URL',
        code: 'invalid_url',
        value: data
      });
    }

    if (this.constraints.uuid && !this.isValidUuid(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'String must be a valid UUID',
        code: 'invalid_uuid',
        value: data
      });
    }

    // Alphanumeric validation
    if (this.constraints.alphanum && !this.isAlphaNumeric(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'String must contain only alphanumeric characters',
        code: 'string.alphanum',
        value: data
      });
    }

    // Enum validations
    if (this.constraints.oneOf && !this.constraints.oneOf.includes(processedValue)) {
      errors.push({
        path: [...context.path],
        message: `String must be one of: ${this.constraints.oneOf.join(', ')}`,
        code: 'string.oneOf',
        value: data
      });
    }

    if (this.constraints.notOneOf && this.constraints.notOneOf.includes(processedValue)) {
      errors.push({
        path: [...context.path],
        message: `String must not be one of: ${this.constraints.notOneOf.join(', ')}`,
        code: 'string.notOneOf',
        value: data
      });
    }

    // Custom refinement
    if ((this as any)._refineFn && !(this as any)._refineFn(processedValue)) {
      errors.push({
        path: [...context.path],
        message: (this as any)._refineMessage || 'Custom validation failed',
        code: (this as any)._refineCode || 'string.refine',
        value: data
      });
    }

    // Transformation
    if ((this as any)._transformFn) {
      try {
        processedValue = (this as any)._transformFn(processedValue);
      } catch (error) {
        return {
          success: false,
          errors: [{
            path: [...context.path],
            message: 'Transformation function error',
            code: 'string.transform',
            value: data
          }]
        };
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: processedValue };
  }

  // Fluent API methods
  min(length: number): this {
    const clone = this.clone();
    clone.constraints.min = length;
    return clone;
  }

  max(length: number): this {
    const clone = this.clone();
    clone.constraints.max = length;
    return clone;
  }

  length(length: number): this {
    const clone = this.clone();
    clone.constraints.length = length;
    return clone;
  }

  pattern(regex: RegExp): this {
    const clone = this.clone();
    clone.constraints.pattern = regex;
    return clone;
  }

  email(): this {
    const clone = this.clone();
    clone.constraints.email = true;
    return clone;
  }

  url(): this {
    const clone = this.clone();
    clone.constraints.url = true;
    return clone;
  }

  uuid(): this {
    const clone = this.clone();
    clone.constraints.uuid = true;
    return clone;
  }

  trim(): this {
    const clone = this.clone();
    clone.constraints.trim = true;
    return clone;
  }

  lowercase(): this {
    const clone = this.clone();
    clone.constraints.lowercase = true;
    return clone;
  }

  uppercase(): this {
    const clone = this.clone();
    clone.constraints.uppercase = true;
    return clone;
  }

  alphanum(): this {
    const clone = this.clone();
    clone.constraints.alphanum = true;
    return clone;
  }

  oneOf(values: string[]): this {
    const clone = this.clone();
    clone.constraints.oneOf = values;
    return clone;
  }

  notOneOf(values: string[]): this {
    const clone = this.clone();
    clone.constraints.notOneOf = values;
    return clone;
  }

  // Additional validation methods
  regex(pattern: RegExp, code?: string): this {
    const clone = this.clone();
    clone.constraints.pattern = pattern;
    // Store custom error code for pattern validation
    (clone as any)._patternCode = code;
    return clone;
  }

  datetime(): this {
    const clone = this.clone();
    clone.constraints.pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    (clone as any)._patternCode = 'invalid_datetime';
    return clone;
  }

  cuid(): this {
    const clone = this.clone();
    clone.constraints.pattern = /^c[a-z0-9]{24}$/;
    (clone as any)._patternCode = 'invalid_cuid';
    return clone;
  }

  transform(fn: (value: string) => string): this {
    const clone = this.clone();
    // Store the transform function for use in validation
    (clone as any)._transformFn = fn;
    return clone;
  }

  refine(predicate: (value: string) => boolean, code?: string, message?: string): this {
    const clone = this.clone();
    // Store the refine function for use in validation
    (clone as any)._refineFn = predicate;
    (clone as any)._refineCode = code;
    (clone as any)._refineMessage = message || 'Custom validation failed';
    return clone;
  }

  // Helper validation methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isAlphaNumeric(str: string): boolean {
    const alphanumRegex = /^[a-zA-Z0-9]+$/;
    return alphanumRegex.test(str);
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    
    // Copy additional functions
    if ((this as any)._transformFn) {
      (cloned as any)._transformFn = (this as any)._transformFn;
    }
    if ((this as any)._refineFn) {
      (cloned as any)._refineFn = (this as any)._refineFn;
      (cloned as any)._refineCode = (this as any)._refineCode;
      (cloned as any)._refineMessage = (this as any)._refineMessage;
    }
    if ((this as any)._patternCode) {
      (cloned as any)._patternCode = (this as any)._patternCode;
    }
    
    return cloned;
  }
}
