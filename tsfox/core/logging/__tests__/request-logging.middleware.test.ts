/**
 * @fileoverview Tests for Request Logging Middleware
 * @version 1.0.0
 * @since 2025-01-10
 */

import { Request, Response, NextFunction } from 'express';
import { RequestLoggingMiddleware, ILogger, LogLevel, LogEntry } from '../index';

describe('RequestLoggingMiddleware', () => {
  let mockLogger: ILogger;
  let loggedEntries: LogEntry[];
  let middleware: RequestLoggingMiddleware;
  let mockReq: Partial<Request & { requestId?: string }>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    loggedEntries = [];
    mockLogger = {
      fatal: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn((message, metadata) => {
        loggedEntries.push({
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          message,
          metadata
        });
      }),
      debug: jest.fn(),
      trace: jest.fn(),
      child: jest.fn().mockReturnValue({
        info: jest.fn((message, metadata) => {
          loggedEntries.push({
            timestamp: new Date().toISOString(),
            level: LogLevel.INFO,
            message,
            metadata
          });
        }),
        warn: jest.fn((message, metadata) => {
          loggedEntries.push({
            timestamp: new Date().toISOString(),
            level: LogLevel.WARN,
            message,
            metadata
          });
        })
      }),
      setLevel: jest.fn(),
      addTransport: jest.fn(),
      removeTransport: jest.fn()
    };

    middleware = new RequestLoggingMiddleware(mockLogger);

    mockReq = {
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        if (header === 'Content-Type') return 'application/json';
        return undefined;
      }),
      headers: {},
      body: {}
    };

    mockRes = {
      statusCode: 200,
      send: jest.fn().mockReturnThis(),
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'Content-Length') return '100';
        return undefined;
      }),
      on: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('Basic Functionality', () => {
    it('should log request start and generate request ID', () => {
      const middlewareFn = middleware.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(mockLogger.child).toHaveBeenCalledWith({
        requestId: mockReq.requestId,
        component: 'http'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log request completion on response finish', () => {
      const middlewareFn = middleware.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockRes.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      expect(loggedEntries.length).toBeGreaterThan(0);
      expect(loggedEntries.some(entry => entry.message === 'Request completed')).toBe(true);
    });

    it('should log error responses with warn level', () => {
      mockRes.statusCode = 404;
      
      const middlewareFn = middleware.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockRes.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      expect(loggedEntries.some(entry => 
        entry.level === LogLevel.WARN && 
        entry.message === 'Request completed with error'
      )).toBe(true);
    });
  });

  describe('Path Skipping', () => {
    it('should skip configured paths', () => {
      const middlewareWithSkip = new RequestLoggingMiddleware(mockLogger, {
        skipPaths: ['/health', '/metrics']
      });

      mockReq.path = '/health';
      
      const middlewareFn = middlewareWithSkip.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      expect(mockLogger.child).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Body Sanitization', () => {
    it('should sanitize sensitive fields in request body', () => {
      const middlewareWithBody = new RequestLoggingMiddleware(mockLogger, {
        includeBody: true
      });

      mockReq.body = {
        username: 'test',
        password: 'secret123',
        token: 'abc123',
        normalField: 'value'
      };

      const middlewareFn = middlewareWithBody.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      // Check that the logged body has sanitized sensitive fields
      const requestStartEntry = loggedEntries.find(entry => 
        entry.message === 'Request started'
      );
      
      if (requestStartEntry?.metadata?.body) {
        expect(requestStartEntry.metadata.body.username).toBe('test');
        expect(requestStartEntry.metadata.body.password).toBe('[REDACTED]');
        expect(requestStartEntry.metadata.body.token).toBe('[REDACTED]');
        expect(requestStartEntry.metadata.body.normalField).toBe('value');
      }
    });

    it('should truncate large request bodies', () => {
      const middlewareWithBody = new RequestLoggingMiddleware(mockLogger, {
        includeBody: true,
        maxBodySize: 50
      });

      mockReq.body = {
        largeField: 'A'.repeat(100)
      };

      const middlewareFn = middlewareWithBody.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      const requestStartEntry = loggedEntries.find(entry => 
        entry.message === 'Request started'
      );
      
      expect(requestStartEntry?.metadata?.body).toContain('[Body too large:');
    });

    it('should only log JSON and form-encoded content types', () => {
      const middlewareWithBody = new RequestLoggingMiddleware(mockLogger, {
        includeBody: true
      });

      // Test with non-JSON content type
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'text/plain';
        return undefined;
      });

      mockReq.body = { test: 'value' };

      const middlewareFn = middlewareWithBody.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      const requestStartEntry = loggedEntries.find(entry => 
        entry.message === 'Request started'
      );
      
      expect(requestStartEntry?.metadata?.body).toBeUndefined();
    });
  });

  describe('Skip Successful Requests', () => {
    it('should skip successful requests when configured', () => {
      const middlewareSkipSuccess = new RequestLoggingMiddleware(mockLogger, {
        skipSuccessful: true
      });

      mockRes.statusCode = 200;
      
      const middlewareFn = middlewareSkipSuccess.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockRes.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      // Should still log request start, but not completion for successful requests
      expect(loggedEntries.some(entry => entry.message === 'Request started')).toBe(true);
      expect(loggedEntries.some(entry => entry.message === 'Request completed')).toBe(false);
    });

    it('should still log error requests when skip successful is enabled', () => {
      const middlewareSkipSuccess = new RequestLoggingMiddleware(mockLogger, {
        skipSuccessful: true
      });

      mockRes.statusCode = 500;
      
      const middlewareFn = middlewareSkipSuccess.middleware();
      middlewareFn(mockReq as Request & { requestId?: string }, mockRes as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockRes.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      expect(loggedEntries.some(entry => 
        entry.message === 'Request completed with error'
      )).toBe(true);
    });
  });
});
