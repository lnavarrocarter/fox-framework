/**
 * @fileoverview Tests for authentication middleware
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { AuthMiddleware, JwtUtils } from '../auth.middleware';
import { JwtOptions } from '../interfaces';

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/',
  headers: {},
  cookies: {},
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const mockResponse = {
    header: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis()
  };
  return mockResponse;
};

const createMockNext = () => jest.fn();

describe('AuthMiddleware', () => {
  describe('jwt', () => {
    const jwtOptions: JwtOptions = {
      secret: 'test-secret',
      expiresIn: '1h',
      issuer: 'test-issuer'
    };

    it('should reject requests without authorization header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.jwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Access token required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid authorization format', () => {
      const req = createMockRequest({
        headers: { authorization: 'Invalid token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.jwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Access token required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid JWT token', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.jwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token', () => {
      const payload = { id: '123', email: 'test@example.com', roles: ['user'] };
      const token = JwtUtils.createToken(payload, jwtOptions.secret, jwtOptions);
      
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.jwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(req.user).toMatchObject(payload);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalJwt', () => {
    const jwtOptions: JwtOptions = {
      secret: 'test-secret'
    };

    it('should continue without user when no token provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.optionalJwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set user when valid token provided', () => {
      const payload = { id: '123', email: 'test@example.com' };
      const token = JwtUtils.createToken(payload, jwtOptions.secret);
      
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.optionalJwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(req.user).toMatchObject(payload);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.optionalJwt(jwtOptions);
      middleware(req as Request, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('basicAuth', () => {
    const validateCredentials = jest.fn();

    beforeEach(() => {
      validateCredentials.mockClear();
    });

    it('should reject requests without authorization header', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.basicAuth(validateCredentials);
      await middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Secure Area"');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid basic auth format', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer token' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.basicAuth(validateCredentials);
      await middleware(req as Request, res as Response, next);

      expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Secure Area"');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid credentials', async () => {
      validateCredentials.mockResolvedValue(false);
      
      const credentials = Buffer.from('user:password').toString('base64');
      const req = createMockRequest({
        headers: { authorization: `Basic ${credentials}` }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.basicAuth(validateCredentials);
      await middleware(req as Request, res as Response, next);

      expect(validateCredentials).toHaveBeenCalledWith('user', 'password');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid credentials', async () => {
      validateCredentials.mockResolvedValue(true);
      
      const credentials = Buffer.from('user:password').toString('base64');
      const req = createMockRequest({
        headers: { authorization: `Basic ${credentials}` }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.basicAuth(validateCredentials);
      await middleware(req as Request, res as Response, next);

      expect(validateCredentials).toHaveBeenCalledWith('user', 'password');
      expect(req.user).toMatchObject({
        id: 'user',
        email: 'user',
        roles: [],
        permissions: []
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle malformed credentials', async () => {
      const credentials = Buffer.from('usernopassword').toString('base64');
      const req = createMockRequest({
        headers: { authorization: `Basic ${credentials}` }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.basicAuth(validateCredentials);
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('apiKey', () => {
    const validateApiKey = jest.fn();

    beforeEach(() => {
      validateApiKey.mockClear();
    });

    it('should reject requests without API key', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.apiKey(validateApiKey);
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'API key required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid API key', async () => {
      validateApiKey.mockResolvedValue(false);
      
      const req = createMockRequest({
        headers: { 'x-api-key': 'invalid-key' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.apiKey(validateApiKey);
      await middleware(req as Request, res as Response, next);

      expect(validateApiKey).toHaveBeenCalledWith('invalid-key');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Invalid API key'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid API key', async () => {
      validateApiKey.mockResolvedValue(true);
      
      const req = createMockRequest({
        headers: { 'x-api-key': 'valid-key' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.apiKey(validateApiKey);
      await middleware(req as Request, res as Response, next);

      expect(validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(req.user).toMatchObject({
        id: 'valid-key',
        email: '',
        roles: ['api'],
        permissions: []
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use custom header name', async () => {
      validateApiKey.mockResolvedValue(true);
      
      const req = createMockRequest({
        headers: { 'authorization': 'api-key-value' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthMiddleware.apiKey(validateApiKey, 'authorization');
      await middleware(req as Request, res as Response, next);

      expect(validateApiKey).toHaveBeenCalledWith('api-key-value');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { id: '123', email: 'test@example.com' };
      const options: JwtOptions = {
        secret: 'test-secret',
        expiresIn: '1h'
      };

      const token = AuthMiddleware.generateToken(payload, options);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      // Verify the token can be decoded
      const decoded = JwtUtils.verifyToken(token, options.secret, options);
      expect(decoded).toMatchObject(payload);
    });
  });
});

describe('JwtUtils', () => {
  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const payload = { id: '123', name: 'test' };
      const secret = 'test-secret';
      
      const token = JwtUtils.createToken(payload, secret);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include expiration when specified', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      const options = { expiresIn: '1h' };
      
      const token = JwtUtils.createToken(payload, secret, options);
      const decoded = JwtUtils.verifyToken(token, secret);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should include issuer and audience when specified', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      const options = {
        issuer: 'test-issuer',
        audience: 'test-audience'
      };
      
      const token = JwtUtils.createToken(payload, secret, options);
      const decoded = JwtUtils.verifyToken(token, secret);
      
      expect(decoded.iss).toBe('test-issuer');
      expect(decoded.aud).toBe('test-audience');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { id: '123', name: 'test' };
      const secret = 'test-secret';
      
      const token = JwtUtils.createToken(payload, secret);
      const decoded = JwtUtils.verifyToken(token, secret);
      
      expect(decoded).toMatchObject(payload);
    });

    it('should reject tokens with invalid signature', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      const wrongSecret = 'wrong-secret';
      
      const token = JwtUtils.createToken(payload, secret);
      
      expect(() => {
        JwtUtils.verifyToken(token, wrongSecret);
      }).toThrow('Invalid signature');
    });

    it('should reject expired tokens', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      const options = { expiresIn: '1s' };
      
      const token = JwtUtils.createToken(payload, secret, options);
      
      // Wait for token to expire
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);
      
      expect(() => {
        JwtUtils.verifyToken(token, secret);
      }).toThrow('Token expired');
      
      jest.useRealTimers();
    });

    it('should reject tokens with wrong issuer', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      
      const token = JwtUtils.createToken(payload, secret, { issuer: 'issuer1' });
      
      expect(() => {
        JwtUtils.verifyToken(token, secret, { issuer: 'issuer2' });
      }).toThrow('Invalid issuer');
    });

    it('should reject tokens with wrong audience', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      
      const token = JwtUtils.createToken(payload, secret, { audience: 'audience1' });
      
      expect(() => {
        JwtUtils.verifyToken(token, secret, { audience: 'audience2' });
      }).toThrow('Invalid audience');
    });

    it('should reject malformed tokens', () => {
      const secret = 'test-secret';
      
      expect(() => {
        JwtUtils.verifyToken('invalid.token', secret);
      }).toThrow('Invalid token format');
      
      expect(() => {
        JwtUtils.verifyToken('invalid', secret);
      }).toThrow('Invalid token format');
    });

    it('should ignore expiration when ignoreExpiration is true', () => {
      const payload = { id: '123' };
      const secret = 'test-secret';
      const options = { expiresIn: '1s' };
      
      const token = JwtUtils.createToken(payload, secret, options);
      
      // Wait for token to expire
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);
      
      const decoded = JwtUtils.verifyToken(token, secret, { ignoreExpiration: true });
      expect(decoded).toMatchObject(payload);
      
      jest.useRealTimers();
    });
  });
});
