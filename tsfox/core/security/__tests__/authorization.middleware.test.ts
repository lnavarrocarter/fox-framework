/**
 * @fileoverview Tests for authorization middleware
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { AuthorizationMiddleware } from '../authorization.middleware';
import { User, RbacOptions } from '../interfaces';

// Extended Request interface with user property
interface RequestWithUser extends Request {
  user?: User;
}

// Mock Express objects
const createMockRequest = (overrides: Partial<RequestWithUser> = {}): Partial<RequestWithUser> => ({
  method: 'GET',
  url: '/',
  headers: {},
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return mockResponse;
};

const createMockNext = () => jest.fn();

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  email: 'test@example.com',
  roles: ['user'],
  permissions: ['read'],
  ...overrides
});

describe('AuthorizationMiddleware', () => {
  describe('requireRoles', () => {
    it('should reject requests without user', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject users without roles', () => {
      const user = createMockUser({ roles: undefined as any });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'User has no roles assigned'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with required role (OR logic)', () => {
      const user = createMockUser({ roles: ['admin', 'user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin', 'manager']);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users without required role (OR logic)', () => {
      const user = createMockUser({ roles: ['user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin', 'manager']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied. Required roles: admin OR manager'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with all required roles (AND logic)', () => {
      const user = createMockUser({ roles: ['admin', 'manager', 'user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin', 'manager'], true);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users missing any required role (AND logic)', () => {
      const user = createMockUser({ roles: ['admin', 'user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireRoles(['admin', 'manager'], true);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied. Required roles: admin AND manager'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermissions', () => {
    it('should reject requests without user', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requirePermissions(['write']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject users without permissions', () => {
      const user = createMockUser({ permissions: undefined as any });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requirePermissions(['write']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'User has no permissions assigned'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with required permission', () => {
      const user = createMockUser({ permissions: ['read', 'write'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requirePermissions(['write']);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users without required permission', () => {
      const user = createMockUser({ permissions: ['read'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requirePermissions(['write', 'delete']);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied. Required permissions: write OR delete'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rbac', () => {
    it('should handle combined role and permission checks', async () => {
      const user = createMockUser({ 
        roles: ['admin'], 
        permissions: ['read', 'write'] 
      });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const options: RbacOptions = {
        roles: ['admin'],
        permissions: ['write'],
        requireAll: false
      };

      const middleware = AuthorizationMiddleware.rbac(options);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call custom authorize function', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const mockAuthorize = jest.fn().mockResolvedValue(true);
      const options: RbacOptions = {
        authorize: mockAuthorize
      };

      const middleware = AuthorizationMiddleware.rbac(options);
      await middleware(req as Request, res as Response, next);

      expect(mockAuthorize).toHaveBeenCalledWith(user, req);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject when custom authorize function returns false', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const mockAuthorize = jest.fn().mockResolvedValue(false);
      const options: RbacOptions = {
        authorize: mockAuthorize
      };

      const middleware = AuthorizationMiddleware.rbac(options);
      await middleware(req as Request, res as Response, next);

      expect(mockAuthorize).toHaveBeenCalledWith(user, req);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authorize function errors', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const mockAuthorize = jest.fn().mockRejectedValue(new Error('Authorization error'));
      const options: RbacOptions = {
        authorize: mockAuthorize
      };

      const middleware = AuthorizationMiddleware.rbac(options);
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Authorization check failed'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access when user owns the resource', async () => {
      const user = createMockUser({ id: '123' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const getResourceUserId = jest.fn().mockResolvedValue('123');
      const middleware = AuthorizationMiddleware.requireOwnership(getResourceUserId);
      await middleware(req as Request, res as Response, next);

      expect(getResourceUserId).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject access when user does not own the resource', async () => {
      const user = createMockUser({ id: '123' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const getResourceUserId = jest.fn().mockResolvedValue('456');
      const middleware = AuthorizationMiddleware.requireOwnership(getResourceUserId);
      await middleware(req as Request, res as Response, next);

      expect(getResourceUserId).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied. You can only access your own resources'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors in getResourceUserId', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const getResourceUserId = jest.fn().mockRejectedValue(new Error('Database error'));
      const middleware = AuthorizationMiddleware.requireOwnership(getResourceUserId);
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Ownership check failed'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', () => {
      const user = createMockUser({ roles: ['admin'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireAdmin();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject access for non-admin users', () => {
      const user = createMockUser({ roles: ['user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireAdmin();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperuser', () => {
    it('should allow access for superuser', () => {
      const user = createMockUser({ roles: ['superuser'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireSuperuser();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for admin', () => {
      const user = createMockUser({ roles: ['admin'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireSuperuser();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject access for regular users', () => {
      const user = createMockUser({ roles: ['user'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = AuthorizationMiddleware.requireSuperuser();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('conditional', () => {
    it('should allow access when condition returns true', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const condition = jest.fn().mockResolvedValue(true);
      const middleware = AuthorizationMiddleware.conditional(condition);
      await middleware(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(user, req);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject access when condition returns false', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const condition = jest.fn().mockResolvedValue(false);
      const middleware = AuthorizationMiddleware.conditional(condition, 'Custom error message');
      await middleware(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(user, req);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Custom error message'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle condition errors', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const condition = jest.fn().mockRejectedValue(new Error('Condition error'));
      const middleware = AuthorizationMiddleware.conditional(condition);
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Authorization check failed'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without user', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const condition = jest.fn();
      const middleware = AuthorizationMiddleware.conditional(condition);
      await middleware(req as Request, res as Response, next);

      expect(condition).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('combineAnd', () => {
    it('should pass when all middlewares succeed', () => {
      const user = createMockUser({ roles: ['admin'], permissions: ['write'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware1 = AuthorizationMiddleware.requireRoles(['admin']);
      const middleware2 = AuthorizationMiddleware.requirePermissions(['write']);
      const combinedMiddleware = AuthorizationMiddleware.combineAnd(middleware1, middleware2);

      combinedMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail when any middleware fails', () => {
      const user = createMockUser({ roles: ['user'], permissions: ['write'] });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware1 = AuthorizationMiddleware.requireRoles(['admin']);
      const middleware2 = AuthorizationMiddleware.requirePermissions(['write']);
      const combinedMiddleware = AuthorizationMiddleware.combineAnd(middleware1, middleware2);

      combinedMiddleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
