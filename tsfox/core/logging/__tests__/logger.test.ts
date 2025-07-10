/**
 * @fileoverview Tests for Logger interfaces and core functionality
 * @version 1.0.0
 * @since 2025-01-10
 */

import { 
  Logger, 
  LogLevel, 
  ITransport, 
  LogEntry, 
  ConsoleTransport,
  DefaultFormatter,
  JsonFormatter 
} from '../index';

describe('Logger Core', () => {
  let logger: Logger;
  let mockTransport: ITransport;
  let loggedEntries: LogEntry[];

  beforeEach(() => {
    loggedEntries = [];
    mockTransport = {
      name: 'mock',
      level: LogLevel.DEBUG,
      log: (entry: LogEntry) => {
        loggedEntries.push(entry);
      }
    };
    
    logger = new Logger();
    logger.addTransport(mockTransport);
  });

  describe('Logging Levels', () => {
    it('should log messages at appropriate levels', () => {
      logger.setLevel(LogLevel.INFO);
      
      logger.fatal('Fatal message');
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message'); // Should not be logged
      logger.trace('Trace message'); // Should not be logged
      
      expect(loggedEntries).toHaveLength(4);
      expect(loggedEntries[0].level).toBe(LogLevel.FATAL);
      expect(loggedEntries[1].level).toBe(LogLevel.ERROR);
      expect(loggedEntries[2].level).toBe(LogLevel.WARN);
      expect(loggedEntries[3].level).toBe(LogLevel.INFO);
    });

    it('should respect transport level filtering', () => {
      mockTransport.level = LogLevel.WARN;
      logger.setLevel(LogLevel.DEBUG);
      
      logger.fatal('Fatal message');
      logger.error('Error message'); 
      logger.warn('Warning message');
      logger.info('Info message'); // Should not reach transport
      
      expect(loggedEntries).toHaveLength(3);
    });
  });

  describe('Child Loggers', () => {
    it('should create child loggers with context', () => {
      const childLogger = logger.child({
        component: 'test',
        requestId: 'req-123'
      });
      
      childLogger.info('Test message');
      
      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0].context?.component).toBe('test');
      expect(loggedEntries[0].context?.requestId).toBe('req-123');
    });

    it('should inherit parent context and extend it', () => {
      const parentLogger = logger.child({ component: 'parent' });
      const childLogger = parentLogger.child({ operation: 'test' });
      
      childLogger.info('Test message');
      
      expect(loggedEntries[0].context?.component).toBe('parent');
      expect(loggedEntries[0].context?.operation).toBe('test');
    });
  });

  describe('Metadata and Errors', () => {
    it('should handle metadata correctly', () => {
      const metadata = { userId: 123, action: 'login' };
      logger.info('User action', metadata);
      
      expect(loggedEntries[0].metadata).toEqual(metadata);
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Something went wrong', {}, error);
      
      expect(loggedEntries[0].error).toBe(error);
    });
  });

  describe('Transport Management', () => {
    it('should add and remove transports', () => {
      const transport2 = {
        name: 'transport2',
        level: LogLevel.INFO,
        log: jest.fn()
      };
      
      logger.addTransport(transport2);
      logger.info('Test message');
      
      expect(transport2.log).toHaveBeenCalled();
      
      logger.removeTransport('transport2');
      logger.info('Test message 2');
      
      expect(transport2.log).toHaveBeenCalledTimes(1);
    });

    it('should handle transport errors gracefully', () => {
      const errorTransport = {
        name: 'error',
        level: LogLevel.INFO,
        log: () => { throw new Error('Transport error'); }
      };
      
      logger.addTransport(errorTransport);
      
      // Should not throw
      expect(() => logger.info('Test message')).not.toThrow();
    });
  });
});

describe('Formatters', () => {
  let logEntry: LogEntry;

  beforeEach(() => {
    logEntry = {
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Test message',
      context: {
        component: 'test',
        requestId: 'req-123456789'
      },
      metadata: { userId: 123 }
    };
  });

  describe('DefaultFormatter', () => {
    it('should format log entries correctly', () => {
      const formatter = new DefaultFormatter();
      const formatted = formatter.format(logEntry);
      
      expect(formatted).toContain('[2025-01-10T12:00:00.000Z]');
      expect(formatted).toContain('INFO');
      expect(formatted).toContain('[test|req:req-1234]');
      expect(formatted).toContain('Test message');
      expect(formatted).toContain('{"userId":123}');
    });

    it('should handle errors in formatting', () => {
      const formatter = new DefaultFormatter();
      const entryWithError = {
        ...logEntry,
        error: new Error('Test error')
      };
      
      const formatted = formatter.format(entryWithError);
      expect(formatted).toContain('Error: Test error');
    });

    it('should handle circular metadata', () => {
      const formatter = new DefaultFormatter();
      const circular: any = { test: 'value' };
      circular.self = circular;
      
      const entryWithCircular = {
        ...logEntry,
        metadata: circular
      };
      
      const formatted = formatter.format(entryWithCircular);
      expect(formatted).toContain('[Circular or invalid metadata]');
    });
  });

  describe('JsonFormatter', () => {
    it('should format as JSON', () => {
      const formatter = new JsonFormatter();
      const formatted = formatter.format(logEntry);
      
      const parsed = JSON.parse(formatted);
      expect(parsed.timestamp).toBe(logEntry.timestamp);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe(logEntry.message);
      expect(parsed.component).toBe('test');
      expect(parsed.userId).toBe(123);
    });

    it('should include error details in JSON', () => {
      const formatter = new JsonFormatter();
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      
      const entryWithError = {
        ...logEntry,
        error
      };
      
      const formatted = formatter.format(entryWithError);
      const parsed = JSON.parse(formatted);
      
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toContain('Error: Test error');
    });
  });
});

describe('ConsoleTransport', () => {
  let consoleSpies: any;

  beforeEach(() => {
    consoleSpies = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
  });

  afterEach(() => {
    Object.values(consoleSpies).forEach((spy: any) => spy.mockRestore());
  });

  it('should output to appropriate console methods', () => {
    const transport = new ConsoleTransport(LogLevel.DEBUG);
    
    transport.log({
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.FATAL,
      message: 'Fatal message'
    });
    
    transport.log({
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.ERROR,
      message: 'Error message'
    });
    
    transport.log({
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.WARN,
      message: 'Warning message'
    });
    
    transport.log({
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.INFO,
      message: 'Info message'
    });
    
    transport.log({
      timestamp: '2025-01-10T12:00:00.000Z',
      level: LogLevel.DEBUG,
      message: 'Debug message'
    });
    
    expect(consoleSpies.error).toHaveBeenCalledTimes(2); // FATAL + ERROR
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
  });
});
