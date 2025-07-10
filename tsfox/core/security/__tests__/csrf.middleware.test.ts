/**
 * @fileoverview Tests for CSRF protection middleware
 */

import { Request, Response, NextFunction } from 'express';
import { CsrfMiddleware } from '../csrf.middleware';

// Mock express objects
const mockRequest = (method: string = 'GET', headers: any = {}, body: any = {}, cookies: any = {}, query: any = {}): Request => ({
  method,
  headers,
  body,
  cookies,
  query
} as Request);

const mockResponse = (): Response => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

describe('CsrfMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CsrfMiddleware.clearAllTokens();
  });

  describe('protect() method', () => {
    it('should create CSRF protection middleware', () => {
      const middleware = CsrfMiddleware.protect();
      expect(typeof middleware).toBe('function');
    });

    it('should allow GET requests and set CSRF token', () => {
      const middleware = CsrfMiddleware.protect();
      const req = mockRequest('GET');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
      expect((res as any).locals.csrfToken).toBeDefined();
    });

    it('should allow HEAD requests and set CSRF token', () => {
      const middleware = CsrfMiddleware.protect();
      const req = mockRequest('HEAD');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
      expect((res as any).locals.csrfToken).toBeDefined();
    });

    it('should allow OPTIONS requests and set CSRF token', () => {
      const middleware = CsrfMiddleware.protect();
      const req = mockRequest('OPTIONS');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
      expect((res as any).locals.csrfToken).toBeDefined();
    });

    it('should reject POST request without CSRF token', () => {
      const middleware = CsrfMiddleware.protect();
      const req = mockRequest('POST');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'CSRF token not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept POST request with valid CSRF token in header', () => {
      const middleware = CsrfMiddleware.protect();
      
      // First, do a GET request to generate token
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-session' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      const csrfToken = (getRes as any).locals.csrfToken;
      
      // Then, do a POST request with the token
      const postReq = mockRequest('POST', { 'x-csrf-token': csrfToken }, {}, { _sessionId: 'test-session' });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(postRes.status).not.toHaveBeenCalled();
    });

    it('should accept POST request with valid CSRF token in body', () => {
      const middleware = CsrfMiddleware.protect();
      
      // First, do a GET request to generate token
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-session-2' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      const csrfToken = (getRes as any).locals.csrfToken;
      
      // Then, do a POST request with the token in body
      const postReq = mockRequest('POST', {}, { _csrf: csrfToken }, { _sessionId: 'test-session-2' });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(postRes.status).not.toHaveBeenCalled();
    });

    it('should accept POST request with valid CSRF token in query', () => {
      const middleware = CsrfMiddleware.protect();
      
      // First, do a GET request to generate token
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-session-3' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      const csrfToken = (getRes as any).locals.csrfToken;
      
      // Then, do a POST request with the token in query
      const postReq = mockRequest('POST', {}, {}, { _sessionId: 'test-session-3' }, { _csrf: csrfToken });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(postRes.status).not.toHaveBeenCalled();
    });

    it('should reject POST request with invalid CSRF token', () => {
      const middleware = CsrfMiddleware.protect();
      
      // First, do a GET request to generate token
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-session-4' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      // Then, do a POST request with invalid token
      const postReq = mockRequest('POST', { 'x-csrf-token': 'invalid-token' }, {}, { _sessionId: 'test-session-4' });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(postRes.status).toHaveBeenCalledWith(403);
      expect(postRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid CSRF token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom cookie options', () => {
      const customOptions = {
        cookie: {
          name: 'custom-csrf',
          httpOnly: false,
          secure: true,
          sameSite: 'lax' as const
        }
      };

      const middleware = CsrfMiddleware.protect(customOptions);
      const req = mockRequest('GET');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(res.cookie).toHaveBeenCalledWith(
        'custom-csrf',
        expect.any(String),
        {
          httpOnly: false,
          secure: true,
          sameSite: 'lax'
        }
      );
    });

    it('should use custom header name', () => {
      const customOptions = {
        headerName: 'x-custom-csrf'
      };

      const middleware = CsrfMiddleware.protect(customOptions);
      
      // Generate token first
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-custom-header' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      const csrfToken = (getRes as any).locals.csrfToken;
      
      // Test with custom header
      const postReq = mockRequest('POST', { 'x-custom-csrf': csrfToken }, {}, { _sessionId: 'test-custom-header' });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom field name', () => {
      const customOptions = {
        fieldName: 'custom_csrf_field'
      };

      const middleware = CsrfMiddleware.protect(customOptions);
      
      // Generate token first
      const getReq = mockRequest('GET', {}, {}, { _sessionId: 'test-custom-field' });
      const getRes = mockResponse();
      middleware(getReq, getRes, mockNext);
      
      const csrfToken = (getRes as any).locals.csrfToken;
      
      // Test with custom field
      const postReq = mockRequest('POST', {}, { custom_csrf_field: csrfToken }, { _sessionId: 'test-custom-field' });
      const postRes = mockResponse();
      
      jest.clearAllMocks();
      middleware(postReq, postRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getToken() method', () => {
    it('should return null for request without session', () => {
      const req = mockRequest('GET');
      const token = CsrfMiddleware.getToken(req);
      expect(token).toBeNull();
    });

    it('should return token for valid session', () => {
      const middleware = CsrfMiddleware.protect();
      const req = mockRequest('GET', {}, {}, { _sessionId: 'test-get-token' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      const token = CsrfMiddleware.getToken(req);
      expect(token).toBe((res as any).locals.csrfToken);
    });
  });

  describe('cleanupExpiredTokens() method', () => {
    it('should clean up expired tokens', (done) => {
      const middleware = CsrfMiddleware.protect();
      
      // Generate a token
      const req = mockRequest('GET', {}, {}, { _sessionId: 'test-cleanup' });
      const res = mockResponse();
      middleware(req, res, mockNext);

      // Verify token exists
      let token = CsrfMiddleware.getToken(req);
      expect(token).not.toBeNull();

      // Manually set token to be expired by modifying the internal map
      // This is a bit of a hack, but necessary for testing
      const tokens = (CsrfMiddleware as any).tokens;
      const tokenData = tokens.get('test-cleanup');
      if (tokenData) {
        tokenData.expires = Date.now() - 1000; // 1 second ago
        tokens.set('test-cleanup', tokenData);
      }

      // Clean up expired tokens
      CsrfMiddleware.cleanupExpiredTokens();

      // Verify token is removed
      setTimeout(() => {
        token = CsrfMiddleware.getToken(req);
        expect(token).toBeNull();
        done();
      }, 10);
    });
  });

  describe('clearAllTokens() method', () => {
    it('should clear all tokens', () => {
      const middleware = CsrfMiddleware.protect();
      
      // Generate some tokens
      const req1 = mockRequest('GET', {}, {}, { _sessionId: 'session1' });
      const res1 = mockResponse();
      middleware(req1, res1, mockNext);

      const req2 = mockRequest('GET', {}, {}, { _sessionId: 'session2' });
      const res2 = mockResponse();
      middleware(req2, res2, mockNext);

      // Verify tokens exist
      expect(CsrfMiddleware.getToken(req1)).not.toBeNull();
      expect(CsrfMiddleware.getToken(req2)).not.toBeNull();

      // Clear all tokens
      CsrfMiddleware.clearAllTokens();

      // Verify tokens are cleared
      expect(CsrfMiddleware.getToken(req1)).toBeNull();
      expect(CsrfMiddleware.getToken(req2)).toBeNull();
    });
  });
});