/**
 * @fileoverview Union validation schema implementation
 * @module tsfox/core/features/validation/validators/union.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ValidationResult, ValidationError, SchemaInterface } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Union schema implementation for multiple type validation
 */
export class UnionSchema<T = any> extends BaseSchema<T> {
  protected schemas: SchemaInterface<any>[];

  constructor(schemas: SchemaInterface<any>[]) {
    super('union');
    this.schemas = schemas;
    // Union schemas should not validate required by themselves
    // They delegate to their child schemas
    this.state.isRequired = false;
  }

  /**
   * Type-specific validation for union types
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<T> {
    const errors: ValidationError[] = [];

    // Try each schema until one succeeds
    for (let i = 0; i < this.schemas.length; i++) {
      const schema = this.schemas[i];
      const result = schema.validate(data, context.config);
      
      if (result.success) {
        return { success: true, data: result.data as T };
      }
      
      if (result.errors) {
        errors.push(...result.errors.map(error => ({
          ...error,
          path: [...context.path, `union[${i}]`, ...error.path]
        })));
      }
    }

    // All schemas failed
    return {
      success: false,
      errors: [{
        path: [...context.path],
        message: 'Value does not match any of the union types',
        code: 'union.base',
        value: data
      }, ...errors]
    };
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.schemas = [...this.schemas];
    return cloned;
  }
}
