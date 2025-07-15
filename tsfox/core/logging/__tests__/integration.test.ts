/**
 * @fileoverview Integration tests for complete logging system
 * @version 1.0.0
 * @since 2025-01-11
 */

import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { LoggerFactory } from '../logger.factory';
import { Logger } from '../logger';
import { LogLevel } from '../interfaces';
import { ConsoleTransport } from '../transports/console.transport';
import { FileTransport } from '../transports/file.transport';
import { StreamTransport } from '../transports/stream.transport';
import { DefaultFormatter, JsonFormatter } from '../formatters';
import { RequestLoggingMiddleware } from '../request-logging.middleware';

describe('Logging System Integration', () => {
  const testLogFile = './test-logs.log';

  afterEach(() => {
    // Clean up test files
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  describe('LoggerFactory', () => {
    it('should create logger with multiple transports', async () => {
      const logger = LoggerFactory.create({
        level: LogLevel.DEBUG,
        console: {
          enabled: true,
          format: 'json'
        },
        file: {
          enabled: true,
          filename: testLogFile
        }
      });

      expect(logger).toBeInstanceOf(Logger);
      
      // Test logging
      logger.info('Test message', { test: true });
      
      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // File should exist
      expect(existsSync(testLogFile)).toBe(true);
    });

    it('should create logger from environment variables', async () => {
      // Set environment variables
      process.env.LOG_LEVEL = 'DEBUG';
      process.env.LOG_FORMAT = 'json';
      process.env.LOG_FILE = 'true';
      process.env.LOG_FILE_PATH = testLogFile;

      const logger = LoggerFactory.createFromEnv();
      
      logger.debug('Environment logger test');
      
      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(existsSync(testLogFile)).toBe(true);

      // Clean up env vars
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_FORMAT;
      delete process.env.LOG_FILE;
      delete process.env.LOG_FILE_PATH;
    });
  });

  describe('Complete Logging Workflow', () => {
    it('should handle complex logging scenario', async () => {
      const logger = new Logger({ component: 'test' }, LogLevel.DEBUG);
      
      // Add multiple transports
      logger.addTransport(new ConsoleTransport(LogLevel.INFO, new JsonFormatter()));
      logger.addTransport(new FileTransport(LogLevel.DEBUG, { filename: testLogFile }));
      
      // Create child logger with additional context
      const childLogger = logger.child({
        operation: 'user-action',
        requestId: 'req-12345'
      });

      // Log various levels with different data
      childLogger.debug('Debug message', { step: 1 });
      childLogger.info('User logged in', { userId: 123, email: 'test@example.com' });
      childLogger.warn('Suspicious activity detected', { attempts: 3 });
      
      const error = new Error('Database connection failed');
      childLogger.error('Operation failed', { operation: 'save' }, error);

      // Wait for file operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify file contains all logs
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('Debug message');
      expect(logContent).toContain('User logged in');
      expect(logContent).toContain('Suspicious activity detected');
      expect(logContent).toContain('Operation failed');
      expect(logContent).toContain('Database connection failed');
    });

    it('should filter logs by level correctly', () => {
      const logger = new Logger(undefined, LogLevel.WARN);
      
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.addTransport(new ConsoleTransport(LogLevel.WARN));
      
      // These should not be logged (below WARN level)
      logger.debug('Debug message');
      logger.info('Info message');
      
      // These should be logged
      logger.warn('Warning message');
      logger.error('Error message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should handle transport errors gracefully', () => {
      const logger = new Logger();
      
      // Create a failing transport
      const failingTransport = {
        name: 'failing',
        level: LogLevel.INFO,
        log: jest.fn().mockImplementation(() => {
          throw new Error('Transport error');
        })
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.addTransport(failingTransport);
      logger.info('Test message');
      
      expect(failingTransport.log).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Transport error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high volume logging efficiently', () => {
      const logger = new Logger(undefined, LogLevel.INFO);
      logger.addTransport(new ConsoleTransport(LogLevel.ERROR)); // Only log errors to avoid spam
      
      const startTime = Date.now();
      const messageCount = 1000;
      
      for (let i = 0; i < messageCount; i++) {
        logger.info(`Message ${i}`, { iteration: i, batch: Math.floor(i / 100) });
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for 1000 messages
    });

    it('should properly clean up resources', async () => {
      const logger = new Logger();
      const fileTransport = new FileTransport(LogLevel.INFO, { filename: testLogFile });
      
      logger.addTransport(fileTransport);
      logger.info('Test message');
      
      // Wait for the file to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close transport
      await fileTransport.close();
      
      expect(existsSync(testLogFile)).toBe(true);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should support request logging middleware pattern', () => {
      const logger = LoggerFactory.create({
        level: LogLevel.INFO,
        console: { enabled: true, format: 'json' }
      });

      const middleware = new RequestLoggingMiddleware(logger, {
        includeBody: true,
        includeHeaders: true,
        maxBodySize: 500
      });

      const mockReq = {
        method: 'POST',
        url: '/api/users',
        path: '/api/users',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer secret-token',
          'user-agent': 'TestAgent/1.0'
        },
        body: { name: 'John Doe', password: 'secret123' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn((header: string) => {
          return (mockReq.headers as any)[header.toLowerCase()];
        })
      } as any;

      const mockRes = {
        setHeader: jest.fn(),
        on: jest.fn(),
        statusCode: 201,
        statusMessage: 'Created',
        get: jest.fn().mockReturnValue('100')
      } as any;

      const mockNext = jest.fn();

      const middlewareFunction = middleware.middleware();
      middlewareFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    });

    it('should handle application startup logging', async () => {
      const appLogger = LoggerFactory.create({
        level: LogLevel.INFO,
        console: { enabled: true },
        file: { enabled: true, filename: testLogFile }
      });

      // Simulate application startup
      appLogger.info('Application starting', {
        version: '1.0.0',
        environment: 'test',
        nodeVersion: process.version
      });

      const dbLogger = appLogger.child({ component: 'database' });
      dbLogger.info('Database connection established', {
        host: 'localhost',
        database: 'test_db',
        connectionTime: '45ms'
      });

      const serverLogger = appLogger.child({ component: 'server' });
      serverLogger.info('HTTP server listening', {
        port: 3000,
        host: '0.0.0.0'
      });

      appLogger.info('Application ready');

      // Wait for file operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify logs were written
      expect(existsSync(testLogFile)).toBe(true);
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('Application starting');
      expect(logContent).toContain('Database connection established');
      expect(logContent).toContain('HTTP server listening');
      expect(logContent).toContain('Application ready');
    });
  });
});
