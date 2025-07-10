/**
 * @fileoverview Base schema implementation
 * @module tsfox/core/features/validation/schema/base.schema
 */

import {
  SchemaInterface,
  ValidationResult,
  ValidationError,
  SchemaDescription,
  ValidatorInterface
} from '../interfaces/validation.interface';
import {
  ValidationContext,
  ValidationConfig,
  SchemaState,
  ValidationRule,
  PreprocessorFunction,
  PostprocessorFunction,
  CompiledSchema,
  ValidationHelpers
} from './schema.types';
import { ValidationError as ValidationErrorClass } from '../errors/validation.errors';

/**
 * Base schema class that all specific schemas extend
 */
export abstract class BaseSchema<T = any> implements SchemaInterface<T> {
  protected state: SchemaState;

  constructor(type: string) {
    this.state = {
      type,
      constraints: {},
      isRequired: true,
      isOptional: false,
      flags: {},
      rules: [],
      preprocessors: [],
      postprocessors: []
    };
  }

  /**
   * Validate data against this schema
   */
  validate(data: unknown, config?: ValidationConfig): ValidationResult<T> {
    const context: ValidationContext = {
      path: [],
      root: data,
      config: {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: false,
        convert: true,
        ...config
      }
    };

    return this.validateInternal(data, context);
  }

  /**
   * Internal validation implementation
   */
  protected validateInternal(data: unknown, context: ValidationContext): ValidationResult<T> {
    const errors: ValidationError[] = [];
    
    try {
      // Check if value is undefined/null and handle required/optional
      if (data === undefined || data === null) {
        if (this.state.isRequired && !this.state.defaultValue) {
          errors.push({
            path: [...context.path],
            message: `Field is required`,
            code: 'required',
            value: data
          });
          return { success: false, errors };
        }
        
        if (this.state.defaultValue !== undefined) {
          data = this.state.defaultValue;
        } else if (!this.state.isRequired) {
          return { success: true, data: data as T };
        }
      }

      // Apply preprocessors
      for (const preprocessor of this.state.preprocessors) {
        data = preprocessor(data, { context } as any);
      }

      // Perform type-specific validation
      const typeValidation = this.validateType(data, context);
      if (!typeValidation.success) {
        return typeValidation;
      }

      let processedData = typeValidation.data!;

      // Apply custom validation rules
      for (const rule of this.state.rules) {
        const ruleResult = rule.validate(processedData, { context } as any);
        if (!ruleResult.success && ruleResult.errors) {
          if (context.config.abortEarly) {
            return ruleResult;
          }
          errors.push(...ruleResult.errors);
        } else if (ruleResult.data !== undefined) {
          processedData = ruleResult.data;
        }
      }

      // Apply postprocessors
      for (const postprocessor of this.state.postprocessors) {
        processedData = postprocessor(processedData, { context } as any);
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      return { success: true, data: processedData };

    } catch (error) {
      errors.push({
        path: [...context.path],
        message: error instanceof Error ? error.message : 'Validation failed',
        code: 'any.unknown',
        value: data
      });
      return { success: false, errors };
    }
  }

  /**
   * Type-specific validation (to be implemented by subclasses)
   */
  protected abstract validateType(data: unknown, context: ValidationContext): ValidationResult<T>;

  /**
   * Sanitize data according to this schema
   */
  sanitize(data: unknown): T {
    const result = this.validate(data, { 
      stripUnknown: true, 
      convert: false,
      abortEarly: false 
    });
    
    if (!result.success) {
      throw new ValidationErrorClass(
        'Data sanitization failed',
        result.errors || []
      );
    }
    
    return result.data!;
  }

  /**
   * Get a description of this schema
   */
  describe(): SchemaDescription {
    return {
      type: this.state.type,
      required: this.state.isRequired,
      constraints: { ...this.state.constraints },
      children: this.getChildrenDescription()
    };
  }

  /**
   * Get description of child schemas (for object/array types)
   */
  protected getChildrenDescription(): Record<string, SchemaDescription> | undefined {
    return undefined;
  }

  /**
   * Make this schema optional
   */
  optional(): SchemaInterface<T | undefined> {
    const clone = this.clone();
    clone.state.isOptional = true;
    clone.state.isRequired = false;
    return clone as SchemaInterface<T | undefined>;
  }

  /**
   * Make this schema required
   */
  required(): SchemaInterface<T> {
    const clone = this.clone();
    clone.state.isRequired = true;
    clone.state.isOptional = false;
    return clone;
  }

  /**
   * Set a default value for this schema
   */
  default(value: T): SchemaInterface<T> {
    const clone = this.clone();
    clone.state.defaultValue = value;
    return clone;
  }

  /**
   * Add a label to this schema
   */
  label(label: string): this {
    this.state.constraints.label = label;
    return this;
  }

  /**
   * Add a description to this schema
   */
  description(description: string): this {
    this.state.constraints.description = description;
    return this;
  }

  /**
   * Add a custom validation rule
   */
  custom(rule: ValidatorInterface<T>): SchemaInterface<T> {
    const validationRule: ValidationRule = {
      name: rule.name,
      validate: (value: any, helpers: ValidationHelpers) => rule.validate(value),
      message: rule.message,
      code: rule.code
    };
    
    const clone = this.clone();
    clone.state.rules.push(validationRule);
    return clone;
  }

  /**
   * Add a preprocessor function
   */
  preprocess(fn: PreprocessorFunction): this {
    this.state.preprocessors.push(fn);
    return this;
  }

  /**
   * Add a postprocessor function
   */
  postprocess(fn: PostprocessorFunction): this {
    this.state.postprocessors.push(fn);
    return this;
  }

  /**
   * Set a flag on this schema
   */
  protected setFlag(key: string, value: any): this {
    this.state.flags[key] = value;
    return this;
  }

  /**
   * Get a flag value
   */
  protected getFlag(key: string): any {
    return this.state.flags[key];
  }

  /**
   * Clone this schema
   */
  protected clone(): this {
    const CloneConstructor = this.constructor as new (...args: any[]) => this;
    const cloned = new CloneConstructor();
    
    cloned.state = {
      ...this.state,
      constraints: { ...this.state.constraints },
      flags: { ...this.state.flags },
      rules: [...this.state.rules],
      preprocessors: [...this.state.preprocessors],
      postprocessors: [...this.state.postprocessors]
    };
    
    return cloned;
  }

  /**
   * Create a conditional schema
   */
  when<U>(key: string, options: {
    is?: any;
    then?: SchemaInterface<T>;
    otherwise?: SchemaInterface<T>;
  }): SchemaInterface<T> {
    // Implementation would create a conditional wrapper
    // For now, return this schema
    return this;
  }

  /**
   * Compile this schema for better performance
   */
  compile(): CompiledSchema<T> {
    const schema = this;
    
    return {
      validate: (value: unknown, context?: ValidationContext) => {
        const ctx = context || {
          path: [],
          root: value,
          config: { abortEarly: false, allowUnknown: false, stripUnknown: false, convert: false }
        };
        return schema.validateInternal(value, ctx);
      },
      describe: () => schema.describe(),
      serialize: () => JSON.stringify(schema.describe()),
      source: schema
    };
  }

  /**
   * Check if value passes validation
   */
  isValid(value: unknown): boolean {
    return this.validate(value).success;
  }

  /**
   * Extract value from validation result or throw
   */
  parse(value: unknown): T {
    const result = this.validate(value);
    if (!result.success) {
      throw new ValidationErrorClass(
        'Validation failed',
        result.errors || []
      );
    }
    return result.data!;
  }

  /**
   * Safe parse that returns result object
   */
  safeParse(value: unknown): ValidationResult<T> {
    return this.validate(value);
  }
}
