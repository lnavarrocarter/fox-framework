/**
 * @fileoverview Schema builder for creating validation schemas
 * @module tsfox/core/features/validation/schema/schema.builder
 */

import { SchemaInterface } from '../interfaces/validation.interface';
import {
  StringSchemaInterface,
  NumberSchemaInterface,
  ObjectSchemaInterface,
  ArraySchemaInterface,
  BooleanSchemaInterface,
  DateSchemaInterface,
  LiteralSchemaInterface
} from '../interfaces/schema.interface';
import { StringSchema } from '../validators/string.validator';
import { NumberSchema } from '../validators/number.validator';
import { ObjectSchema } from '../validators/object.validator';
import { ArraySchema } from '../validators/array.validator';
import { BooleanSchema } from '../validators/boolean.validator';
import { NullSchema } from '../validators/null.validator';
import { DateSchema } from '../validators/date.validator';
import { LiteralSchema } from '../validators/literal.validator';
import { UnionSchema } from '../validators/union.validator';
import { EnumSchema } from '../validators/enum.validator';
import { AnyValidator } from '../validators/any.validator';
import { NeverValidator } from '../validators/never.validator';

/**
 * Main schema builder class providing fluent API for creating schemas
 */
export class SchemaBuilder {
  /**
   * Create a string schema
   */
  static string(): StringSchemaInterface {
    return new StringSchema();
  }

  /**
   * Create a number schema
   */
  static number(): NumberSchemaInterface {
    return new NumberSchema();
  }

  /**
   * Create an object schema
   */
  static object<T extends Record<string, any> = Record<string, any>>(
    shape?: { [K in keyof T]: SchemaInterface<T[K]> }
  ): ObjectSchemaInterface<T> {
    return new ObjectSchema<T>(shape);
  }

  /**
   * Create an array schema
   */
  static array<T = any>(item?: SchemaInterface<T>): ArraySchemaInterface<T[]> {
    return new ArraySchema<T>(item);
  }

  /**
   * Create a boolean schema
   */
  static boolean(): BooleanSchemaInterface {
    return new BooleanSchema();
  }

  /**
   * Create a date schema
   */
  static date(): DateSchemaInterface {
    return new DateSchema();
  }

  /**
   * Create a literal value schema
   */
  static literal<T extends string | number | boolean>(value: T): LiteralSchemaInterface<T> {
    return new LiteralSchema(value);
  }

  /**
   * Create a union schema (one of multiple types)
   */
  static union<T extends readonly SchemaInterface<any>[]>(
    ...schemas: T
  ): SchemaInterface<T[number] extends SchemaInterface<infer U> ? U : never> {
    return new UnionSchema([...schemas]) as any;
  }

  /**
   * Create an enum schema
   */
  static enum<T extends readonly (string | number)[]>(
    values: T
  ): SchemaInterface<T[number]> {
    return new EnumSchema([...values]) as any;
  }

  /**
   * Create a nullable schema (allows null)
   */
  static nullable<T>(schema: SchemaInterface<T>): SchemaInterface<T | null> {
    return SchemaBuilder.union(schema, SchemaBuilder.null());
  }

  /**
   * Create an optional schema (allows undefined)
   */
  static optional<T>(schema: SchemaInterface<T>): SchemaInterface<T | undefined> {
    return schema.optional();
  }

  /**
   * Create a null schema
   */
  static null(): SchemaInterface<null> {
    return new NullSchema();
  }

  /**
   * Create an undefined schema
   */
  static undefined(): SchemaInterface<undefined> {
    return SchemaBuilder.any().custom({
      name: 'undefined',
      validate: (value: any) => {
        if (value === undefined) {
          return { success: true, data: undefined };
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: 'Expected undefined',
            code: 'any.undefined',
            value
          }]
        };
      }
    });
  }

  /**
   * Create a void schema (only allows undefined)
   */
  static void(): SchemaInterface<void> {
    return SchemaBuilder.undefined() as SchemaInterface<void>;
  }

  /**
   * Create an any schema (allows any value)
   */
  static any(): SchemaInterface<any> {
    return new AnyValidator();
  }

  /**
   * Create an unknown schema
   */
  static unknown(): SchemaInterface<unknown> {
    return SchemaBuilder.any() as SchemaInterface<unknown>;
  }

  /**
   * Create a never schema (never allows any value)
   */
  static never(): SchemaInterface<never> {
    return new NeverValidator();
  }

  /**
   * Create a tuple schema
   */
  static tuple<T extends readonly SchemaInterface<any>[]>(
    schemas: [...T]
  ): SchemaInterface<{ [K in keyof T]: T[K] extends SchemaInterface<infer U> ? U : never }> {
    return SchemaBuilder.array().custom({
      name: 'tuple',
      validate: (value: any) => {
        if (!Array.isArray(value)) {
          return {
            success: false,
            errors: [{
              path: [],
              message: 'Expected array for tuple',
              code: 'array.base',
              value
            }]
          };
        }

        if (value.length !== schemas.length) {
          return {
            success: false,
            errors: [{
              path: [],
              message: `Expected tuple of length ${schemas.length}, got ${value.length}`,
              code: 'array.length',
              value
            }]
          };
        }

        const result: any[] = [];
        const errors: any[] = [];

        for (let i = 0; i < schemas.length; i++) {
          const itemResult = schemas[i].validate(value[i]);
          if (itemResult.success) {
            result[i] = itemResult.data;
          } else if (itemResult.errors) {
            errors.push(...itemResult.errors.map(err => ({
              ...err,
              path: [i.toString(), ...err.path]
            })));
          }
        }

        if (errors.length > 0) {
          return { success: false, errors };
        }

        return { success: true, data: result };
      }
    }) as SchemaInterface<{ [K in keyof T]: T[K] extends SchemaInterface<infer U> ? U : never }>;
  }

  /**
   * Create a record schema (object with dynamic keys)
   */
  static record<K extends string | number | symbol, V>(
    valueSchema: SchemaInterface<V>
  ): SchemaInterface<Record<K, V>> {
    return SchemaBuilder.object().custom({
      name: 'record',
      validate: (value: any) => {
        if (typeof value !== 'object' || value === null) {
          return {
            success: false,
            errors: [{
              path: [],
              message: 'Expected object for record',
              code: 'object.base',
              value
            }]
          };
        }

        const result: Record<string, any> = {};
        const errors: any[] = [];

        for (const [key, val] of Object.entries(value)) {
          const itemResult = valueSchema.validate(val);
          if (itemResult.success) {
            result[key] = itemResult.data;
          } else if (itemResult.errors) {
            errors.push(...itemResult.errors.map(err => ({
              ...err,
              path: [key, ...err.path]
            })));
          }
        }

        if (errors.length > 0) {
          return { success: false, errors };
        }

        return { success: true, data: result };
      }
    }) as SchemaInterface<Record<K, V>>;
  }

  /**
   * Create an instanceof schema
   */
  static instanceof<T>(constructor: new (...args: any[]) => T): SchemaInterface<T> {
    return SchemaBuilder.any().custom({
      name: 'instanceof',
      validate: (value: any) => {
        if (value instanceof constructor) {
          return { success: true, data: value };
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: `Expected instance of ${constructor.name}`,
            code: 'any.instanceof',
            value
          }]
        };
      }
    });
  }

  /**
   * Create a function schema
   */
  static function(): SchemaInterface<Function> {
    return SchemaBuilder.any().custom({
      name: 'function',
      validate: (value: any) => {
        if (typeof value === 'function') {
          return { success: true, data: value };
        }
        return {
          success: false,
          errors: [{
            path: [],
            message: 'Expected function',
            code: 'function.base',
            value
          }]
        };
      }
    });
  }
}

/**
 * Simple any schema implementation
 */
class AnySchema implements SchemaInterface<any> {
  validate(data: unknown) {
    return { success: true, data };
  }

  sanitize(data: unknown) {
    return data;
  }

  describe() {
    return {
      type: 'any',
      required: false
    };
  }

  optional() {
    return this;
  }

  required() {
    return this;
  }

  default(value: any) {
    return this;
  }

  custom(rule: any) {
    // Simple implementation for any schema
    const originalValidate = this.validate.bind(this);
    this.validate = (data: unknown) => {
      const baseResult = originalValidate(data);
      if (!baseResult.success) return baseResult;
      
      return rule.validate(data);
    };
    return this;
  }
}

// Export the builder as default
export default SchemaBuilder;
