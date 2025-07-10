/**
 * @fileoverview Core security middleware for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

import { Request, Response, NextFunction } from 'express';
import { 
  SecurityMiddleware, 
  CorsOptions, 
  RateLimitOptions, 
  SecurityHeadersOptions,
  RequestValidationOptions 
} from './interfaces';

/**
 * Core security middleware class providing essential security features
 */
export class SecurityMiddlewareCore {
  /**
   * CORS middleware for handling Cross-Origin Resource Sharing
   */
  static cors(options: CorsOptions = {}): SecurityMiddleware {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization'],
      exposedHeaders = [],
      credentials = false,
      maxAge = 86400,
      preflightContinue = false,
      optionsSuccessStatus = 204
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // Handle origin
      if (typeof origin === 'string') {
        res.header('Access-Control-Allow-Origin', origin);
      } else if (Array.isArray(origin)) {
        const requestOrigin = req.headers.origin;
        if (requestOrigin && origin.includes(requestOrigin)) {
          res.header('Access-Control-Allow-Origin', requestOrigin);
        }
      } else if (typeof origin === 'function') {
        origin(req.headers.origin, (err, allow) => {
          if (err) return next(err);
          if (allow) {
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
          }
        });
      } else if (origin === true) {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      }

      // Set other CORS headers
      res.header('Access-Control-Allow-Methods', methods.join(', '));
      res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      
      if (exposedHeaders.length > 0) {
        res.header('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      }
      
      if (credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      res.header('Access-Control-Max-Age', maxAge.toString());

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        if (preflightContinue) {
          return next();
        }
        return res.status(optionsSuccessStatus).end();
      }

      next();
    };
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(options: RateLimitOptions): SecurityMiddleware {
    const {
      windowMs,
      max,
      message = 'Too many requests from this IP, please try again later',
      keyGenerator = (req) => req.ip || 'unknown',
      skip = () => false,
      standardHeaders = true,
      legacyHeaders = false
    } = options;

    const requests = new Map<string, { count: number; resetTime: number }>();

    // Cleanup expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of requests.entries()) {
        if (now > data.resetTime) {
          requests.delete(key);
        }
      }
    }, windowMs);

    return (req: Request, res: Response, next: NextFunction) => {
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const now = Date.now();
      
      let requestData = requests.get(key);
      
      if (!requestData || now > requestData.resetTime) {
        requestData = {
          count: 1,
          resetTime: now + windowMs
        };
        requests.set(key, requestData);
      } else {
        requestData.count++;
      }

      const remaining = Math.max(0, max - requestData.count);
      const resetTime = Math.ceil((requestData.resetTime - now) / 1000);

      // Set rate limit headers
      if (standardHeaders) {
        res.header('RateLimit-Limit', max.toString());
        res.header('RateLimit-Remaining', remaining.toString());
        res.header('RateLimit-Reset', new Date(requestData.resetTime).toISOString());
      }

      if (legacyHeaders) {
        res.header('X-RateLimit-Limit', max.toString());
        res.header('X-RateLimit-Remaining', remaining.toString());
        res.header('X-RateLimit-Reset', Math.ceil(requestData.resetTime / 1000).toString());
      }

      if (requestData.count > max) {
        res.header('Retry-After', resetTime.toString());
        return res.status(429).json({
          error: 'Too Many Requests',
          message: typeof message === 'string' ? message : message,
          retryAfter: resetTime
        });
      }

      next();
    };
  }

  /**
   * Security headers middleware (Helmet-like functionality)
   */
  static securityHeaders(options: SecurityHeadersOptions = {}): SecurityMiddleware {
    const {
      contentSecurityPolicy = "default-src 'self'",
      frameOptions = 'deny',
      contentTypeOptions = true,
      xssProtection = true,
      hsts = { maxAge: 31536000, includeSubDomains: true, preload: false },
      referrerPolicy = 'strict-origin-when-cross-origin'
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // Content Security Policy
      if (contentSecurityPolicy !== false) {
        res.header('Content-Security-Policy', contentSecurityPolicy);
      }

      // X-Frame-Options
      if (frameOptions !== false) {
        res.header('X-Frame-Options', frameOptions.toUpperCase());
      }

      // X-Content-Type-Options
      if (contentTypeOptions) {
        res.header('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection
      if (xssProtection) {
        res.header('X-XSS-Protection', '1; mode=block');
      }

      // Strict-Transport-Security
      if (hsts !== false) {
        let hstsValue = `max-age=${hsts.maxAge || 31536000}`;
        if (hsts.includeSubDomains) {
          hstsValue += '; includeSubDomains';
        }
        if (hsts.preload) {
          hstsValue += '; preload';
        }
        res.header('Strict-Transport-Security', hstsValue);
      }

      // Referrer-Policy
      if (referrerPolicy !== false) {
        res.header('Referrer-Policy', referrerPolicy);
      }

      // Additional security headers
      res.header('X-Permitted-Cross-Domain-Policies', 'none');
      res.header('X-Download-Options', 'noopen');

      next();
    };
  }

  /**
   * Request validation middleware
   */
  static requestValidation(options: RequestValidationOptions = {}): SecurityMiddleware {
    const {
      maxBodySize = '10mb',
      allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ],
      maxUrlLength = 2048,
      maxHeaderSize = 8192
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // Check URL length
      if (req.url.length > maxUrlLength) {
        return res.status(414).json({
          error: 'URI Too Long',
          message: `URL length exceeds maximum of ${maxUrlLength} characters`
        });
      }

      // Check content type
      if (req.headers['content-type']) {
        const contentType = req.headers['content-type'].split(';')[0];
        if (!allowedContentTypes.includes(contentType)) {
          return res.status(415).json({
            error: 'Unsupported Media Type',
            message: `Content type ${contentType} is not allowed`
          });
        }
      }

      // Check header size (approximate)
      const headerSize = JSON.stringify(req.headers).length;
      if (headerSize > maxHeaderSize) {
        return res.status(431).json({
          error: 'Request Header Fields Too Large',
          message: 'Request headers exceed maximum size'
        });
      }

      next();
    };
  }

  /**
   * Content sniffing protection
   */
  static noSniff(): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      res.header('X-Content-Type-Options', 'nosniff');
      next();
    };
  }

  /**
   * Hide X-Powered-By header
   */
  static hidePoweredBy(): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      res.removeHeader('X-Powered-By');
      next();
    };
  }

  /**
   * Prevent DNS prefetch
   */
  static dnsPrefetchControl(allow: boolean = false): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      res.header('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
      next();
    };
  }

  /**
   * IE-specific security
   */
  static ieNoOpen(): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      res.header('X-Download-Options', 'noopen');
      next();
    };
  }
}
