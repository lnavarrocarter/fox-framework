/**
 * @fileoverview Fox Framework Logging System - Main exports
 * @version 1.0.0
 * @since 2025-01-10
 */

// Core interfaces and types
export {
  ILogger,
  ITransport,
  IFormatter,
  LogLevel,
  LogEntry,
  LogContext
} from './interfaces';

// Core logger implementation
export { Logger } from './logger';

// Logger factory
export { LoggerFactory, LoggerConfig } from './logger.factory';

// Transports
export { ConsoleTransport } from './transports/console.transport';
export { FileTransport, FileTransportOptions } from './transports/file.transport';

// Formatters
export { DefaultFormatter, JsonFormatter } from './formatters';

// Middleware
export { RequestLoggingMiddleware, RequestLoggingOptions } from '../middleware/request-logging.middleware';

// Utilities
export { generateId, generateCorrelationId, generateShortId } from '../utils/id-generator';
