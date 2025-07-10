/**
 * @fileoverview Default formatter for Fox Framework logging
 * @version 1.0.0
 * @since 2025-01-10
 */

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
