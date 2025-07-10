/**
 * @fileoverview Main security module export file for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

// Export interfaces
export * from './interfaces';

// Export core security middleware
export { SecurityMiddlewareCore } from './security.middleware';

// Export authentication middleware
export { AuthMiddleware, JwtUtils } from './auth.middleware';

// Export authorization middleware
export { AuthorizationMiddleware, AuthDecorators } from './authorization.middleware';

// Export CSRF protection
export { CsrfMiddleware } from './csrf.middleware';

// Import classes for Security object
import { SecurityMiddlewareCore } from './security.middleware';
import { AuthMiddleware } from './auth.middleware';
import { AuthorizationMiddleware } from './authorization.middleware';
import { CsrfMiddleware } from './csrf.middleware';

// Convenience exports for common patterns
export const Security = {
  // Core security
  cors: SecurityMiddlewareCore.cors,
  rateLimit: SecurityMiddlewareCore.rateLimit,
  securityHeaders: SecurityMiddlewareCore.securityHeaders,
  requestValidation: SecurityMiddlewareCore.requestValidation,
  noSniff: SecurityMiddlewareCore.noSniff,
  hidePoweredBy: SecurityMiddlewareCore.hidePoweredBy,
  dnsPrefetchControl: SecurityMiddlewareCore.dnsPrefetchControl,
  ieNoOpen: SecurityMiddlewareCore.ieNoOpen,

  // Authentication
  jwt: AuthMiddleware.jwt,
  optionalJwt: AuthMiddleware.optionalJwt,
  basicAuth: AuthMiddleware.basicAuth,
  apiKey: AuthMiddleware.apiKey,
  session: AuthMiddleware.session,
  generateToken: AuthMiddleware.generateToken,

  // Authorization
  requireRoles: AuthorizationMiddleware.requireRoles,
  requirePermissions: AuthorizationMiddleware.requirePermissions,
  rbac: AuthorizationMiddleware.rbac,
  requireOwnership: AuthorizationMiddleware.requireOwnership,
  requireAdmin: AuthorizationMiddleware.requireAdmin,
  requireSuperuser: AuthorizationMiddleware.requireSuperuser,
  conditional: AuthorizationMiddleware.conditional,
  combineAnd: AuthorizationMiddleware.combineAnd,
  combineOr: AuthorizationMiddleware.combineOr,

  // CSRF Protection
  csrf: CsrfMiddleware.protect,
  getCsrfToken: CsrfMiddleware.getToken
};

// Factory for common security configurations
export class SecurityFactory {
  /**
   * Basic security setup for most applications
   */
  static basic() {
    return [
      SecurityMiddlewareCore.hidePoweredBy(),
      SecurityMiddlewareCore.noSniff(),
      SecurityMiddlewareCore.securityHeaders(),
      SecurityMiddlewareCore.cors()
    ];
  }

  /**
   * Enhanced security setup for production
   */
  static enhanced(options: {
    rateLimit?: { windowMs: number; max: number };
    cors?: any;
    csrf?: boolean;
  } = {}) {
    const middleware = [
      SecurityMiddlewareCore.hidePoweredBy(),
      SecurityMiddlewareCore.noSniff(),
      SecurityMiddlewareCore.dnsPrefetchControl(false),
      SecurityMiddlewareCore.ieNoOpen(),
      SecurityMiddlewareCore.securityHeaders({
        contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
      }),
      SecurityMiddlewareCore.requestValidation()
    ];

    if (options.rateLimit) {
      middleware.push(SecurityMiddlewareCore.rateLimit(options.rateLimit));
    }

    if (options.cors) {
      middleware.push(SecurityMiddlewareCore.cors(options.cors));
    }

    if (options.csrf) {
      middleware.push(CsrfMiddleware.protect());
    }

    return middleware;
  }

  /**
   * API-focused security setup
   */
  static api(options: {
    rateLimit?: { windowMs: number; max: number };
    cors?: any;
    auth?: 'jwt' | 'apikey' | 'basic';
    authConfig?: any;
  } = {}) {
    const middleware = [
      SecurityMiddlewareCore.hidePoweredBy(),
      SecurityMiddlewareCore.noSniff(),
      SecurityMiddlewareCore.securityHeaders({
        frameOptions: false, // APIs don't need frame protection
        contentSecurityPolicy: false // APIs don't serve HTML
      }),
      SecurityMiddlewareCore.requestValidation({
        allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded']
      })
    ];

    if (options.rateLimit) {
      middleware.push(SecurityMiddlewareCore.rateLimit(options.rateLimit));
    }

    if (options.cors) {
      middleware.push(SecurityMiddlewareCore.cors(options.cors));
    }

    // Add authentication based on type
    if (options.auth && options.authConfig) {
      switch (options.auth) {
        case 'jwt':
          middleware.push(AuthMiddleware.jwt(options.authConfig));
          break;
        case 'apikey':
          middleware.push(AuthMiddleware.apiKey(options.authConfig.validator, options.authConfig.headerName));
          break;
        case 'basic':
          middleware.push(AuthMiddleware.basicAuth(options.authConfig.validator));
          break;
      }
    }

    return middleware;
  }
}
