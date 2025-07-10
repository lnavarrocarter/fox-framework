/**
 * @fileoverview Tests for validation errors
 */

import { ValidationError, SchemaError, CustomValidatorError, AsyncValidationError } from '../errors/validation.errors';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Test validation failed');
      
      expect(error.message).toBe('Test validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toEqual([]);
      expect(error.statusCode).toBe(400);
    });

    it('should create validation error with validation errors', () => {
      const validationErrors = [
        {
          path: ['name'],
          message: 'Name is required',
          code: 'string.required',
          value: undefined
        }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      
      expect(error.message).toBe('Validation failed');
      expect(error.validationErrors).toEqual(validationErrors);
    });
  });

  describe('static factory methods', () => {
    it('should create error from field', () => {
      const error = ValidationError.fromField(['email'], 'Invalid email', 'string.email', 'invalid-email');
      
      expect(error.message).toBe('Validation failed for field: email');
      expect(error.validationErrors).toHaveLength(1);
      expect(error.validationErrors[0].path).toEqual(['email']);
      expect(error.validationErrors[0].message).toBe('Invalid email');
      expect(error.validationErrors[0].code).toBe('string.email');
      expect(error.validationErrors[0].value).toBe('invalid-email');
    });

    it('should create required field error', () => {
      const error = ValidationError.required(['name']);
      
      expect(error.message).toBe('Validation failed for field: name');
      expect(error.validationErrors[0].message).toBe('Field "name" is required');
      expect(error.validationErrors[0].code).toBe('any.required');
    });

    it('should create invalid type error', () => {
      const error = ValidationError.invalidType(['age'], 'number', 'string', 'not-a-number');
      
      expect(error.message).toBe('Validation failed for field: age');
      expect(error.validationErrors[0].message).toBe('Expected number but received string');
      expect(error.validationErrors[0].code).toBe('number.base');
    });
  });

  describe('utility methods', () => {
    it('should get formatted errors', () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'string.required' },
        { path: ['email'], message: 'Invalid email', code: 'string.email' }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      const formatted = error.getFormattedErrors();
      
      expect(formatted).toEqual([
        'name: Name is required',
        'email: Invalid email'
      ]);
    });

    it('should get errors by field', () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'string.required' },
        { path: ['name'], message: 'Name too short', code: 'string.min' },
        { path: ['email'], message: 'Invalid email', code: 'string.email' }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      const errorsByField = error.getErrorsByField();
      
      expect(errorsByField).toEqual({
        'name': ['Name is required', 'Name too short'],
        'email': ['Invalid email']
      });
    });

    it('should check if error exists for field', () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'string.required' }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      
      expect(error.hasErrorForField(['name'])).toBe(true);
      expect(error.hasErrorForField(['email'])).toBe(false);
    });

    it('should get first error for field', () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'string.required' },
        { path: ['name'], message: 'Name too short', code: 'string.min' }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      const firstError = error.getFirstErrorForField(['name']);
      
      expect(firstError?.message).toBe('Name is required');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const validationErrors = [
        { path: ['name'], message: 'Name is required', code: 'string.required' }
      ];
      
      const error = new ValidationError('Validation failed', validationErrors);
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        message: 'Validation failed',
        validationErrors,
        errorsByField: {
          'name': ['Name is required']
        }
      });
    });
  });
});

describe('SchemaError', () => {
  it('should create schema error', () => {
    const error = new SchemaError('Invalid schema definition');
    
    expect(error.message).toBe('Invalid schema definition');
    expect(error.name).toBe('SchemaError');
    expect(error.statusCode).toBe(500);
  });

  it('should create schema error with details', () => {
    const details = { property: 'type', expected: 'string' };
    const error = new SchemaError('Invalid schema', details);
    
    expect(error.details).toEqual(details);
  });

  describe('static factory methods', () => {
    it('should create invalid type error', () => {
      const error = SchemaError.invalidType('unknown');
      expect(error.message).toBe('Invalid schema type: unknown');
    });

    it('should create missing property error', () => {
      const error = SchemaError.missingProperty('type');
      expect(error.message).toBe('Missing required schema property: type');
    });

    it('should create invalid constraint error', () => {
      const error = SchemaError.invalidConstraint('min', -1);
      expect(error.message).toBe('Invalid constraint value for min: -1');
    });
  });
});

describe('CustomValidatorError', () => {
  it('should create custom validator error', () => {
    const error = new CustomValidatorError('emailExists', 'Email already exists', ['email'], 'test@example.com');
    
    expect(error.validatorName).toBe('emailExists');
    expect(error.message).toBe('Custom validator "emailExists" failed: Email already exists');
    expect(error.validationErrors[0].code).toBe('custom.emailExists');
    expect(error.validationErrors[0].path).toEqual(['email']);
  });
});

describe('AsyncValidationError', () => {
  it('should create async validation error', () => {
    const validationErrors = [
      { path: ['email'], message: 'Email validation failed', code: 'async.email' }
    ];
    
    const error = new AsyncValidationError('Async validation failed', validationErrors);
    
    expect(error.message).toBe('Async validation failed');
    expect(error.name).toBe('AsyncValidationError');
    expect(error.validationErrors).toEqual(validationErrors);
  });

  it('should create async validation error with original error', () => {
    const originalError = new Error('Network timeout');
    const error = new AsyncValidationError('Validation failed', [], originalError);
    
    expect(error.details).toEqual({ originalError: 'Network timeout' });
    expect(error.stack).toBe(originalError.stack);
  });
});
