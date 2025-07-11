# 📊 Task 04: Sistema de Logging Avanzado

## 📋 Información General

- **ID**: 04
- **Título**: Implementar Sistema de Logging Estructurado
- **Prioridad**: 🟡 Importante
- **Estimación**: 4-6 horas
- **Asignado**: Developer
- **Estado**: ✅ Completado

## 🎯 Objetivo

Implementar un sistema completo de logging estructurado que facilite el debugging, monitoring y análisis de la aplicación en todos los entornos.

## 📄 Descripción

El framework necesita un sistema de logging robusto que permita diferentes niveles de log, múltiples transports, structured logging, y integración con sistemas de monitoring.

## ✅ Criterios de Aceptación

### 1. Logger Core
- [x] Interface ILogger bien definida
- [x] Múltiples niveles de log (debug, info, warn, error, fatal)
- [x] Structured logging con metadata
- [x] Formatters personalizables

### 2. Transport System
- [x] Console transport para desarrollo
- [x] File transport con rotación
- [x] HTTP transport para servicios externos
- [x] Stream transport personalizable

### 3. Performance Features
- [x] Lazy evaluation de log messages
- [x] Batching para high-volume logging
- [x] Async logging sin blocking
- [x] Memory-efficient buffering

### 4. Integration
- [x] Middleware de request logging
- [x] Error logging automático
- [x] Performance metrics logging
- [x] Context propagation

## 🛠️ Implementación

### 1. Core Logger Interface

```typescript
// tsfox/core/logging/interfaces.ts
export enum LogLevel {
  FATAL = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  context?: LogContext;
  error?: Error;
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  component?: string;
  operation?: string;
}

export interface ILogger {
  fatal(message: string, metadata?: Record<string, any>, error?: Error): void;
  error(message: string, metadata?: Record<string, any>, error?: Error): void;
  warn(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  trace(message: string, metadata?: Record<string, any>): void;
  
  child(context: Partial<LogContext>): ILogger;
  setLevel(level: LogLevel): void;
  addTransport(transport: ITransport): void;
  removeTransport(name: string): void;
}

export interface ITransport {
  name: string;
  level: LogLevel;
  log(entry: LogEntry): Promise<void> | void;
  close?(): Promise<void> | void;
}

export interface IFormatter {
  format(entry: LogEntry): string;
}
```

### 2. Core Logger Implementation

```typescript
// tsfox/core/logging/logger.ts
import { ILogger, ITransport, LogLevel, LogEntry, LogContext } from './interfaces';
import { generateId } from '../utils/id-generator';

export class Logger implements ILogger {
  private transports: ITransport[] = [];
  private currentLevel: LogLevel = LogLevel.INFO;
  private context: LogContext = {};

  constructor(
    context?: LogContext,
    level: LogLevel = LogLevel.INFO
  ) {
    this.context = context || {};
    this.currentLevel = level;
  }

  fatal(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, metadata, error);
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  child(context: Partial<LogContext>): ILogger {
    return new Logger(
      { ...this.context, ...context },
      this.currentLevel
    );
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  addTransport(transport: ITransport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    // Skip if level is too high
    if (level > this.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      context: this.context,
      error
    };

    // Send to all appropriate transports
    this.transports
      .filter(transport => level <= transport.level)
      .forEach(transport => {
        try {
          const result = transport.log(entry);
          // Handle async transports
          if (result instanceof Promise) {
            result.catch(err => {
              console.error('Transport error:', err);
            });
          }
        } catch (err) {
          console.error('Transport error:', err);
        }
      });
  }
}
```

### 3. Transport Implementations

```typescript
// tsfox/core/logging/transports/console.transport.ts
import { ITransport, IFormatter, LogEntry, LogLevel } from '../interfaces';
import { DefaultFormatter } from '../formatters';

export class ConsoleTransport implements ITransport {
  name = 'console';
  
  constructor(
    public level: LogLevel = LogLevel.INFO,
    private formatter: IFormatter = new DefaultFormatter()
  ) {}

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    
    switch (entry.level) {
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(formatted);
        break;
    }
  }
}

// tsfox/core/logging/transports/file.transport.ts
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ITransport, LogEntry, LogLevel } from '../interfaces';

export interface FileTransportOptions {
  filename: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  rotateDaily?: boolean;
}

export class FileTransport implements ITransport {
  name = 'file';
  private writeQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(
    public level: LogLevel,
    private options: FileTransportOptions
  ) {
    this.ensureDirectoryExists();
  }

  async log(entry: LogEntry): Promise<void> {
    this.writeQueue.push(entry);
    
    if (!this.isWriting) {
      await this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.writeQueue.length === 0 || this.isWriting) {
      return;
    }

    this.isWriting = true;

    try {
      const entries = [...this.writeQueue];
      this.writeQueue = [];

      const content = entries
        .map(entry => JSON.stringify(entry))
        .join('\n') + '\n';

      await this.writeToFile(content);
    } finally {
      this.isWriting = false;
      
      // Process any entries that were added while writing
      if (this.writeQueue.length > 0) {
        setImmediate(() => this.flushQueue());
      }
    }
  }

  private async writeToFile(content: string): Promise<void> {
    const filename = this.getCurrentFilename();
    
    // Check if rotation is needed
    if (await this.shouldRotate(filename)) {
      await this.rotateFile(filename);
    }

    await fs.appendFile(filename, content, 'utf8');
  }

  private getCurrentFilename(): string {
    if (this.options.rotateDaily) {
      const date = new Date().toISOString().split('T')[0];
      const ext = this.options.filename.split('.').pop();
      const base = this.options.filename.replace(`.${ext}`, '');
      return `${base}-${date}.${ext}`;
    }
    return this.options.filename;
  }

  private async shouldRotate(filename: string): Promise<boolean> {
    if (!this.options.maxSize) return false;

    try {
      const stats = await fs.stat(filename);
      return stats.size >= this.options.maxSize;
    } catch (error) {
      return false; // File doesn't exist
    }
  }

  private async rotateFile(filename: string): Promise<void> {
    const maxFiles = this.options.maxFiles || 5;
    
    // Rotate existing files
    for (let i = maxFiles - 1; i >= 1; i--) {
      const oldFile = `${filename}.${i}`;
      const newFile = `${filename}.${i + 1}`;
      
      try {
        await fs.rename(oldFile, newFile);
      } catch (error) {
        // File might not exist, continue
      }
    }

    // Move current file to .1
    try {
      await fs.rename(filename, `${filename}.1`);
    } catch (error) {
      // File might not exist, continue
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.options.filename);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async close(): Promise<void> {
    await this.flushQueue();
  }
}
```

### 4. Formatters

```typescript
// tsfox/core/logging/formatters/default.formatter.ts
import { IFormatter, LogEntry, LogLevel } from '../interfaces';

export class DefaultFormatter implements IFormatter {
  format(entry: LogEntry): string {
    const level = LogLevel[entry.level].padEnd(5);
    const timestamp = entry.timestamp;
    const context = this.formatContext(entry);
    const metadata = this.formatMetadata(entry.metadata);
    const error = entry.error ? ` | Error: ${entry.error.message}` : '';

    return `[${timestamp}] ${level} ${context}${entry.message}${metadata}${error}`;
  }

  private formatContext(entry: LogEntry): string {
    if (!entry.context) return '';
    
    const parts: string[] = [];
    
    if (entry.context.component) parts.push(entry.context.component);
    if (entry.context.operation) parts.push(entry.context.operation);
    if (entry.context.requestId) parts.push(`req:${entry.context.requestId.slice(0, 8)}`);
    
    return parts.length > 0 ? `[${parts.join('|')}] ` : '';
  }

  private formatMetadata(metadata?: Record<string, any>): string {
    if (!metadata || Object.keys(metadata).length === 0) return '';
    
    try {
      return ` | ${JSON.stringify(metadata)}`;
    } catch (error) {
      return ` | [Circular or invalid metadata]`;
    }
  }
}

export class JsonFormatter implements IFormatter {
  format(entry: LogEntry): string {
    const logObject = {
      timestamp: entry.timestamp,
      level: LogLevel[entry.level],
      message: entry.message,
      ...entry.context,
      ...entry.metadata,
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        }
      })
    };

    return JSON.stringify(logObject);
  }
}
```

### 5. Request Logging Middleware

```typescript
// tsfox/core/middleware/request-logging.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../logging/interfaces';
import { generateId } from '../utils/id-generator';

export interface RequestLoggingOptions {
  skipPaths?: string[];
  skipSuccessful?: boolean;
  includeHeaders?: boolean;
  includeBody?: boolean;
  maxBodySize?: number;
}

export class RequestLoggingMiddleware {
  constructor(
    private logger: ILogger,
    private options: RequestLoggingOptions = {}
  ) {}

  middleware() {
    return (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
      // Skip certain paths
      if (this.options.skipPaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Generate request ID
      req.requestId = generateId();
      const requestLogger = this.logger.child({
        requestId: req.requestId,
        component: 'http'
      });

      // Log request start
      const startTime = Date.now();
      const requestInfo = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...(this.options.includeHeaders && { headers: req.headers }),
        ...(this.options.includeBody && this.shouldLogBody(req) && { 
          body: this.sanitizeBody(req.body) 
        })
      };

      requestLogger.info('Request started', requestInfo);

      // Capture response
      const originalSend = res.send;
      let responseBody: any;

      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const responseInfo = {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('Content-Length')
        };

        const isError = res.statusCode >= 400;
        const shouldLog = !this.options.skipSuccessful || isError;

        if (shouldLog) {
          if (isError) {
            requestLogger.warn('Request completed with error', responseInfo);
          } else {
            requestLogger.info('Request completed', responseInfo);
          }
        }
      });

      next();
    };
  }

  private shouldLogBody(req: Request): boolean {
    if (!this.options.includeBody) return false;
    
    const contentType = req.get('Content-Type') || '';
    return contentType.includes('application/json') || 
           contentType.includes('application/x-www-form-urlencoded');
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    // Clone and sanitize sensitive data
    const sanitized = JSON.parse(JSON.stringify(body));
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    this.sanitizeObject(sanitized, sensitiveFields);
    
    // Limit size
    const jsonString = JSON.stringify(sanitized);
    const maxSize = this.options.maxBodySize || 1000;
    
    if (jsonString.length > maxSize) {
      return `[Body too large: ${jsonString.length} chars]`;
    }
    
    return sanitized;
  }

  private sanitizeObject(obj: any, sensitiveFields: string[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key], sensitiveFields);
      }
    }
  }
}
```

### 6. Logger Factory

```typescript
// tsfox/core/logging/logger.factory.ts
import { ILogger, LogLevel } from './interfaces';
import { Logger } from './logger';
import { ConsoleTransport } from './transports/console.transport';
import { FileTransport } from './transports/file.transport';
import { DefaultFormatter, JsonFormatter } from './formatters';

export interface LoggerConfig {
  level?: LogLevel;
  console?: {
    enabled?: boolean;
    level?: LogLevel;
    format?: 'default' | 'json';
  };
  file?: {
    enabled?: boolean;
    level?: LogLevel;
    filename?: string;
    maxSize?: number;
    maxFiles?: number;
    rotateDaily?: boolean;
  };
}

export class LoggerFactory {
  static create(config: LoggerConfig = {}): ILogger {
    const logger = new Logger(undefined, config.level || LogLevel.INFO);

    // Add console transport
    if (config.console?.enabled !== false) {
      const formatter = config.console?.format === 'json' 
        ? new JsonFormatter() 
        : new DefaultFormatter();
      
      logger.addTransport(new ConsoleTransport(
        config.console?.level || config.level || LogLevel.INFO,
        formatter
      ));
    }

    // Add file transport
    if (config.file?.enabled) {
      logger.addTransport(new FileTransport(
        config.file.level || config.level || LogLevel.INFO,
        {
          filename: config.file.filename || 'logs/app.log',
          maxSize: config.file.maxSize,
          maxFiles: config.file.maxFiles,
          rotateDaily: config.file.rotateDaily
        }
      ));
    }

    return logger;
  }

  static createFromEnv(): ILogger {
    const config: LoggerConfig = {
      level: this.parseLogLevel(process.env.LOG_LEVEL),
      console: {
        enabled: process.env.LOG_CONSOLE !== 'false',
        format: process.env.LOG_FORMAT as 'default' | 'json' || 'default'
      },
      file: {
        enabled: process.env.LOG_FILE === 'true',
        filename: process.env.LOG_FILE_PATH || 'logs/app.log',
        maxSize: process.env.LOG_FILE_MAX_SIZE ? parseInt(process.env.LOG_FILE_MAX_SIZE) : undefined,
        maxFiles: process.env.LOG_FILE_MAX_FILES ? parseInt(process.env.LOG_FILE_MAX_FILES) : undefined,
        rotateDaily: process.env.LOG_FILE_ROTATE_DAILY === 'true'
      }
    };

    return this.create(config);
  }

  private static parseLogLevel(level?: string): LogLevel {
    if (!level) return LogLevel.INFO;
    
    const upperLevel = level.toUpperCase();
    return LogLevel[upperLevel as keyof typeof LogLevel] || LogLevel.INFO;
  }
}
```

## 🧪 Plan de Testing

### 1. Logger Core Tests

```typescript
describe('Logger', () => {
  it('should log messages at appropriate levels');
  it('should create child loggers with context');
  it('should filter messages by level');
  it('should handle metadata correctly');
});
```

### 2. Transport Tests

```typescript
describe('Transports', () => {
  describe('ConsoleTransport', () => {
    it('should output to console methods correctly');
    it('should format messages properly');
  });

  describe('FileTransport', () => {
    it('should write to files');
    it('should rotate files when size limit reached');
    it('should handle concurrent writes');
  });
});
```

## 📊 Definición de Done

- [ ] Core logger con todos los niveles implementado
- [ ] Console y File transports funcionando
- [ ] Request logging middleware operativo
- [ ] Logger factory con configuración flexible
- [ ] Tests unitarios >80% cobertura
- [ ] Performance tests para high-volume logging
- [ ] Documentación completa con ejemplos

## 🔗 Dependencias

- **Depende de**: Task 01 (Dependencies)
- **Relacionada con**: Task 03 (Error Handling), Task 06 (Security)
- **Integra con**: Todas las features del framework

## 📚 Referencias

- [Winston.js Documentation](https://github.com/winstonjs/winston)
- [Structured Logging Best Practices](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Node.js Logging Performance](https://github.com/pinojs/pino/blob/master/docs/benchmarks.md)
