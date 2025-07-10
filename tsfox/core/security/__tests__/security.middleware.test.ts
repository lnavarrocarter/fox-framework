/**
 * @fileoverview Tests for security middleware
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { SecurityMiddlewareCore } from '../security.middleware';
import { CorsOptions, RateLimitOptions, SecurityHeadersOptions } from '../interfaces';

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/',
  headers: {},
  ip: '127.0.0.1',
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  const mockResponse: any = {
    header: jest.fn((name: string, value?: string): any => {
      if (value !== undefined) {
        headers[name] = value;
      }
      return mockResponse;
    }),
    removeHeader: jest.fn((name: string): any => {
      delete headers[name];
      return mockResponse;
    }),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    getHeaders: () => headers,
    cookie: jest.fn().mockReturnThis()
  };
  return mockResponse;
};

const createMockNext = () => jest.fn();

describe('SecurityMiddlewareCore', () => {
  describe('cors', () => {
    it('should set default CORS headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.cors();
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(next).toHaveBeenCalled();
    });

    it('should handle custom CORS options', () => {
      const options: CorsOptions = {
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true,
        maxAge: 3600
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.cors(options);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Authorization');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(res.header).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
    });

    it('should handle OPTIONS requests', () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.cors();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle array of origins', () => {
      const options: CorsOptions = {
        origin: ['https://example.com', 'https://test.com']
      };

      const req = createMockRequest({
        headers: { origin: 'https://example.com' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.cors(options);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        max: 5
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.rateLimit(options);
      
      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        middleware(req as Request, res as Response, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('should block requests exceeding limit', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        max: 2
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.rateLimit(options);
      
      // Make requests up to limit
      middleware(req as Request, res as Response, next);
      middleware(req as Request, res as Response, next);
      
      // This should be blocked
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests'
        })
      );
    });

    it('should set rate limit headers', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        max: 10,
        standardHeaders: true
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.rateLimit(options);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('RateLimit-Limit', '10');
      expect(res.header).toHaveBeenCalledWith('RateLimit-Remaining', '9');
    });

    it('should use custom key generator', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => req.headers['x-api-key'] as string || 'anonymous'
      };

      const req1 = createMockRequest({ headers: { 'x-api-key': 'key1' } });
      const req2 = createMockRequest({ headers: { 'x-api-key': 'key2' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.rateLimit(options);
      
      // Different keys should have separate limits
      middleware(req1 as Request, res as Response, next);
      middleware(req1 as Request, res as Response, next);
      middleware(req2 as Request, res as Response, next);
      middleware(req2 as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(4);
    });

    it('should skip requests when skip function returns true', () => {
      const options: RateLimitOptions = {
        windowMs: 60000,
        max: 1,
        skip: (req) => req.headers['x-skip'] === 'true'
      };

      const req = createMockRequest({ headers: { 'x-skip': 'true' } });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.rateLimit(options);
      
      // Multiple requests should all be skipped
      middleware(req as Request, res as Response, next);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('securityHeaders', () => {
    it('should set default security headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.securityHeaders();
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'self'");
      expect(res.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      expect(res.header).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(next).toHaveBeenCalled();
    });

    it('should handle custom security headers options', () => {
      const options: SecurityHeadersOptions = {
        contentSecurityPolicy: "default-src 'none'",
        frameOptions: 'sameorigin',
        contentTypeOptions: false,
        xssProtection: false,
        hsts: false,
        referrerPolicy: 'no-referrer'
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.securityHeaders(options);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'none'");
      expect(res.header).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
      expect(res.header).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
      
      // Should not set disabled headers
      expect(res.header).not.toHaveBeenCalledWith('X-Content-Type-Options', expect.anything());
      expect(res.header).not.toHaveBeenCalledWith('X-XSS-Protection', expect.anything());
      expect(res.header).not.toHaveBeenCalledWith('Strict-Transport-Security', expect.anything());
    });

    it('should handle custom HSTS options', () => {
      const options: SecurityHeadersOptions = {
        hsts: {
          maxAge: 86400,
          includeSubDomains: false,
          preload: true
        }
      };

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.securityHeaders(options);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=86400; preload');
    });
  });

  describe('requestValidation', () => {
    it('should reject URLs that are too long', () => {
      const longUrl = '/' + 'a'.repeat(3000);
      const req = createMockRequest({ url: longUrl });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.requestValidation({
        maxUrlLength: 2048
      });
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(414);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'URI Too Long'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unsupported content types', () => {
      const req = createMockRequest({
        headers: { 'content-type': 'application/xml' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.requestValidation({
        allowedContentTypes: ['application/json']
      });
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unsupported Media Type'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow valid requests', () => {
      const req = createMockRequest({
        url: '/api/test',
        headers: { 'content-type': 'application/json' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.requestValidation();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('hidePoweredBy', () => {
    it('should remove X-Powered-By header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.hidePoweredBy();
      middleware(req as Request, res as Response, next);

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('noSniff', () => {
    it('should set X-Content-Type-Options header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.noSniff();
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('dnsPrefetchControl', () => {
    it('should disable DNS prefetch by default', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.dnsPrefetchControl();
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
      expect(next).toHaveBeenCalled();
    });

    it('should enable DNS prefetch when specified', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.dnsPrefetchControl(true);
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'on');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('ieNoOpen', () => {
    it('should set X-Download-Options header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = SecurityMiddlewareCore.ieNoOpen();
      middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('X-Download-Options', 'noopen');
      expect(next).toHaveBeenCalled();
    });
  });
});
