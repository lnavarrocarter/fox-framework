/**
 * @fileoverview Schema-specific interfaces for validation system
 * @module tsfox/core/features/validation/interfaces/schema.interface
 */

import { SchemaInterface, ValidationError } from './validation.interface';

/**
 * Base constraints that all schemas can have
 */
export interface BaseConstraints {
  required?: boolean;
  nullable?: boolean;
  default?: any;
  label?: string;
  description?: string;
}

/**
 * String-specific validation constraints
 */
export interface StringConstraints extends BaseConstraints {
  min?: number;
  max?: number;
  length?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  alphanum?: boolean;
  oneOf?: string[];
  notOneOf?: string[];
}

/**
 * Number-specific validation constraints
 */
export interface NumberConstraints extends BaseConstraints {
  min?: number;
  max?: number;
  greater?: number;
  less?: number;
  positive?: boolean;
  negative?: boolean;
  integer?: boolean;
  precision?: number;
  multiple?: number;
  port?: boolean;
}

/**
 * Object-specific validation constraints
 */
export interface ObjectConstraints extends BaseConstraints {
  keys?: Record<string, SchemaInterface>;
  unknown?: boolean;
  length?: number;
  min?: number;
  max?: number;
  and?: string[];
  or?: string[];
  xor?: string[];
  with?: Record<string, string[]>;
  without?: Record<string, string[]>;
}

/**
 * Array-specific validation constraints
 */
export interface ArrayConstraints extends BaseConstraints {
  items?: SchemaInterface | SchemaInterface[];
  length?: number;
  min?: number;
  max?: number;
  unique?: boolean;
  sparse?: boolean;
  single?: boolean;
}

/**
 * Boolean-specific validation constraints
 */
export interface BooleanConstraints extends BaseConstraints {
  truthy?: any[];
  falsy?: any[];
}

/**
 * Date-specific validation constraints
 */
export interface DateConstraints extends BaseConstraints {
  min?: Date | string;
  max?: Date | string;
  greater?: Date | string;
  less?: Date | string;
  iso?: boolean;
  timestamp?: 'javascript' | 'unix';
}

/**
 * String schema interface
 */
export interface StringSchemaInterface extends SchemaInterface<string> {
  min(length: number): this;
  max(length: number): this;
  length(length: number): this;
  pattern(regex: RegExp): this;
  email(): this;
  url(): this;
  uuid(): this;
  trim(): this;
  lowercase(): this;
  uppercase(): this;
  alphanum(): this;
  oneOf(values: string[]): this;
  notOneOf(values: string[]): this;
}

/**
 * Number schema interface
 */
export interface NumberSchemaInterface extends SchemaInterface<number> {
  min(value: number): this;
  max(value: number): this;
  greater(value: number): this;
  less(value: number): this;
  positive(): this;
  negative(): this;
  integer(): this;
  precision(digits: number): this;
  multiple(base: number): this;
  port(): this;
}

/**
 * Object schema interface
 */
export interface ObjectSchemaInterface<T extends Record<string, any> = Record<string, any>> 
  extends SchemaInterface<T> {
  keys<U extends Record<string, any>>(schema: { [K in keyof U]: SchemaInterface<U[K]> }): ObjectSchemaInterface<U>;
  unknown(allow?: boolean): this;
  length(limit: number): this;
  min(limit: number): this;
  max(limit: number): this;
  and(...peers: string[]): this;
  or(...peers: string[]): this;
  xor(...peers: string[]): this;
  with(key: string, peers: string[]): this;
  without(key: string, peers: string[]): this;
}

/**
 * Array schema interface
 */
export interface ArraySchemaInterface<T = any[]> extends SchemaInterface<T> {
  items<U>(schema: SchemaInterface<U>): ArraySchemaInterface<U[]>;
  length(limit: number): this;
  min(limit: number): this;
  max(limit: number): this;
  unique(compareFn?: (a: any, b: any) => boolean): this;
  sparse(enable?: boolean): this;
  single(enable?: boolean): this;
}

/**
 * Boolean schema interface
 */
export interface BooleanSchemaInterface extends SchemaInterface<boolean> {
  truthy(...values: any[]): this;
  falsy(...values: any[]): this;
}

/**
 * Date schema interface
 */
export interface DateSchemaInterface extends SchemaInterface<Date> {
  min(date: Date | string): this;
  max(date: Date | string): this;
  greater(date: Date | string): this;
  less(date: Date | string): this;
  iso(): this;
  timestamp(type?: 'javascript' | 'unix'): this;
}

/**
 * Conditional schema interface for dependent validation
 */
export interface ConditionalSchemaInterface<T> {
  when<U>(key: string, options: {
    is?: any;
    then?: SchemaInterface<T>;
    otherwise?: SchemaInterface<T>;
  }): SchemaInterface<T>;
}

/**
 * Alternative schema interface for union types
 */
export interface AlternativeSchemaInterface<T> {
  try(...schemas: SchemaInterface[]): SchemaInterface<T>;
  match(mode: 'one' | 'all'): this;
}

/**
 * Literal schema interface for exact value matching
 */
export interface LiteralSchemaInterface<T extends string | number | boolean> extends SchemaInterface<T> {
  // No additional methods needed - just validates exact match
}
