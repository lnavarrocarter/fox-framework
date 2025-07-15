/**
 * @fileoverview Request logging middleware for Fox Framework
 * @version 1.0.0
 * @since 2025-01-11
 */

import { Request, Response, NextFunction } from 'express';
import { ILogger } from './interfaces';
import { generateId } from '../utils/id-generator';

export interface RequestLoggingOptions {
  includeBody?: boolean;
  includeHeaders?: boolean;
  skipSuccessful?: boolean;
  maxBodySize?: number;
  sensitiveHeaders?: string[];
  customRequestId?: (req: Request) => string;
  skipPaths?: string[];
}

export class RequestLoggingMiddleware {
  constructor(
    private logger: ILogger,
    private options: RequestLoggingOptions = {}
  ) {
    this.options = {
      includeBody: false,
      includeHeaders: true,
      skipSuccessful: false,
      maxBodySize: 1000,
      sensitiveHeaders: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
      ...options
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if path should be skipped
      if (this.options.skipPaths && this.options.skipPaths.includes(req.path)) {
        return next();
      }

      const startTime = Date.now();
      
      // Generate or extract request ID
      const requestId = this.options.customRequestId 
        ? this.options.customRequestId(req)
        : req.headers['x-request-id'] as string || generateId();

      // Add request ID to headers for tracing
      req.headers['x-request-id'] = requestId;
      res.setHeader('x-request-id', requestId);
      
      // Add request ID to request object for access
      (req as any).requestId = requestId;

      // Create request-specific logger
      const requestLogger = this.logger.child({
        requestId,
        component: 'http',
        operation: 'request'
      });

      // Log incoming request
      const requestInfo = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        ...(this.options.includeHeaders && {
          headers: this.sanitizeHeaders(req.headers)
        }),
        ...(this.shouldLogBody(req) && {
          body: this.sanitizeBody(req.body)
        })
      };

      requestLogger.info('Request started', requestInfo);

      // Store request start time and logger in response for later use
      (res as any).startTime = startTime;
      (res as any).requestLogger = requestLogger;

      // Hook into response finish event
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        const responseInfo = {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
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

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = this.options.sensitiveHeaders || [];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
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
