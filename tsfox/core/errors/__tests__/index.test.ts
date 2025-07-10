/**
 * Tests for the main errors index module
 * Tests exports, integration, and convenience functions
 */

import * as ErrorsIndex from '../index';

describe('Errors Index Module', () => {
  describe('Error Class Exports', () => {
    it('should export all error classes', () => {
      expect(ErrorsIndex.BaseError).toBeDefined();
      expect(ErrorsIndex.HttpError).toBeDefined();
      expect(ErrorsIndex.ValidationError).toBeDefined();
      expect(ErrorsIndex.SystemError).toBeDefined();
      expect(ErrorsIndex.BusinessError).toBeDefined();
      expect(ErrorsIndex.RetryError).toBeDefined();
      expect(ErrorsIndex.ConfigurationError).toBeDefined();
    });

    it('should create basic error instances', () => {
      const httpError = new ErrorsIndex.HttpError('Test HTTP error', 400);
      const validationError = new ErrorsIndex.ValidationError('Test validation error', []);

      expect(httpError).toBeInstanceOf(ErrorsIndex.HttpError);
      expect(httpError.statusCode).toBe(400);
      expect(validationError).toBeInstanceOf(ErrorsIndex.ValidationError);
    });
  });

  describe('Module Structure', () => {
    it('should export main error handling components', () => {
      expect(ErrorsIndex.ErrorHandlerMiddleware).toBeDefined();
      expect(ErrorsIndex.createErrorHandler).toBeDefined();
      expect(ErrorsIndex.asyncHandler).toBeDefined();
      expect(ErrorsIndex.CircuitBreaker).toBeDefined();
      expect(ErrorsIndex.retry).toBeDefined();
      expect(ErrorsIndex.HealthChecker).toBeDefined();
      expect(ErrorsIndex.setupErrorHandling).toBeDefined();
    });

    it('should have setup function', () => {
      expect(typeof ErrorsIndex.setupErrorHandling).toBe('function');
      
      const errorHandling = ErrorsIndex.setupErrorHandling();
      expect(errorHandling).toHaveProperty('createErrorHandler');
      expect(typeof errorHandling.createErrorHandler).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should provide error classes with proper functionality', () => {
      // Test that error classes are available and functional
      expect(ErrorsIndex.ValidationError).toBeDefined();
      expect(ErrorsIndex.HttpError).toBeDefined();
      expect(ErrorsIndex.SystemError).toBeDefined();
      
      // Test creating a validation error (from new system)
      const validationError = new ErrorsIndex.ValidationError('Invalid input', []);
      expect(validationError.message).toBe('Invalid input');
      expect(validationError.isOperational).toBe(true);
      
      // Test creating http error (legacy but should work)
      const httpError = new ErrorsIndex.HttpError('Not found', 404);
      expect(httpError.statusCode).toBe(404);
      expect(httpError.isOperational).toBe(true);
    });

    it('should provide basic async handler functionality', () => {
      expect(typeof ErrorsIndex.asyncHandler).toBe('function');
    });
  });
});
