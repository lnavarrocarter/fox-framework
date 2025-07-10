/**
 * @fileoverview Never validation schema implementation
 * @module tsfox/core/features/validation/validators/never.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ValidationResult } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Never validator implementation - never accepts any value
 */
export class NeverValidator extends BaseSchema<never> {
  constructor() {
    super('never');
  }

  /**
   * Type-specific validation for never type - always fails
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<never> {
    return {
      success: false,
      errors: [{
        path: [...context.path],
        message: 'Value is not allowed (never type)',
        code: 'never.base',
        value: data
      }]
    };
  }
}
