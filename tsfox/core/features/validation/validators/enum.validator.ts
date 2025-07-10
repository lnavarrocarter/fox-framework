/**
 * @fileoverview Enum validation schema implementation
 * @module tsfox/core/features/validation/validators/enum.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Enum schema implementation for predefined value validation
 */
export class EnumSchema<T extends string | number> extends BaseSchema<T> {
  protected allowedValues: T[];

  constructor(allowedValues: T[]) {
    super('enum');
    this.allowedValues = allowedValues;
  }

  /**
   * Type-specific validation for enum values
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<T> {
    if (!this.allowedValues.includes(data as T)) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: `Value must be one of: ${this.allowedValues.join(', ')}`,
          code: 'enum.base',
          value: data
        }]
      };
    }

    return { success: true, data: data as T };
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.allowedValues = [...this.allowedValues];
    return cloned;
  }
}
