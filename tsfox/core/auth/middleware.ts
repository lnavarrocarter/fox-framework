/**
 * @foxframework/core — Provider-agnostic auth middleware factory
 */

import type { Request, Response, NextFunction } from 'express';
import type { IAuthProvider, AuthMiddlewareOptions, AuthMiddlewareFn } from './interfaces';
import type { AuthUser } from './types';
import { TokenExpiredError, TokenInvalidError, PermissionDeniedError } from './errors';

// Augment Express Request with the resolved user
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    authToken?: string;
  }
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

function extractToken(req: Request, options: AuthMiddlewareOptions): string | null {
  const sources = options.tokenSources ?? ['header'];

  for (const source of sources) {
    if (source === 'header') {
      const headerName = options.headerName ?? 'Authorization';
      const value = req.headers[headerName.toLowerCase()] as string | undefined;
      if (value) {
        // Support "Bearer <token>" and bare token
        return value.startsWith('Bearer ') ? value.slice(7) : value;
      }
    }

    if (source === 'cookie') {
      const cookieName = options.cookieName ?? 'auth_token';
      const cookies = (req as any).cookies as Record<string, string> | undefined;
      if (cookies?.[cookieName]) return cookies[cookieName];
    }

    if (source === 'query') {
      const param = options.queryParam ?? 'token';
      const value = (req.query as Record<string, string>)[param];
      if (value) return value;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Role / permission checks
// ---------------------------------------------------------------------------

function hasRoles(user: AuthUser, roles: string[]): boolean {
  return roles.some((r) => user.roles.includes(r));
}

function hasPermissions(user: AuthUser, permissions: string[]): boolean {
  return permissions.every((p) => user.permissions.includes(p));
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates an Express middleware that validates tokens using the given
 * IAuthProvider and attaches the resolved user to req.user.
 *
 * @example
 * const jwtProvider = new JwtAuthProvider({ ... });
 * app.use('/api', createAuthMiddleware(jwtProvider));
 */
export function createAuthMiddleware(
  provider: IAuthProvider,
  options: AuthMiddlewareOptions = {},
): AuthMiddlewareFn {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req, options);

    if (!token) {
      if (options.optional) return next();
      return res.status(401).json({
        error: 'MISSING_TOKEN',
        message: 'Authentication token is required',
      });
    }

    try {
      const user = await provider.verify(token);

      // Role check (OR — user must have at least one)
      if (options.roles?.length) {
        if (!hasRoles(user, options.roles)) {
          throw new PermissionDeniedError(
            `Requires one of roles: ${options.roles.join(', ')}`,
          );
        }
      }

      // Permission check (AND — user must have all)
      if (options.permissions?.length) {
        if (!hasPermissions(user, options.permissions)) {
          throw new PermissionDeniedError(
            `Requires permissions: ${options.permissions.join(', ')}`,
          );
        }
      }

      req.user = user;
      req.authToken = token;
      next();
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({ error: err.code, message: err.message });
      }
      if (err instanceof TokenInvalidError) {
        return res.status(401).json({ error: err.code, message: err.message });
      }
      if (err instanceof PermissionDeniedError) {
        return res.status(403).json({ error: err.code, message: err.message });
      }
      // Unknown error — don't leak details
      return res.status(401).json({ error: 'AUTH_FAILED', message: 'Authentication failed' });
    }
  };
}

/**
 * Shorthand: optional auth — sets req.user if token present, never blocks.
 */
export function createOptionalAuthMiddleware(
  provider: IAuthProvider,
  options: Omit<AuthMiddlewareOptions, 'optional'> = {},
): AuthMiddlewareFn {
  return createAuthMiddleware(provider, { ...options, optional: true });
}

/**
 * Shorthand: require specific roles.
 */
export function requireRoles(
  provider: IAuthProvider,
  roles: string[],
  options: Omit<AuthMiddlewareOptions, 'roles'> = {},
): AuthMiddlewareFn {
  return createAuthMiddleware(provider, { ...options, roles });
}

/**
 * Shorthand: require specific permissions.
 */
export function requirePermissions(
  provider: IAuthProvider,
  permissions: string[],
  options: Omit<AuthMiddlewareOptions, 'permissions'> = {},
): AuthMiddlewareFn {
  return createAuthMiddleware(provider, { ...options, permissions });
}
