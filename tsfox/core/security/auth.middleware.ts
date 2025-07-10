/**
 * @fileoverview Authentication middleware for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { 
  SecurityMiddleware, 
  JwtOptions, 
  User, 
  BasicAuthValidator, 
  ApiKeyValidator,
  SessionOptions 
} from './interfaces';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
    }
  }
}

/**
 * JWT utilities
 */
class JwtUtils {
  /**
   * Create a JWT token (simplified implementation)
   */
  static createToken(payload: any, secret: string, options: Partial<JwtOptions> = {}): string {
    const header = {
      alg: options.algorithm || 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...payload,
      iat: now,
      ...(options.expiresIn && { exp: now + this.parseExpiration(options.expiresIn) }),
      ...(options.issuer && { iss: options.issuer }),
      ...(options.audience && { aud: options.audience })
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string, secret: string, options: Partial<JwtOptions> = {}): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

    // Check expiration
    if (!options.ignoreExpiration && payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Check issuer
    if (options.issuer && payload.iss !== options.issuer) {
      throw new Error('Invalid issuer');
    }

    // Check audience
    if (options.audience && payload.aud !== options.audience) {
      throw new Error('Invalid audience');
    }

    return payload;
  }

  private static base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private static base64UrlDecode(str: string): string {
    str += '='.repeat((4 - str.length % 4) % 4);
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  private static sign(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private static parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: throw new Error('Invalid expiration unit');
    }
  }
}

/**
 * Authentication middleware class
 */
export class AuthMiddleware {
  /**
   * JWT authentication middleware
   */
  static jwt(options: JwtOptions): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Access token required' 
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = JwtUtils.verifyToken(token, options.secret, options);
        req.user = decoded as User;
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Invalid or expired token'
        });
      }
    };
  }

  /**
   * Optional JWT authentication (doesn't fail if no token)
   */
  static optionalJwt(options: JwtOptions): SecurityMiddleware {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);

      try {
        const decoded = JwtUtils.verifyToken(token, options.secret, options);
        req.user = decoded as User;
      } catch (error) {
        // Silently fail for optional auth
      }

      next();
    };
  }

  /**
   * Basic authentication middleware
   */
  static basicAuth(validateCredentials: BasicAuthValidator): SecurityMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.header('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      try {
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
        const [username, password] = credentials.split(':');

        if (!username || !password) {
          throw new Error('Invalid credentials format');
        }

        const isValid = await validateCredentials(username, password);

        if (!isValid) {
          res.header('WWW-Authenticate', 'Basic realm="Secure Area"');
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid credentials'
          });
        }

        req.user = { id: username, email: username, roles: [], permissions: [] };
        next();
      } catch (error) {
        res.header('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }
    };
  }

  /**
   * API Key authentication middleware
   */
  static apiKey(validateApiKey: ApiKeyValidator, headerName: string = 'x-api-key'): SecurityMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.headers[headerName.toLowerCase()] as string;

      if (!apiKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required'
        });
      }

      try {
        const isValid = await validateApiKey(apiKey);

        if (!isValid) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
          });
        }

        req.user = { id: apiKey, email: '', roles: ['api'], permissions: [] };
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
    };
  }

  /**
   * Session-based authentication middleware
   */
  static session(options: SessionOptions): SecurityMiddleware {
    // This is a simplified session implementation
    // In production, you'd use express-session or similar
    const sessions = new Map<string, any>();

    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = req.headers['x-session-id'] as string || 
                       req.cookies?.[options.name || 'sessionId'];

      if (sessionId && sessions.has(sessionId)) {
        req.session = sessions.get(sessionId);
        req.user = req.session.user;
      } else {
        req.session = {};
      }

      // Add session save method
      req.session.save = (data: any) => {
        const newSessionId = crypto.randomUUID();
        sessions.set(newSessionId, { ...req.session, ...data });
        
        if (options.cookie) {
          res.cookie(options.name || 'sessionId', newSessionId, {
            maxAge: options.cookie.maxAge,
            httpOnly: options.cookie.httpOnly,
            secure: options.cookie.secure,
            sameSite: options.cookie.sameSite
          });
        }
      };

      next();
    };
  }

  /**
   * Generate JWT token utility
   */
  static generateToken(payload: any, options: JwtOptions): string {
    return JwtUtils.createToken(payload, options.secret, options);
  }
}

export { JwtUtils };
