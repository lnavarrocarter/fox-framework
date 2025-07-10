/**
 * @fileoverview Tests for async error handling utilities
 * @module tsfox/core/errors/__tests__/async-handler.test
 */

import { Request, Response, NextFunction } from 'express';
import { 
  asyncHandler, 
  asyncMiddleware, 
  AsyncRequestHandler,
  safeAsync,
  safeAsyncWithCallback,
  withTimeout,
  retryAsync,
  RetryOptions,
  setupGlobalAsyncErrorHandlers,
  sleep,
  batchAsync
} from '../async-handler';
import { SystemError } from '../base.error';

// Mock Express objects
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
} as unknown as Response;
const mockNext = jest.fn() as NextFunction;

describe('AsyncHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const handler: AsyncRequestHandler = async (req, res) => {
        res.json({ success: true });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Test async error');
      const handler: AsyncRequestHandler = async () => {
        throw error;
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle SystemError instances', async () => {
      const error = new SystemError('Custom error', { test: 'data' });
      const handler: AsyncRequestHandler = async () => {
        throw error;
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle promise rejections', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Promise rejected'));

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('asyncMiddleware', () => {
    it('should handle successful middleware operations', async () => {
      const middleware: AsyncRequestHandler = async (req, res, next) => {
        next();
      };

      const wrappedMiddleware = asyncMiddleware(middleware);
      await wrappedMiddleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should catch middleware errors', async () => {
      const error = new Error('Middleware error');
      const middleware: AsyncRequestHandler = async () => {
        throw error;
      };

      const wrappedMiddleware = asyncMiddleware(middleware);
      await wrappedMiddleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle middleware that calls next with error', async () => {
      const testError = new Error('Test error');
      const middleware: AsyncRequestHandler = async (req, res, next) => {
        next(testError);
      };

      const wrappedMiddleware = asyncMiddleware(middleware);
      await wrappedMiddleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe('safeAsync', () => {
    it('should return result for successful operations', async () => {
      const operation = async () => 'success';
      const result = await safeAsync(operation);
      
      expect(result).toBe('success');
    });

    it('should return undefined for failed operations without fallback', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };
      
      const result = await safeAsync(operation);
      expect(result).toBeUndefined();
    });

    it('should return fallback for failed operations', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };
      
      const result = await safeAsync(operation, 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('safeAsyncWithCallback', () => {
    it('should call error callback on failure', async () => {
      const errorCallback = jest.fn();
      const operation = async () => {
        throw new Error('Test error');
      };

      const result = await safeAsyncWithCallback(operation, errorCallback, 'fallback');

      expect(errorCallback).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toBe('fallback');
    });

    it('should return result on success', async () => {
      const errorCallback = jest.fn();
      const operation = async () => 'success';

      const result = await safeAsyncWithCallback(operation, errorCallback);

      expect(errorCallback).not.toHaveBeenCalled();
      expect(result).toBe('success');
    });
  });

  describe('withTimeout', () => {
    it('should resolve when operation completes within timeout', async () => {
      const operation = async () => {
        await sleep(10);
        return 'completed';
      };

      const result = await withTimeout(operation, 100);
      expect(result).toBe('completed');
    });

    it('should reject when operation exceeds timeout', async () => {
      const operation = async () => {
        await sleep(200);
        return 'completed';
      };

      await expect(withTimeout(operation, 50)).rejects.toThrow('Operation timed out');
    });

    it('should use custom timeout message', async () => {
      const operation = async () => {
        await sleep(200);
        return 'completed';
      };

      await expect(withTimeout(operation, 50, 'Custom timeout')).rejects.toThrow('Custom timeout');
    });
  });

  describe('retryAsync', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const options: RetryOptions = { maxAttempts: 3, delay: 10 };

      const result = await retryAsync(operation, options);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const options: RetryOptions = { maxAttempts: 3, delay: 10 };

      const result = await retryAsync(operation, options);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      const options: RetryOptions = { maxAttempts: 2, delay: 10 };

      await expect(retryAsync(operation, options)).rejects.toThrow('Operation failed after 2 attempts');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Non-retryable error'));
      const options: RetryOptions = {
        maxAttempts: 3,
        delay: 10,
        retryCondition: (error) => !error.message.includes('Non-retryable')
      };

      await expect(retryAsync(operation, options)).rejects.toThrow('Non-retryable error');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(45);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('batchAsync', () => {
    it('should process all items', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: number) => item * 2;

      const results = await batchAsync(items, operation, 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      let processedCount = 0;

      const operation = async (item: number) => {
        processedCount++;
        await sleep(10);
        return item * 2;
      };

      const results = await batchAsync(items, operation, 3);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processedCount).toBe(5);
    });
  });

  describe('Error context preservation', () => {
    it('should preserve error stack traces', async () => {
      const originalError = new Error('Original error');
      const handler: AsyncRequestHandler = async () => {
        throw originalError;
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(originalError);
      expect(originalError.stack).toBeDefined();
    });

    it('should handle non-Error objects', async () => {
      const nonError = 'String error';
      const handler: AsyncRequestHandler = async () => {
        throw nonError;
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(nonError);
    });
  });

  describe('Performance considerations', () => {
    it('should not add significant overhead to successful operations', async () => {
      const handler: AsyncRequestHandler = async (req, res) => {
        res.json({ data: 'success' });
      };

      const wrappedHandler = asyncHandler(handler);
      
      const start = Date.now();
      await wrappedHandler(mockRequest, mockResponse, mockNext);
      const end = Date.now();

      expect(end - start).toBeLessThan(50); // Should be very fast
      expect(mockResponse.json).toHaveBeenCalledWith({ data: 'success' });
    });
  });

  describe('Complex async scenarios', () => {
    it('should handle nested async operations', async () => {
      const handler: AsyncRequestHandler = async (req, res) => {
        await sleep(1);
        await Promise.resolve();
        res.json({ nested: true });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ nested: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle concurrent async operations', async () => {
      const handler: AsyncRequestHandler = async (req, res) => {
        const promises = [
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3)
        ];
        const results = await Promise.all(promises);
        res.json({ results });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ results: [1, 2, 3] });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
