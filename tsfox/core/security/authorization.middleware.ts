/**
 * @fileoverview Authorization middleware for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware, User, RbacOptions } from './interfaces';

/**
 * Authorization middleware class for role and permission-based access control
 */
export class AuthorizationMiddleware {
  /**
   * Role-based access control middleware
   */
  static requireRoles(roles: string[], requireAll: boolean = false): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (!user.roles || !Array.isArray(user.roles)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User has no roles assigned'
        });
      }

      const hasRequiredRoles = requireAll
        ? roles.every(role => user.roles.includes(role))
        : roles.some(role => user.roles.includes(role));

      if (!hasRequiredRoles) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Required roles: ${roles.join(requireAll ? ' AND ' : ' OR ')}`
        });
      }

      next();
    };
  }

  /**
   * Permission-based access control middleware
   */
  static requirePermissions(permissions: string[], requireAll: boolean = false): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (!user.permissions || !Array.isArray(user.permissions)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User has no permissions assigned'
        });
      }

      const hasRequiredPermissions = requireAll
        ? permissions.every(permission => user.permissions.includes(permission))
        : permissions.some(permission => user.permissions.includes(permission));

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Required permissions: ${permissions.join(requireAll ? ' AND ' : ' OR ')}`
        });
      }

      next();
    };
  }

  /**
   * Combined RBAC middleware with custom authorization function
   */
  static rbac(options: RbacOptions): SecurityMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      try {
        let authorized = true;

        // Check roles
        if (options.roles && options.roles.length > 0) {
          if (!user.roles || !Array.isArray(user.roles)) {
            authorized = false;
          } else {
            const hasRequiredRoles = options.requireAll
              ? options.roles.every(role => user.roles.includes(role))
              : options.roles.some(role => user.roles.includes(role));
            
            if (!hasRequiredRoles) {
              authorized = false;
            }
          }
        }

        // Check permissions
        if (authorized && options.permissions && options.permissions.length > 0) {
          if (!user.permissions || !Array.isArray(user.permissions)) {
            authorized = false;
          } else {
            const hasRequiredPermissions = options.requireAll
              ? options.permissions.every(permission => user.permissions.includes(permission))
              : options.permissions.some(permission => user.permissions.includes(permission));
            
            if (!hasRequiredPermissions) {
              authorized = false;
            }
          }
        }

        // Custom authorization function
        if (authorized && options.authorize) {
          authorized = await options.authorize(user, req);
        }

        if (!authorized) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authorization check failed'
        });
      }
    };
  }

  /**
   * Owner-based access control (check if user owns the resource)
   */
  static requireOwnership(getResourceUserId: (req: Request) => string | Promise<string>): SecurityMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      try {
        const resourceUserId = await getResourceUserId(req);
        
        if (user.id !== resourceUserId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied. You can only access your own resources'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Ownership check failed'
        });
      }
    };
  }

  /**
   * Admin-only access middleware
   */
  static requireAdmin(): SecurityMiddleware {
    return this.requireRoles(['admin']);
  }

  /**
   * Superuser-only access middleware
   */
  static requireSuperuser(): SecurityMiddleware {
    return this.requireRoles(['superuser', 'admin']);
  }

  /**
   * Conditional authorization based on custom logic
   */
  static conditional(
    condition: (user: User, req: Request) => boolean | Promise<boolean>,
    errorMessage: string = 'Access denied'
  ): SecurityMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      try {
        const authorized = await condition(user, req);

        if (!authorized) {
          return res.status(403).json({
            error: 'Forbidden',
            message: errorMessage
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authorization check failed'
        });
      }
    };
  }

  /**
   * Combine multiple authorization middlewares with AND logic
   */
  static combineAnd(...middlewares: SecurityMiddleware[]): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      let index = 0;

      const runNext = (error?: any) => {
        if (error) return next(error);
        
        if (index >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      };

      runNext();
    };
  }

  /**
   * Combine multiple authorization middlewares with OR logic
   */
  static combineOr(...middlewares: SecurityMiddleware[]): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      let index = 0;
      let lastError: any = null;

      const runNext = (error?: any) => {
        if (!error) {
          // If one succeeds, continue
          return next();
        }

        lastError = error;
        
        if (index >= middlewares.length) {
          // All failed, return the last error
          return next(lastError);
        }

        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      };

      runNext(new Error('Starting OR chain'));
    };
  }
}

/**
 * Decorators for route authorization (experimental)
 */
export namespace AuthDecorators {
  /**
   * Require specific roles decorator
   */
  export function RequireRoles(roles: string[], requireAll: boolean = false) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(req: Request, res: Response, next: NextFunction) {
        const middleware = AuthorizationMiddleware.requireRoles(roles, requireAll);
        middleware(req, res, (error?: any) => {
          if (error) return next(error);
          return originalMethod.call(this, req, res, next);
        });
      };
      
      return descriptor;
    };
  }

  /**
   * Require specific permissions decorator
   */
  export function RequirePermissions(permissions: string[], requireAll: boolean = false) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(req: Request, res: Response, next: NextFunction) {
        const middleware = AuthorizationMiddleware.requirePermissions(permissions, requireAll);
        middleware(req, res, (error?: any) => {
          if (error) return next(error);
          return originalMethod.call(this, req, res, next);
        });
      };
      
      return descriptor;
    };
  }

  /**
   * Admin only decorator
   */
  export function AdminOnly() {
    return RequireRoles(['admin']);
  }
}
