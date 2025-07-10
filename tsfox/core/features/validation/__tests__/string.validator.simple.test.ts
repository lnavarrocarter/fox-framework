/**
 * @fileoverview Tests for string validation
 */

import { StringSchema } from '../validators/string.validator';
import { ValidationErrors } from '../errors/validation.errors';

describe('StringSchema', () => {
  let validator: StringSchema;

  beforeEach(() => {
    validator = new StringSchema();
  });

  describe('basic validation', () => {
    it('should validate valid strings', () => {
      const result = validator.validate('hello world');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
    });

    it('should reject non-string values when conversion is disabled', () => {
      const result = validator.validate(123, { convert: false });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe('type_mismatch');
    });

    it('should convert non-string values when conversion is enabled', () => {
      const result = validator.validate(123, { convert: true });
      expect(result.success).toBe(true);
      expect(result.data).toBe('123');
    });

    it('should reject null values when required', () => {
      const requiredValidator = validator.required();
      const result = requiredValidator.validate(null);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject undefined values when required', () => {
      const requiredValidator = validator.required();
      const result = requiredValidator.validate(undefined);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('length constraints', () => {
    it('should validate minimum length', () => {
      const minValidator = validator.min(5);
      
      expect(minValidator.validate('hello').success).toBe(true);
      expect(minValidator.validate('hi').success).toBe(false);
    });

    it('should validate maximum length', () => {
      const maxValidator = validator.max(10);
      
      expect(maxValidator.validate('hello').success).toBe(true);
      expect(maxValidator.validate('this is too long').success).toBe(false);
    });

    it('should validate exact length', () => {
      const lengthValidator = validator.length(5);
      
      expect(lengthValidator.validate('hello').success).toBe(true);
      expect(lengthValidator.validate('hi').success).toBe(false);
      expect(lengthValidator.validate('too long').success).toBe(false);
    });
  });

  describe('format validation', () => {
    it('should validate email format', () => {
      const emailValidator = validator.email();
      
      expect(emailValidator.validate('user@example.com').success).toBe(true);
      expect(emailValidator.validate('invalid-email').success).toBe(false);
    });

    it('should validate URL format', () => {
      const urlValidator = validator.url();
      
      expect(urlValidator.validate('https://example.com').success).toBe(true);
      expect(urlValidator.validate('invalid-url').success).toBe(false);
    });

    it('should validate UUID format', () => {
      const uuidValidator = validator.uuid();
      
      expect(uuidValidator.validate('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(uuidValidator.validate('invalid-uuid').success).toBe(false);
    });
  });

  describe('pattern validation', () => {
    it('should validate custom patterns', () => {
      const phoneValidator = validator.pattern(/^\+?[\d\s-()]+$/);
      
      expect(phoneValidator.validate('+1 (555) 123-4567').success).toBe(true);
      expect(phoneValidator.validate('invalid phone').success).toBe(false);
    });
  });

  describe('string transformations', () => {
    it('should trim whitespace', () => {
      const trimValidator = validator.trim();
      
      const result = trimValidator.validate('  hello  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should convert to lowercase', () => {
      const lowerValidator = validator.lowercase();
      
      const result = lowerValidator.validate('HELLO');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should convert to uppercase', () => {
      const upperValidator = validator.uppercase();
      
      const result = upperValidator.validate('hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
    });
  });

  describe('enum validation', () => {
    it('should validate oneOf constraint', () => {
      const enumValidator = validator.oneOf(['red', 'green', 'blue']);
      
      expect(enumValidator.validate('red').success).toBe(true);
      expect(enumValidator.validate('yellow').success).toBe(false);
    });

    it('should validate notOneOf constraint', () => {
      const notEnumValidator = validator.notOneOf(['banned', 'forbidden']);
      
      expect(notEnumValidator.validate('allowed').success).toBe(true);
      expect(notEnumValidator.validate('banned').success).toBe(false);
    });
  });

  describe('alphanumeric validation', () => {
    it('should validate alphanumeric strings', () => {
      const alphanumValidator = validator.alphanum();
      
      expect(alphanumValidator.validate('abc123').success).toBe(true);
      expect(alphanumValidator.validate('abc-123').success).toBe(false);
    });
  });

  describe('chaining constraints', () => {
    it('should combine multiple constraints', () => {
      const combinedValidator = validator
        .min(3)
        .max(10)
        .trim()
        .lowercase();
      
      const result = combinedValidator.validate('  HELLO  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });
  });

  describe('optional and required', () => {
    it('should handle optional values', () => {
      const optionalValidator = validator.optional();
      
      expect(optionalValidator.validate(undefined).success).toBe(true);
      expect(optionalValidator.validate('hello').success).toBe(true);
    });

    it('should handle required values', () => {
      const requiredValidator = validator.required();
      
      expect(requiredValidator.validate('hello').success).toBe(true);
      expect(requiredValidator.validate(undefined).success).toBe(false);
    });
  });

  describe('default values', () => {
    it('should provide default values', () => {
      const defaultValidator = validator.default('default');
      
      const result = defaultValidator.validate(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe('default');
    });
  });
});
