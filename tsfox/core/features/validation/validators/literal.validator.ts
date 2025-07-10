/**
 * @fileoverview Literal validation schema implementation
 * @module tsfox/core/features/validation/validators/literal.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { LiteralSchemaInterface } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Literal schema implementation for exact value matching
 */
export class LiteralSchema<T extends string | number | boolean> extends BaseSchema<T> implements LiteralSchemaInterface<T> {
  protected value: T;

  constructor(value: T) {
    super('literal');
    this.value = value;
  }

  /**
   * Type-specific validation for literal values
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<T> {
    if (data !== this.value) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: `Expected literal value "${this.value}"`,
          code: 'literal.base',
          value: data
        }]
      };
    }

    return { success: true, data: data as T };
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.value = this.value;
    return cloned;
  }
}
