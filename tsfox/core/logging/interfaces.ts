/**
 * @fileoverview Core logging interfaces for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

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
