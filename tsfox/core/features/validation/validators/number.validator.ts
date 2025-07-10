/**
 * @fileoverview Number validation schema implementation
 * @module tsfox/core/features/validation/validators/number.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { NumberSchemaInterface, NumberConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Number schema implementation
 */
export class NumberSchema extends BaseSchema<number> implements NumberSchemaInterface {
  protected constraints: NumberConstraints;

  constructor() {
    super('number');
    this.constraints = {};
  }

  /**
   * Type-specific validation for numbers
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<number> {
    // Type coercion if enabled
    if (context.config.convert && typeof data !== 'number') {
      if (data === null || data === undefined) {
        // Handle in parent class
        return { success: false, errors: [] };
      }
      
      // Try to convert to number
      if (typeof data === 'string') {
        const parsed = Number(data);
        if (!isNaN(parsed)) {
          data = parsed;
        } else {
          return {
            success: false,
            errors: [{
              path: [...context.path],
              message: 'Cannot convert string to number',
              code: 'number.convert',
              value: data
            }]
          };
        }
      } else if (typeof data === 'boolean') {
        data = data ? 1 : 0;
      } else {
        return {
          success: false,
          errors: [{
            path: [...context.path],
            message: 'Cannot convert value to number',
            code: 'number.convert',
            value: data
          }]
        };
      }
    }

    if (typeof data !== 'number') {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected number',
          code: 'number.base',
          value: data
        }]
      };
    }

    if (isNaN(data)) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Number cannot be NaN',
          code: 'number.nan',
          value: data
        }]
      };
    }

    if (!isFinite(data)) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Number must be finite',
          code: 'number.infinity',
          value: data
        }]
      };
    }

    const errors: ValidationError[] = [];
    let processedValue = data;

    // Apply precision if specified
    if (this.constraints.precision !== undefined) {
      processedValue = Number(processedValue.toFixed(this.constraints.precision));
    }

    // Integer validation
    if (this.constraints.integer && !Number.isInteger(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'Number must be an integer',
        code: 'number.integer',
        value: data
      });
    }

    // Range validations
    if (this.constraints.min !== undefined && processedValue < this.constraints.min) {
      errors.push({
        path: [...context.path],
        message: `Number must be greater than or equal to ${this.constraints.min}`,
        code: 'number.min',
        value: data
      });
    }

    if (this.constraints.max !== undefined && processedValue > this.constraints.max) {
      errors.push({
        path: [...context.path],
        message: `Number must be less than or equal to ${this.constraints.max}`,
        code: 'number.max',
        value: data
      });
    }

    if (this.constraints.greater !== undefined && processedValue <= this.constraints.greater) {
      errors.push({
        path: [...context.path],
        message: `Number must be greater than ${this.constraints.greater}`,
        code: 'number.greater',
        value: data
      });
    }

    if (this.constraints.less !== undefined && processedValue >= this.constraints.less) {
      errors.push({
        path: [...context.path],
        message: `Number must be less than ${this.constraints.less}`,
        code: 'number.less',
        value: data
      });
    }

    // Sign validations
    if (this.constraints.positive && processedValue <= 0) {
      errors.push({
        path: [...context.path],
        message: 'Number must be positive',
        code: 'number.positive',
        value: data
      });
    }

    if (this.constraints.negative && processedValue >= 0) {
      errors.push({
        path: [...context.path],
        message: 'Number must be negative',
        code: 'number.negative',
        value: data
      });
    }

    // Multiple validation
    if (this.constraints.multiple !== undefined && processedValue % this.constraints.multiple !== 0) {
      errors.push({
        path: [...context.path],
        message: `Number must be a multiple of ${this.constraints.multiple}`,
        code: 'number.multiple',
        value: data
      });
    }

    // Port validation
    if (this.constraints.port && !this.isValidPort(processedValue)) {
      errors.push({
        path: [...context.path],
        message: 'Number must be a valid port (1-65535)',
        code: 'number.port',
        value: data
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: processedValue };
  }

  // Fluent API methods
  min(value: number): this {
    const clone = this.clone();
    clone.constraints.min = value;
    return clone;
  }

  max(value: number): this {
    const clone = this.clone();
    clone.constraints.max = value;
    return clone;
  }

  greater(value: number): this {
    const clone = this.clone();
    clone.constraints.greater = value;
    return clone;
  }

  less(value: number): this {
    const clone = this.clone();
    clone.constraints.less = value;
    return clone;
  }

  positive(): this {
    const clone = this.clone();
    clone.constraints.positive = true;
    return clone;
  }

  negative(): this {
    const clone = this.clone();
    clone.constraints.negative = true;
    return clone;
  }

  integer(): this {
    const clone = this.clone();
    clone.constraints.integer = true;
    return clone;
  }

  precision(digits: number): this {
    const clone = this.clone();
    clone.constraints.precision = digits;
    return clone;
  }

  multiple(base: number): this {
    const clone = this.clone();
    clone.constraints.multiple = base;
    return clone;
  }

  port(): this {
    const clone = this.clone();
    clone.constraints.port = true;
    return clone;
  }

  // Helper validation methods
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    return cloned;
  }
}
