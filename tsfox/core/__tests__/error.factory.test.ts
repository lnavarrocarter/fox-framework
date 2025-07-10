/**
 * Tests for Error Factory
 * Testing error handlers and HttpError functionality
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, HttpError } from '../error.factory';

describe('Error Factory', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockRequest = {};
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    };
    mockNext = jest.fn();
    
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HttpError', () => {
    it('should create HttpError with status and message', () => {
      const error = new HttpError(404, 'Resource not found');
      
      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('HttpError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should inherit from Error properly', () => {
      const error = new HttpError(500, 'Server error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('should handle HttpError with proper status and message', () => {
      const httpError = new HttpError(400, 'Bad request');
      
      errorHandler(
        httpError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Bad request' });
    });

    it('should handle regular Error as 500 Internal Server Error', () => {
      const regularError = new Error('Something went wrong');
      
      errorHandler(
        regularError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      expect(console.error).toHaveBeenCalledWith('Internal Server Error:', regularError);
    });

    it('should handle HttpError with different status codes', () => {
      const notFoundError = new HttpError(404, 'User not found');
      
      errorHandler(
        notFoundError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle HttpError with 422 validation error', () => {
      const validationError = new HttpError(422, 'Validation failed');
      
      errorHandler(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(422);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Validation failed' });
    });

    it('should handle null/undefined errors gracefully', () => {
      errorHandler(
        null as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});
