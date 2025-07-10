/**
 * @fileoverview Any validation schema implementation
 * @module tsfox/core/features/validation/validators/any.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ValidationResult } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Any validator implementation - accepts any value
 */
export class AnyValidator extends BaseSchema<any> {
  constructor() {
    super('any');
  }

  /**
   * Type-specific validation for any type - always passes
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<any> {
    return { success: true, data };
  }

  /**
   * Add custom validation function
   */
  custom(options: {
    name: string;
    validate: (value: any) => ValidationResult<any>;
  }): AnyValidator {
    const clone = this.clone();
    // Add custom validation to the validation chain
    const originalValidateType = clone.validateType.bind(clone);
    clone.validateType = (data: unknown, context: ValidationContext) => {
      const baseResult = originalValidateType(data, context);
      if (!baseResult.success) {
        return baseResult;
      }
      return options.validate(data);
    };
    return clone;
  }
}
