/**
 * @fileoverview Logger factory for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

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
