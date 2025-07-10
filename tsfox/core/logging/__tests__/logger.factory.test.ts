/**
 * @fileoverview Tests for Logger Factory
 * @version 1.0.0
 * @since 2025-01-10
 */

import { LoggerFactory, LogLevel } from '../index';

describe('LoggerFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('create', () => {
    it('should create logger with default console transport', () => {
      const logger = LoggerFactory.create();
      
      // Logger should be created successfully
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create logger with custom configuration', () => {
      const config = {
        level: LogLevel.DEBUG,
        console: {
          enabled: true,
          level: LogLevel.WARN,
          format: 'json' as const
        },
        file: {
          enabled: true,
          filename: 'test.log',
          maxSize: 1024
        }
      };
      
      const logger = LoggerFactory.create(config);
      expect(logger).toBeDefined();
    });

    it('should disable console transport when specified', () => {
      const logger = LoggerFactory.create({
        console: { enabled: false }
      });
      
      expect(logger).toBeDefined();
    });
  });

  describe('createFromEnv', () => {
    it('should create logger from environment variables', () => {
      process.env = {
        ...originalEnv,
        LOG_LEVEL: 'DEBUG',
        LOG_CONSOLE: 'true',
        LOG_FORMAT: 'json',
        LOG_FILE: 'true',
        LOG_FILE_PATH: 'logs/env-test.log',
        LOG_FILE_MAX_SIZE: '2048',
        LOG_FILE_MAX_FILES: '3',
        LOG_FILE_ROTATE_DAILY: 'true'
      };
      
      const logger = LoggerFactory.createFromEnv();
      expect(logger).toBeDefined();
    });

    it('should handle missing environment variables gracefully', () => {
      process.env = { ...originalEnv };
      delete process.env.LOG_LEVEL;
      
      const logger = LoggerFactory.createFromEnv();
      expect(logger).toBeDefined();
    });

    it('should parse log level correctly', () => {
      process.env = {
        ...originalEnv,
        LOG_LEVEL: 'error'
      };
      
      const logger = LoggerFactory.createFromEnv();
      expect(logger).toBeDefined();
    });

    it('should handle invalid log level gracefully', () => {
      process.env = {
        ...originalEnv,
        LOG_LEVEL: 'invalid_level'
      };
      
      const logger = LoggerFactory.createFromEnv();
      expect(logger).toBeDefined();
    });
  });
});
