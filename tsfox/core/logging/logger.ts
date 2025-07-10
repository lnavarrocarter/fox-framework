/**
 * @fileoverview Core Logger implementation for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

import { ILogger, ITransport, LogLevel, LogEntry, LogContext } from './interfaces';

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
    const childLogger = new Logger(
      { ...this.context, ...context },
      this.currentLevel
    );
    
    // Copy transports from parent to child
    this.transports.forEach(transport => {
      childLogger.addTransport(transport);
    });
    
    return childLogger;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    
    // Update transport levels if they are higher than logger level
    this.transports.forEach(transport => {
      if (transport.level > level) {
        transport.level = level;
      }
    });
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
