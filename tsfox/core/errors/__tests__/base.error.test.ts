/**
 * Tests for Enhanced Error Classes
 */

import {
  BaseError,
  HttpError,
  ValidationError,
  SystemError,
  ConfigurationError,
  BusinessError,
  RetryError
} from '../base.error';

describe('Base Error Classes', () => {
  describe('HttpError', () => {
    it('should create HTTP error with correct properties', () => {
      const error = new HttpError(404, 'Not found', 'NOT_FOUND');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('HttpError');
    });

    it('should serialize to JSON correctly', () => {
      const context = { userId: '123', path: '/users' };
      const error = new HttpError(400, 'Bad request', 'BAD_REQUEST', context);
      
      const json = error.toJSON();
      
      expect(json.name).toBe('HttpError');
      expect(json.message).toBe('Bad request');
      expect(json.statusCode).toBe(400);
      expect(json.errorCode).toBe('BAD_REQUEST');
      expect(json.context).toEqual(context);
      expect(json.isOperational).toBe(true);
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should create client-safe error representation', () => {
      const error = new HttpError(500, 'Internal error', 'SERVER_ERROR');
      
      const clientError = error.toClientError();
      
      expect(clientError.message).toBe('Internal error');
      expect(clientError.statusCode).toBe(500);
      expect(clientError.errorCode).toBe('SERVER_ERROR');
      expect(clientError.timestamp).toBeDefined();
      expect(clientError.stack).toBeUndefined();
      expect(clientError.context).toBeUndefined();
    });

    describe('Factory methods', () => {
      it('should create bad request error', () => {
        const error = HttpError.badRequest('Invalid input');
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Invalid input');
        expect(error.errorCode).toBe('BAD_REQUEST');
      });

      it('should create unauthorized error', () => {
        const error = HttpError.unauthorized();
        
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Unauthorized');
        expect(error.errorCode).toBe('UNAUTHORIZED');
      });

      it('should create not found error', () => {
        const error = HttpError.notFound('Resource not found');
        
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Resource not found');
        expect(error.errorCode).toBe('NOT_FOUND');
      });

      it('should create internal server error', () => {
        const error = HttpError.internalServerError('Server failed');
        
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Server failed');
        expect(error.errorCode).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const fields = [
        { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
        { field: 'age', message: 'Must be positive number', value: -5 }
      ];
      
      const error = new ValidationError('Validation failed', fields);
      
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.fields).toEqual(fields);
    });

    it('should include fields in JSON representation', () => {
      const fields = [{ field: 'name', message: 'Required', value: null }];
      const error = new ValidationError('Validation failed', fields);
      
      const json = error.toJSON();
      const clientError = error.toClientError();
      
      expect(json.fields).toEqual(fields);
      expect(clientError.fields).toEqual(fields);
    });
  });

  describe('SystemError', () => {
    it('should create system error with correct properties', () => {
      const error = new SystemError('Database connection failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('SYSTEM_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.message).toBe('Database connection failed');
    });

    it('should include cause error', () => {
      const cause = new Error('Connection timeout');
      const error = new SystemError('System failed', {}, cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error with config key', () => {
      const error = new ConfigurationError('Missing required config', 'DATABASE_URL');
      
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('CONFIGURATION_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.configKey).toBe('DATABASE_URL');
      expect(error.context?.configKey).toBe('DATABASE_URL');
    });
  });

  describe('BusinessError', () => {
    it('should create business error with business code', () => {
      const error = new BusinessError('Insufficient funds', 'INSUFFICIENT_FUNDS');
      
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('BUSINESS_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.businessCode).toBe('INSUFFICIENT_FUNDS');
      expect(error.context?.businessCode).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('RetryError', () => {
    it('should create retry error with attempt count and last error', () => {
      const lastError = new Error('Operation failed');
      const error = new RetryError('Retry exhausted', 3, lastError);
      
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('RETRY_EXHAUSTED');
      expect(error.isOperational).toBe(true);
      expect(error.attempts).toBe(3);
      expect(error.lastError).toBe(lastError);
      expect(error.cause).toBe(lastError);
      expect(error.context?.attempts).toBe(3);
    });
  });

  describe('Error inheritance and stack traces', () => {
    it('should maintain proper stack traces', () => {
      const error = new HttpError(500, 'Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('HttpError');
      expect(error.stack).toContain('Test error');
    });

    it('should have correct prototype chain', () => {
      const error = new HttpError(500, 'Test error');
      
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof BaseError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should have correct constructor name', () => {
      const httpError = new HttpError(500, 'HTTP error');
      const validationError = new ValidationError('Validation error', []);
      const systemError = new SystemError('System error');
      
      expect(httpError.name).toBe('HttpError');
      expect(validationError.name).toBe('ValidationError');
      expect(systemError.name).toBe('SystemError');
    });
  });
});
