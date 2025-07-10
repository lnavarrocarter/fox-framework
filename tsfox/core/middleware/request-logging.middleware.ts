/**
 * @fileoverview Request logging middleware for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

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
