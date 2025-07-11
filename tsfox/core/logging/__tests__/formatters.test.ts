/**
 * @fileoverview Tests for Formatters
 * @version 1.0.0
 * @since 2025-01-11
 */

import { DefaultFormatter, JsonFormatter } from '../formatters';
import { LogLevel, LogEntry } from '../interfaces';

describe('Formatters', () => {
  describe('DefaultFormatter', () => {
    let formatter: DefaultFormatter;

    beforeEach(() => {
      formatter = new DefaultFormatter();
    });

    it('should format basic log entry', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message'
      };

      const formatted = formatter.format(entry);

      expect(formatted).toContain('2025-01-11T10:00:00.000Z');
      expect(formatted).toContain('INFO');
      expect(formatted).toContain('Test message');
    });

    it('should format log entry with metadata', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: { userId: 123, action: 'login' }
      };

      const formatted = formatter.format(entry);

      expect(formatted).toContain('Test message');
      expect(formatted).toContain('"userId":123');
      expect(formatted).toContain('"action":"login"');
    });

    it('should format log entry with context', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        context: {
          component: 'auth',
          operation: 'login',
          requestId: 'req-12345678-abcd-efgh'
        }
      };

      const formatted = formatter.format(entry);

      expect(formatted).toContain('[auth|login|req:req-1234]');
      expect(formatted).toContain('Test message');
    });

    it('should format log entry with error', () => {
      const error = new Error('Something went wrong');
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Test error',
        error
      };

      const formatted = formatter.format(entry);

      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Error: Something went wrong');
    });

    it('should handle circular metadata gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: circular
      };

      const formatted = formatter.format(entry);

      expect(formatted).toContain('Test message');
      expect(formatted).toContain('[Circular or invalid metadata]');
    });

    it('should pad log levels correctly', () => {
      const levels = [
        LogLevel.FATAL,
        LogLevel.ERROR,
        LogLevel.WARN,
        LogLevel.INFO,
        LogLevel.DEBUG,
        LogLevel.TRACE
      ];

      levels.forEach(level => {
        const entry: LogEntry = {
          timestamp: '2025-01-11T10:00:00.000Z',
          level,
          message: 'Test'
        };

        const formatted = formatter.format(entry);
        const levelStr = LogLevel[level];
        expect(formatted).toContain(levelStr.padEnd(5));
      });
    });

    it('should handle empty context gracefully', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        context: {}
      };

      const formatted = formatter.format(entry);

      expect(formatted).not.toContain('[]');
      expect(formatted).toContain('Test message');
    });
  });

  describe('JsonFormatter', () => {
    let formatter: JsonFormatter;

    beforeEach(() => {
      formatter = new JsonFormatter();
    });

    it('should format basic log entry as JSON', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message'
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.timestamp).toBe('2025-01-11T10:00:00.000Z');
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test message');
    });

    it('should include metadata in JSON output', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: { userId: 123, action: 'login' }
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe('login');
    });

    it('should include context in JSON output', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        context: {
          component: 'auth',
          operation: 'login',
          requestId: 'req-123'
        }
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.component).toBe('auth');
      expect(parsed.operation).toBe('login');
      expect(parsed.requestId).toBe('req-123');
    });

    it('should format error information in JSON', () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at test.js:1:1';
      
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Test error',
        error
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Something went wrong');
      expect(parsed.error.stack).toContain('Error: Something went wrong');
    });

    it('should handle complex nested metadata', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: {
          user: {
            id: 123,
            profile: {
              name: 'John Doe',
              settings: {
                theme: 'dark',
                notifications: true
              }
            }
          },
          tags: ['important', 'user-action']
        }
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.user.id).toBe(123);
      expect(parsed.user.profile.name).toBe('John Doe');
      expect(parsed.user.profile.settings.theme).toBe('dark');
      expect(parsed.tags).toEqual(['important', 'user-action']);
    });

    it('should not include undefined or null context/metadata', () => {
      const entry: LogEntry = {
        timestamp: '2025-01-11T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        context: undefined,
        metadata: undefined
      };

      const formatted = formatter.format(entry);
      const parsed = JSON.parse(formatted);

      expect(parsed.timestamp).toBe('2025-01-11T10:00:00.000Z');
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test message');
      expect(Object.keys(parsed)).toEqual(['timestamp', 'level', 'message']);
    });
  });
});
