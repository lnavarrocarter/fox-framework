# 🛡️ Task 06: Sistema de Seguridad y Middleware

## 📋 Información General

- **ID**: 06
- **Título**: Implementar Sistema de Seguridad y Middleware
- **Prioridad**: 🔴 Crítica
- **Estimación**: 6-8 horas
- **Asignado**: Developer
- **Estado**: ✅ Completado

## 🎯 Objetivo

Implementar un sistema robusto de middleware de seguridad que proteja la aplicación contra las vulnerabilidades más comunes y proporcione herramientas de autenticación y autorización.

## 📄 Descripción

El framework necesita un sistema de middleware de seguridad integrado que incluya protecciones contra ataques comunes (CORS, CSRF, XSS, etc.) y facilite la implementación de autenticación y autorización.

## ✅ Criterios de Aceptación

### 1. Middleware de Seguridad Core
- [x] CORS middleware configurable
- [x] Helmet.js integration para headers de seguridad
- [x] Rate limiting middleware
- [x] Body parser con validación de tamaño
- [x] CSRF protection

### 2. Sistema de Autenticación
- [x] JWT middleware integrado
- [x] Session management
- [x] Basic Auth support
- [x] API Key authentication

### 3. Sistema de Autorización
- [x] Role-based access control (RBAC)
- [x] Permission-based authorization
- [x] Route protection decorators
- [x] Middleware composition

### 4. Validación de Input
- [x] Request validation middleware
- [x] Schema validation integration
- [x] Sanitization utilities
- [x] Error handling para validation

## 🛠️ Implementación

### 1. Security Middleware Core

```typescript
// tsfox/core/middleware/security.middleware.ts
import { Middleware } from '../types';

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: any) => string;
}

export class SecurityMiddleware {
  static cors(options: CorsOptions = {}): Middleware {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders = ['Content-Type', 'Authorization'],
      credentials = false,
      maxAge = 86400
    } = options;

    return (req, res, next) => {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', methods.join(', '));
      res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.header('Access-Control-Allow-Credentials', credentials.toString());
      res.header('Access-Control-Max-Age', maxAge.toString());

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }

  static helmet(): Middleware {
    return (req, res, next) => {
      // Security headers
      res.header('X-Frame-Options', 'DENY');
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.header('Content-Security-Policy', "default-src 'self'");
      
      next();
    };
  }

  static rateLimit(options: RateLimitOptions): Middleware {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req, res, next) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : req.ip;
      const now = Date.now();
      
      const requestData = requests.get(key);
      
      if (!requestData || now > requestData.resetTime) {
        requests.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        });
        return next();
      }

      if (requestData.count >= options.max) {
        return res.status(429).json({
          error: options.message || 'Too many requests',
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
        });
      }

      requestData.count++;
      next();
    };
  }
}
```

### 2. Authentication Middleware

```typescript
// tsfox/core/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';
import { Middleware } from '../types';

export interface JwtOptions {
  secret: string;
  expiresIn?: string;
  issuer?: string;
  audience?: string;
}

export interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export class AuthMiddleware {
  static jwt(options: JwtOptions): Middleware {
    return (req: any, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Access token required' 
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, options.secret, {
          issuer: options.issuer,
          audience: options.audience
        }) as any;

        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }
    };
  }

  static basicAuth(validateCredentials: (username: string, password: string) => boolean): Middleware {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.header('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username, password] = credentials.split(':');

      if (!validateCredentials(username, password)) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      req.user = { username };
      next();
    };
  }

  static apiKey(validateKey: (key: string) => boolean): Middleware {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;

      if (!apiKey || !validateKey(apiKey)) {
        return res.status(401).json({
          error: 'Valid API key required'
        });
      }

      next();
    };
  }
}
```

### 3. Authorization Middleware

```typescript
// tsfox/core/middleware/authorization.middleware.ts
import { Middleware } from '../types';

export interface AuthorizationOptions {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}

export class AuthorizationMiddleware {
  static requireRoles(roles: string[], requireAll = false): Middleware {
    return (req: any, res, next) => {
      if (!req.user || !req.user.roles) {
        return res.status(403).json({
          error: 'Access denied: No roles assigned'
        });
      }

      const userRoles = req.user.roles;
      const hasRequiredRoles = requireAll
        ? roles.every(role => userRoles.includes(role))
        : roles.some(role => userRoles.includes(role));

      if (!hasRequiredRoles) {
        return res.status(403).json({
          error: 'Access denied: Insufficient roles'
        });
      }

      next();
    };
  }

  static requirePermissions(permissions: string[], requireAll = false): Middleware {
    return (req: any, res, next) => {
      if (!req.user || !req.user.permissions) {
        return res.status(403).json({
          error: 'Access denied: No permissions assigned'
        });
      }

      const userPermissions = req.user.permissions;
      const hasRequiredPermissions = requireAll
        ? permissions.every(perm => userPermissions.includes(perm))
        : permissions.some(perm => userPermissions.includes(perm));

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          error: 'Access denied: Insufficient permissions'
        });
      }

      next();
    };
  }

  static requireOwnership(getResourceOwnerId: (req: any) => string): Middleware {
    return (req: any, res, next) => {
      if (!req.user || !req.user.id) {
        return res.status(403).json({
          error: 'Access denied: User not authenticated'
        });
      }

      const resourceOwnerId = getResourceOwnerId(req);
      const isOwner = req.user.id === resourceOwnerId;
      const isAdmin = req.user.roles?.includes('admin');

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied: Not resource owner'
        });
      }

      next();
    };
  }
}
```

### 4. Validation Middleware

```typescript
// tsfox/core/middleware/validation.middleware.ts
import { Middleware } from '../types';

export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ValidationMiddleware {
  static validateBody(schema: ValidationSchema): Middleware {
    return (req, res, next) => {
      const errors = this.validate(req.body, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      next();
    };
  }

  static validateQuery(schema: ValidationSchema): Middleware {
    return (req, res, next) => {
      const errors = this.validate(req.query, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Query validation failed',
          details: errors
        });
      }

      next();
    };
  }

  static validateParams(schema: ValidationSchema): Middleware {
    return (req, res, next) => {
      const errors = this.validate(req.params, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          details: errors
        });
      }

      next();
    };
  }

  private static validate(data: any, schema: ValidationSchema): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required validation
      if (rules.required && (value === undefined || value === null)) {
        errors.push({
          field,
          message: `${field} is required`,
          value
        });
        continue;
      }

      // Skip other validations if value is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateType(value, rules.type)) {
        errors.push({
          field,
          message: `${field} must be of type ${rules.type}`,
          value
        });
        continue;
      }

      // Length/range validation
      if (rules.min !== undefined && this.getLength(value) < rules.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rules.min}`,
          value
        });
      }

      if (rules.max !== undefined && this.getLength(value) > rules.max) {
        errors.push({
          field,
          message: `${field} must be at most ${rules.max}`,
          value
        });
      }

      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          value
        });
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rules.enum.join(', ')}`,
          value
        });
      }

      // Custom validation
      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          errors.push({
            field,
            message: typeof result === 'string' ? result : `${field} is invalid`,
            value
          });
        }
      }
    }

    return errors;
  }

  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && !Array.isArray(value);
      default: return false;
    }
  }

  private static getLength(value: any): number {
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'number') {
      return value;
    }
    return 0;
  }
}
```

### 5. Middleware Composition

```typescript
// tsfox/core/middleware/composer.middleware.ts
import { Middleware } from '../types';

export class MiddlewareComposer {
  static compose(...middlewares: Middleware[]): Middleware {
    return (req, res, next) => {
      let index = 0;

      const dispatch = (i: number): void => {
        if (i <= index) {
          throw new Error('next() called multiple times');
        }
        
        index = i;
        
        if (i >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[i];
        
        try {
          middleware(req, res, () => dispatch(i + 1));
        } catch (error) {
          next(error);
        }
      };

      dispatch(0);
    };
  }

  static conditional(condition: (req: any) => boolean, middleware: Middleware): Middleware {
    return (req, res, next) => {
      if (condition(req)) {
        middleware(req, res, next);
      } else {
        next();
      }
    };
  }

  static unless(condition: (req: any) => boolean, middleware: Middleware): Middleware {
    return this.conditional(req => !condition(req), middleware);
  }
}
```

## 🧪 Plan de Testing

### 1. Security Middleware Tests

```typescript
// Tests para CORS, Rate Limiting, etc.
describe('SecurityMiddleware', () => {
  describe('cors', () => {
    it('should set CORS headers correctly');
    it('should handle preflight requests');
    it('should respect origin restrictions');
  });

  describe('rateLimit', () => {
    it('should allow requests within limit');
    it('should block requests exceeding limit');
    it('should reset counter after window');
  });
});
```

### 2. Authentication Tests

```typescript
describe('AuthMiddleware', () => {
  describe('jwt', () => {
    it('should validate valid JWT tokens');
    it('should reject invalid tokens');
    it('should handle expired tokens');
  });
});
```

## 📊 Definición de Done

- [x] Todos los middleware de seguridad implementados
- [x] Tests unitarios con >85% cobertura
- [x] Documentación completa de APIs
- [x] Ejemplos de uso incluidos
- [x] Integration tests funcionando
- [x] Performance benchmarks establecidos

## 🔗 Dependencias

- **Depende de**: Task 01 (Dependencies), Task 02 (Tests)
- **Bloqueante para**: Task 07 (Validation), Task 08 (Performance)
- **Relacionada con**: Task 03 (Error Handling)

## 📚 Referencias

- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
