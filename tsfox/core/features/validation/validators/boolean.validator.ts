/**
 * @fileoverview Boolean validation schema implementation
 * @module tsfox/core/features/validation/validators/boolean.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { BooleanSchemaInterface, BooleanConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Boolean schema implementation
 */
export class BooleanSchema extends BaseSchema<boolean> implements BooleanSchemaInterface {
  protected constraints: BooleanConstraints;

  constructor() {
    super('boolean');
    this.constraints = {};
  }

  /**
   * Type-specific validation for booleans
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<boolean> {
    // Type coercion if enabled
    if (context.config.convert && typeof data !== 'boolean') {
      if (data === null || data === undefined) {
        // Handle in parent class
        return { success: false, errors: [] };
      }
      
      // Convert truthy/falsy values
      if (this.constraints.truthy && this.constraints.truthy.includes(data)) {
        data = true;
      } else if (this.constraints.falsy && this.constraints.falsy.includes(data)) {
        data = false;
      } else {
        // Standard truthy/falsy conversion
        const truthyValues: any[] = ['true', 'yes', '1', 1, 'on'];
        const falsyValues: any[] = ['false', 'no', '0', 0, 'off', ''];
        
        if (truthyValues.includes(data)) {
          data = true;
        } else if (falsyValues.includes(data)) {
          data = false;
        } else {
          return {
            success: false,
            errors: [{
              path: [...context.path],
              message: 'Cannot convert value to boolean',
              code: 'boolean.convert',
              value: data
            }]
          };
        }
      }
    }

    if (typeof data !== 'boolean') {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected boolean',
          code: 'boolean.base',
          value: data
        }]
      };
    }

    return { success: true, data };
  }

  // Fluent API methods
  truthy(...values: any[]): this {
    const clone = this.clone();
    clone.constraints.truthy = values;
    return clone;
  }

  falsy(...values: any[]): this {
    const clone = this.clone();
    clone.constraints.falsy = values;
    return clone;
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    return cloned;
  }
}
