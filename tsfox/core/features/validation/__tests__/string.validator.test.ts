import { StringSchema } from '../validators/string.validator';
import { ValidationError, ValidationErrors } from '../errors/validation.errors';

describe('StringSchema', () => {
  let validator: StringSchema;

  beforeEach(() => {
    validator = new StringSchema();
  });

  describe('basic validation', () => {
    it('should validate valid string', () => {
      const result = validator.validate('hello world');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
      expect(result.errors).toBeUndefined();
    });

    it('should reject non-string values', () => {
      const result = validator.validate(123, { convert: false });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe(ValidationErrors.TYPE_MISMATCH);
    });

    it('should reject null when not optional', () => {
      const result = validator.validate(null);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe(ValidationErrors.REQUIRED);
    });

    it('should accept null when optional', () => {
      const optionalValidator = validator.optional();
      const result = optionalValidator.validate(null);
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should accept undefined when optional', () => {
      const optionalValidator = validator.optional();
      const result = optionalValidator.validate(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe(undefined);
    });
  });

  describe('length constraints', () => {
    it('should validate min length', () => {
      const minValidator = validator.min(5);
      
      expect(minValidator.validate('hello').success).toBe(true);
      expect(minValidator.validate('hello world').success).toBe(true);
      
      const result = minValidator.validate('hi');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.MIN_LENGTH);
    });

    it('should validate max length', () => {
      const maxValidator = validator.max(10);
      
      expect(maxValidator.validate('hello').success).toBe(true);
      expect(maxValidator.validate('hello worl').success).toBe(true);
      
      const result = maxValidator.validate('hello world!');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.MAX_LENGTH);
    });

    it('should validate exact length', () => {
      const lengthValidator = validator.length(5);
      
      expect(lengthValidator.validate('hello').success).toBe(true);
      
      const shortResult = lengthValidator.validate('hi');
      expect(shortResult.success).toBe(false);
      expect(shortResult.errors![0].code).toBe(ValidationErrors.EXACT_LENGTH);
      
      const longResult = lengthValidator.validate('hello world');
      expect(longResult.success).toBe(false);
      expect(longResult.errors![0].code).toBe(ValidationErrors.EXACT_LENGTH);
    });
  });

  describe('pattern validation', () => {
    it('should validate email pattern', () => {
      const emailValidator = validator.email();
      
      expect(emailValidator.validate('user@example.com').success).toBe(true);
      expect(emailValidator.validate('test.email+tag@domain.co.uk').success).toBe(true);
      
      const result = emailValidator.validate('invalid-email');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.INVALID_EMAIL);
    });

    it('should validate URL pattern', () => {
      const urlValidator = validator.url();
      
      expect(urlValidator.validate('https://example.com').success).toBe(true);
      expect(urlValidator.validate('http://localhost:3000/path').success).toBe(true);
      
      const result = urlValidator.validate('not-a-url');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.INVALID_URL);
    });

    it('should validate custom regex pattern', () => {
      const phoneValidator = validator.regex(/^\+?[\d\s-()]+$/, 'INVALID_PHONE');
      
      expect(phoneValidator.validate('+1-234-567-8900').success).toBe(true);
      expect(phoneValidator.validate('(555) 123-4567').success).toBe(true);
      
      const result = phoneValidator.validate('abc123');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe('INVALID_PHONE');
    });
  });

  describe('content validation', () => {
    it('should validate uuid format', () => {
      const uuidValidator = validator.uuid();
      
      expect(uuidValidator.validate('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(uuidValidator.validate('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
      
      const result = uuidValidator.validate('not-a-uuid');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.INVALID_UUID);
    });

    it('should validate datetime format', () => {
      const datetimeValidator = validator.datetime();
      
      expect(datetimeValidator.validate('2023-01-01T12:00:00Z').success).toBe(true);
      expect(datetimeValidator.validate('2023-12-31T23:59:59.999Z').success).toBe(true);
      
      const result = datetimeValidator.validate('invalid-date');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.INVALID_DATETIME);
    });

    it('should validate cuid format', () => {
      const cuidValidator = validator.cuid();
      
      expect(cuidValidator.validate('cjld2cjxh0000qzrmn831i7rn').success).toBe(true);
      
      const result = cuidValidator.validate('not-a-cuid');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe(ValidationErrors.INVALID_CUID);
    });
  });

  describe('method chaining', () => {
    it('should support multiple constraints', () => {
      const complexValidator = validator
        .min(3)
        .max(20)
        .email()
        .optional();
      
      expect(complexValidator.validate('user@example.com').success).toBe(true);
      expect(complexValidator.validate(null).success).toBe(true);
      
      // Too short
      expect(complexValidator.validate('a@b').success).toBe(false);
      
      // Too long
      const longEmail = 'verylongusername@verylongdomain.com';
      expect(complexValidator.validate(longEmail).success).toBe(false);
      
      // Invalid email
      expect(complexValidator.validate('invalid').success).toBe(false);
    });
  });

  describe('transform functionality', () => {
    it('should apply transform function', () => {
      const upperCaseValidator = validator.transform((value: string) => value.toUpperCase());
      
      const result = upperCaseValidator.validate('hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
    });

    it('should transform before validation', () => {
      const trimmedEmailValidator = validator
        .transform((value: string) => value.trim())
        .email();
      
      const result = trimmedEmailValidator.validate('  user@example.com  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('user@example.com');
    });
  });

  describe('default values', () => {
    it('should apply default value when null/undefined', () => {
      const defaultValidator = validator.default('default value');
      
      expect(defaultValidator.validate(null).data).toBe('default value');
      expect(defaultValidator.validate(undefined).data).toBe('default value');
      expect(defaultValidator.validate('actual value').data).toBe('actual value');
    });
  });

  describe('custom validation', () => {
    it('should support custom validator functions', () => {
      const noSpacesValidator = validator.refine(
        (value: string) => !value.includes(' '),
        'NO_SPACES',
        'Value cannot contain spaces'
      );
      
      expect(noSpacesValidator.validate('hello').success).toBe(true);
      
      const result = noSpacesValidator.validate('hello world');
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe('NO_SPACES');
      expect(result.errors![0].message).toBe('Value cannot contain spaces');
    });
  });

  describe('error handling', () => {
    it('should collect multiple errors', () => {
      const strictValidator = validator
        .min(10)
        .max(5)  // Intentionally conflicting
        .email();
      
      const result = strictValidator.validate('short');
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(1);
    });

    it('should provide detailed error information', () => {
      const minValidator = validator.min(10);
      
      const result = minValidator.validate('short');
      expect(result.errors![0].path).toEqual([]);
      expect(result.errors![0].code).toBe(ValidationErrors.MIN_LENGTH);
      expect(result.errors![0].message).toContain('at least 10 characters');
    });
  });
});
