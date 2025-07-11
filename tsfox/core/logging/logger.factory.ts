/**
 * @fileoverview Logger factory for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

import { ILogger, LogLevel } from './interfaces';
import { Logger } from './logger';
import { ConsoleTransport } from './transports/console.transport';
import { FileTransport } from './transports/file.transport';
import { HttpTransport } from './transports/http.transport';
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
  http?: {
    enabled?: boolean;
    level?: LogLevel;
    url?: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    batchSize?: number;
    batchTimeout?: number;
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

    // Add HTTP transport
    if (config.http?.enabled && config.http.url) {
      logger.addTransport(new HttpTransport(
        config.http.level || config.level || LogLevel.INFO,
        {
          url: config.http.url,
          method: config.http.method,
          headers: config.http.headers,
          batchSize: config.http.batchSize,
          batchTimeout: config.http.batchTimeout
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
      },
      http: {
        enabled: process.env.LOG_HTTP === 'true',
        url: process.env.LOG_HTTP_URL,
        method: process.env.LOG_HTTP_METHOD as 'POST' | 'PUT' || 'POST',
        batchSize: process.env.LOG_HTTP_BATCH_SIZE ? parseInt(process.env.LOG_HTTP_BATCH_SIZE) : undefined,
        batchTimeout: process.env.LOG_HTTP_BATCH_TIMEOUT ? parseInt(process.env.LOG_HTTP_BATCH_TIMEOUT) : undefined
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
