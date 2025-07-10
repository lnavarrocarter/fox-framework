/**
 * @fileoverview Array validation schema implementation
 * @module tsfox/core/features/validation/validators/array.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ArraySchemaInterface, ArrayConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError, SchemaInterface } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Array schema implementation
 */
export class ArraySchema<T = any> extends BaseSchema<T[]> implements ArraySchemaInterface<T[]> {
  protected constraints: ArrayConstraints;
  protected itemSchema?: SchemaInterface<T>;

  constructor(itemSchema?: SchemaInterface<T>) {
    super('array');
    this.constraints = {};
    this.itemSchema = itemSchema;
  }

  /**
   * Type-specific validation for arrays
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<T[]> {
    if (!Array.isArray(data)) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected array',
          code: 'array.base',
          value: data
        }]
      };
    }

    const errors: ValidationError[] = [];
    const result: T[] = [];

    // Length validations
    if (this.constraints.length !== undefined && data.length !== this.constraints.length) {
      errors.push({
        path: [...context.path],
        message: `Array must have exactly ${this.constraints.length} items`,
        code: 'array.length',
        value: data
      });
    }

    if (this.constraints.min !== undefined && data.length < this.constraints.min) {
      errors.push({
        path: [...context.path],
        message: `Array must have at least ${this.constraints.min} items`,
        code: 'array.min',
        value: data
      });
    }

    if (this.constraints.max !== undefined && data.length > this.constraints.max) {
      errors.push({
        path: [...context.path],
        message: `Array must have at most ${this.constraints.max} items`,
        code: 'array.max',
        value: data
      });
    }

    // Validate each item if schema is provided
    if (this.itemSchema) {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        const itemContext: ValidationContext = {
          ...context,
          path: [...context.path, i.toString()],
          parent: data,
          key: i.toString()
        };

        const itemResult = this.itemSchema.validate(item);
        
        if (itemResult.success) {
          result[i] = itemResult.data!;
        } else if (itemResult.errors) {
          const mappedErrors = itemResult.errors.map(error => ({
            ...error,
            path: [...context.path, i.toString(), ...error.path]
          }));
          
          if (context.config.abortEarly) {
            return { success: false, errors: mappedErrors };
          }
          
          errors.push(...mappedErrors);
        }
      }
    } else {
      // No item schema, copy items as-is
      result.push(...data);
    }

    // Uniqueness validation
    if (this.constraints.unique) {
      const seen = new Set();
      const duplicates: number[] = [];
      
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const key = typeof item === 'object' ? JSON.stringify(item) : item;
        
        if (seen.has(key)) {
          duplicates.push(i);
        } else {
          seen.add(key);
        }
      }
      
      if (duplicates.length > 0) {
        errors.push({
          path: [...context.path],
          message: 'Array must contain unique items',
          code: 'array.unique',
          value: data
        });
      }
    }

    // Sparse validation (no undefined/null items)
    if (!this.constraints.sparse) {
      const sparseIndices: number[] = [];
      for (let i = 0; i < result.length; i++) {
        if (result[i] === undefined || result[i] === null) {
          sparseIndices.push(i);
        }
      }
      
      if (sparseIndices.length > 0) {
        errors.push({
          path: [...context.path],
          message: 'Array cannot contain sparse items (undefined/null)',
          code: 'array.sparse',
          value: data
        });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: result };
  }

  // Fluent API methods
  items<U>(schema: SchemaInterface<U>): ArraySchemaInterface<U[]> {
    const clone = new ArraySchema<U>(schema);
    clone.constraints = { ...this.constraints };
    return clone;
  }

  length(limit: number): this {
    const clone = this.clone();
    clone.constraints.length = limit;
    return clone;
  }

  min(limit: number): this {
    const clone = this.clone();
    clone.constraints.min = limit;
    return clone;
  }

  max(limit: number): this {
    const clone = this.clone();
    clone.constraints.max = limit;
    return clone;
  }

  unique(compareFn?: (a: any, b: any) => boolean): this {
    const clone = this.clone();
    clone.constraints.unique = true;
    // TODO: Support custom comparison function
    return clone;
  }

  sparse(enable: boolean = true): this {
    const clone = this.clone();
    clone.constraints.sparse = enable;
    return clone;
  }

  single(enable: boolean = true): this {
    const clone = this.clone();
    clone.constraints.single = enable;
    return clone;
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    cloned.itemSchema = this.itemSchema;
    return cloned;
  }
}
