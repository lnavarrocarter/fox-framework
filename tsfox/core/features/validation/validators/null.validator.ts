/**
 * @fileoverview Null validation schema implementation
 * @module tsfox/core/features/validation/validators/null.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { SchemaInterface } from '../interfaces/validation.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Null schema implementation for null value validation
 */
export class NullSchema extends BaseSchema<null> implements SchemaInterface<null> {
  constructor() {
    super('null');
  }

  /**
   * Type-specific validation for null values
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<null> {
    if (data !== null) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected null',
          code: 'type_mismatch',
          value: data
        }]
      };
    }

    return { success: true, data: null };
  }

  /**
   * Create a copy of this schema with the same configuration
   */
  protected clone(): this {
    const cloned = new NullSchema() as this;
    return cloned;
  }
}
