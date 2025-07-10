/**
 * @fileoverview CSRF protection middleware for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { SecurityMiddleware, CsrfOptions } from './interfaces';

/**
 * CSRF protection middleware class
 */
export class CsrfMiddleware {
  private static tokens = new Map<string, { token: string; expires: number }>();

  /**
   * Clear all stored tokens (for testing purposes)
   */
  static clearAllTokens(): void {
    this.tokens.clear();
  }

  /**
   * CSRF protection middleware
   */
  static protect(options: CsrfOptions = {}): SecurityMiddleware {
    const {
      cookie = {
        name: '_csrf',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      },
      headerName = 'x-csrf-token',
      fieldName = '_csrf',
      secret = crypto.randomBytes(32).toString('hex'),
      tokenLength = 32
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF check for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Generate and set CSRF token for safe methods
        const token = this.generateToken(secret, tokenLength);
        const sessionId = this.getOrCreateSessionId(req, res);
        
        this.tokens.set(sessionId, {
          token,
          expires: Date.now() + 3600000 // 1 hour
        });

        // Set token in cookie
        res.cookie(cookie.name!, token, {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite
        });

        // Expose token to templates/frontend
        res.locals.csrfToken = token;
        
        return next();
      }

      // Verify CSRF token for unsafe methods
      const sessionId = this.getOrCreateSessionId(req, res);
      const storedTokenData = this.tokens.get(sessionId);

      if (!storedTokenData) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token not found'
        });
      }

      // Check if token has expired
      if (Date.now() > storedTokenData.expires) {
        this.tokens.delete(sessionId);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token expired'
        });
      }

      // Get token from request
      const requestToken = req.headers[headerName] as string ||
                          req.body?.[fieldName] ||
                          req.query[fieldName];

      if (!requestToken) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token required'
        });
      }

      // Verify token
      if (!this.verifyToken(requestToken, storedTokenData.token)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid CSRF token'
        });
      }

      next();
    };
  }

  /**
   * Generate a CSRF token
   */
  private static generateToken(secret: string, length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify CSRF token
   */
  private static verifyToken(requestToken: string, storedToken: string): boolean {
    if (requestToken.length !== storedToken.length) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    let result = 0;
    for (let i = 0; i < requestToken.length; i++) {
      result |= requestToken.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get or create session ID for CSRF token storage
   */
  private static getOrCreateSessionId(req: Request, res: Response): string {
    let sessionId = req.cookies?._sessionId || req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      res.cookie('_sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }

    return sessionId;
  }

  /**
   * Clean up expired tokens
   */
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }

  /**
   * Get CSRF token for current session
   */
  static getToken(req: Request): string | null {
    const sessionId = req.cookies?._sessionId || req.headers['x-session-id'] as string;
    if (!sessionId) return null;

    const tokenData = this.tokens.get(sessionId);
    return tokenData && Date.now() <= tokenData.expires ? tokenData.token : null;
  }
}

// Cleanup expired tokens every hour
setInterval(() => {
  CsrfMiddleware.cleanupExpiredTokens();
}, 3600000);
