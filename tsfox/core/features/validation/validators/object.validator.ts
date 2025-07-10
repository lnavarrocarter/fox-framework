/**
 * @fileoverview Object validation schema implementation
 * @module tsfox/core/features/validation/validators/object.validator
 */

import { BaseSchema } from '../schema/base.schema';
import { ObjectSchemaInterface, ObjectConstraints } from '../interfaces/schema.interface';
import { ValidationResult, ValidationError, SchemaInterface, SchemaDescription } from '../interfaces/validation.interface';
import { ValidationContext } from '../schema/schema.types';

/**
 * Object schema implementation
 */
export class ObjectSchema<T extends Record<string, any> = Record<string, any>> 
  extends BaseSchema<T> 
  implements ObjectSchemaInterface<T> {
  
  protected constraints: ObjectConstraints;
  protected shape?: { [K in keyof T]: SchemaInterface<T[K]> };

  constructor(shape?: { [K in keyof T]: SchemaInterface<T[K]> }) {
    super('object');
    this.constraints = {};
    this.shape = shape;
  }

  /**
   * Type-specific validation for objects
   */
  protected validateType(data: unknown, context: ValidationContext): ValidationResult<T> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        success: false,
        errors: [{
          path: [...context.path],
          message: 'Expected object',
          code: 'object.base',
          value: data
        }]
      };
    }

    const errors: ValidationError[] = [];
    const result: any = {};
    const inputObj = data as Record<string, any>;

    // Validate object length constraints
    const objectKeys = Object.keys(inputObj);
    
    if (this.constraints.length !== undefined && objectKeys.length !== this.constraints.length) {
      errors.push({
        path: [...context.path],
        message: `Object must have exactly ${this.constraints.length} keys`,
        code: 'object.length',
        value: data
      });
    }

    if (this.constraints.min !== undefined && objectKeys.length < this.constraints.min) {
      errors.push({
        path: [...context.path],
        message: `Object must have at least ${this.constraints.min} keys`,
        code: 'object.min',
        value: data
      });
    }

    if (this.constraints.max !== undefined && objectKeys.length > this.constraints.max) {
      errors.push({
        path: [...context.path],
        message: `Object must have at most ${this.constraints.max} keys`,
        code: 'object.max',
        value: data
      });
    }

    // Validate against shape if provided
    if (this.shape) {
      const shapeKeys = Object.keys(this.shape);
      
      // Validate each field in the shape
      for (const key of shapeKeys) {
        const fieldSchema = this.shape[key as keyof T];
        const fieldValue = inputObj[key];
        
        const fieldContext: ValidationContext = {
          ...context,
          path: [...context.path, key],
          parent: inputObj,
          key
        };

        const fieldResult = fieldSchema.validate(fieldValue);
        
        if (fieldResult.success) {
          result[key] = fieldResult.data;
        } else if (fieldResult.errors) {
          const mappedErrors = fieldResult.errors.map(error => ({
            ...error,
            path: [...context.path, key, ...error.path]
          }));
          
          if (context.config.abortEarly) {
            return { success: false, errors: mappedErrors };
          }
          
          errors.push(...mappedErrors);
        }
      }

      // Handle unknown keys
      const unknownKeys = objectKeys.filter(key => !shapeKeys.includes(key));
      
      if (unknownKeys.length > 0) {
        if (!this.constraints.unknown && !context.config.allowUnknown) {
          errors.push(...unknownKeys.map(key => ({
            path: [...context.path, key],
            message: `Unknown key "${key}" is not allowed`,
            code: 'object.unknown',
            value: inputObj[key]
          })));
        } else if (context.config.stripUnknown) {
          // Unknown keys are ignored (not included in result)
        } else {
          // Include unknown keys in result
          unknownKeys.forEach(key => {
            result[key] = inputObj[key];
          });
        }
      }
    } else {
      // No shape defined, copy all fields
      Object.assign(result, inputObj);
    }

    // Validate conditional constraints
    if (this.constraints.and) {
      const missingPeers = this.constraints.and.filter(peer => !(peer in inputObj));
      if (missingPeers.length > 0) {
        errors.push({
          path: [...context.path],
          message: `Missing required peer keys: ${missingPeers.join(', ')}`,
          code: 'object.and',
          value: data
        });
      }
    }

    if (this.constraints.or) {
      const hasAnyPeer = this.constraints.or.some(peer => peer in inputObj);
      if (!hasAnyPeer) {
        errors.push({
          path: [...context.path],
          message: `At least one of these keys must be present: ${this.constraints.or.join(', ')}`,
          code: 'object.or',
          value: data
        });
      }
    }

    if (this.constraints.xor) {
      const presentPeers = this.constraints.xor.filter(peer => peer in inputObj);
      if (presentPeers.length !== 1) {
        errors.push({
          path: [...context.path],
          message: `Exactly one of these keys must be present: ${this.constraints.xor.join(', ')}`,
          code: 'object.xor',
          value: data
        });
      }
    }

    // Validate with constraints
    if (this.constraints.with) {
      for (const [key, peers] of Object.entries(this.constraints.with)) {
        if (key in inputObj) {
          const missingPeers = peers.filter(peer => !(peer in inputObj));
          if (missingPeers.length > 0) {
            errors.push({
              path: [...context.path],
              message: `Key "${key}" requires these peers: ${missingPeers.join(', ')}`,
              code: 'object.with',
              value: data
            });
          }
        }
      }
    }

    // Validate without constraints
    if (this.constraints.without) {
      for (const [key, peers] of Object.entries(this.constraints.without)) {
        if (key in inputObj) {
          const presentPeers = peers.filter(peer => peer in inputObj);
          if (presentPeers.length > 0) {
            errors.push({
              path: [...context.path],
              message: `Key "${key}" conflicts with these peers: ${presentPeers.join(', ')}`,
              code: 'object.without',
              value: data
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: result };
  }

  /**
   * Get description of child schemas
   */
  protected getChildrenDescription(): Record<string, SchemaDescription> | undefined {
    if (!this.shape) return undefined;
    
    const children: Record<string, SchemaDescription> = {};
    for (const [key, schema] of Object.entries(this.shape)) {
      children[key] = schema.describe();
    }
    return children;
  }

  // Fluent API methods
  keys<U extends Record<string, any>>(schema: { [K in keyof U]: SchemaInterface<U[K]> }): ObjectSchemaInterface<U> {
    const clone = new ObjectSchema<U>(schema);
    clone.constraints = { ...this.constraints };
    return clone;
  }

  unknown(allow: boolean = true): this {
    const clone = this.clone();
    clone.constraints.unknown = allow;
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

  and(...peers: string[]): this {
    const clone = this.clone();
    clone.constraints.and = peers;
    return clone;
  }

  or(...peers: string[]): this {
    const clone = this.clone();
    clone.constraints.or = peers;
    return clone;
  }

  xor(...peers: string[]): this {
    const clone = this.clone();
    clone.constraints.xor = peers;
    return clone;
  }

  with(key: string, peers: string[]): this {
    const clone = this.clone();
    if (!clone.constraints.with) {
      clone.constraints.with = {};
    }
    clone.constraints.with[key] = peers;
    return clone;
  }

  without(key: string, peers: string[]): this {
    const clone = this.clone();
    if (!clone.constraints.without) {
      clone.constraints.without = {};
    }
    clone.constraints.without[key] = peers;
    return clone;
  }

  protected clone(): this {
    const cloned = super.clone();
    cloned.constraints = { ...this.constraints };
    if (this.shape) {
      cloned.shape = { ...this.shape };
    }
    return cloned;
  }
}
