/**
 * @fileoverview Date validation schema implementation
 * @module tsfox/core/features/validation/validators/date.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { DateSchemaInterface, DateConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Date schema implementation
 */
export class DateSchema extends BaseSchema<Date> implements DateSchemaInterface {
  protected constraints: DateConstraints;

  constructor() {
    super('date');
    this.constraints = {};
  }

  /**
   * Type-specific validation for dates
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<Date> {
    let dateValue: Date;

    // Type coercion if enabled
    if (context.config.convert) {
      if (data instanceof Date) {
        dateValue = data;
      } else if (typeof data === 'string') {
        // Handle ISO string parsing
        if (this.constraints.iso && !this.isValidISOString(data)) {
          return {
            success: false,
            errors: [{
              path: [...context.path],
              message: 'String must be a valid ISO date',
              code: 'date.iso',
              value: data
            }]
          };
        }
        
        dateValue = new Date(data);
      } else if (typeof data === 'number') {
        // Handle timestamp
        if (this.constraints.timestamp === 'unix') {
          dateValue = new Date(data * 1000); // Unix timestamp is in seconds
        } else {
          dateValue = new Date(data); // JavaScript timestamp is in milliseconds
        }
      } else {
        return {
          success: false,
          errors: [{
            path: [...context.path],
            message: 'Cannot convert value to date',
            code: 'date.convert',
            value: data
          }]
        };
      }
    } else {
      if (!(data instanceof Date)) {
        return {
          success: false,
          errors: [{
            path: [...context.path],
            message: 'Expected Date object',
            code: 'date.base',
            value: data
          }]
        };
      }
      dateValue = data;
    }

    // Check if date is valid
    if (isNaN(dateValue.getTime())) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Invalid date',
          code: 'date.invalid',
          value: data
        }]
      };
    }

    const errors: ValidationError[] = [];

    // Range validations
    if (this.constraints.min) {
      const minDate = typeof this.constraints.min === 'string' 
        ? new Date(this.constraints.min) 
        : this.constraints.min;
      
      if (dateValue < minDate) {
        errors.push({
          path: [...context.path],
          message: `Date must be on or after ${minDate.toISOString()}`,
          code: 'date.min',
          value: data
        });
      }
    }

    if (this.constraints.max) {
      const maxDate = typeof this.constraints.max === 'string' 
        ? new Date(this.constraints.max) 
        : this.constraints.max;
      
      if (dateValue > maxDate) {
        errors.push({
          path: [...context.path],
          message: `Date must be on or before ${maxDate.toISOString()}`,
          code: 'date.max',
          value: data
        });
      }
    }

    if (this.constraints.greater) {
      const greaterDate = typeof this.constraints.greater === 'string' 
        ? new Date(this.constraints.greater) 
        : this.constraints.greater;
      
      if (dateValue <= greaterDate) {
        errors.push({
          path: [...context.path],
          message: `Date must be after ${greaterDate.toISOString()}`,
          code: 'date.greater',
          value: data
        });
      }
    }

    if (this.constraints.less) {
      const lessDate = typeof this.constraints.less === 'string' 
        ? new Date(this.constraints.less) 
        : this.constraints.less;
      
      if (dateValue >= lessDate) {
        errors.push({
          path: [...context.path],
          message: `Date must be before ${lessDate.toISOString()}`,
          code: 'date.less',
          value: data
        });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: dateValue };
  }

  // Fluent API methods
  min(date: Date | string): this {
    const clone = this.clone();
    clone.constraints.min = date;
    return clone;
  }

  max(date: Date | string): this {
    const clone = this.clone();
    clone.constraints.max = date;
    return clone;
  }

  greater(date: Date | string): this {
    const clone = this.clone();
    clone.constraints.greater = date;
    return clone;
  }

  less(date: Date | string): this {
    const clone = this.clone();
    clone.constraints.less = date;
    return clone;
  }

  iso(): this {
    const clone = this.clone();
    clone.constraints.iso = true;
    return clone;
  }

  timestamp(type: 'javascript' | 'unix' = 'javascript'): this {
    const clone = this.clone();
    clone.constraints.timestamp = type;
    return clone;
  }

  // Helper methods
  private isValidISOString(dateString: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoRegex.test(dateString);
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    return cloned;
  }
}
