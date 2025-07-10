/**
 * @fileoverview Security middleware interfaces for Fox Framework
 * @version 1.0.0
 * @author Fox Framework Team
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Base middleware function type
 */
export type SecurityMiddleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allowed origins - can be string, array of strings, boolean, or function */
  origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Whether to allow credentials */
  credentials?: boolean;
  /** Preflight cache duration in seconds */
  maxAge?: number;
  /** Headers exposed to the client */
  exposedHeaders?: string[];
  /** Whether to pass the CORS preflight response to the next handler */
  preflightContinue?: boolean;
  /** Status code for successful OPTIONS requests */
  optionsSuccessStatus?: number;
}

/**
 * Rate limiting configuration options
 */
export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  max: number;
  /** Error message when rate limit is exceeded */
  message?: string;
  /** Function to generate key for rate limiting */
  keyGenerator?: (req: Request) => string;
  /** Function to skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  /** Headers to send with rate limit info */
  standardHeaders?: boolean;
  /** Legacy headers support */
  legacyHeaders?: boolean;
}

/**
 * JWT authentication options
 */
export interface JwtOptions {
  /** JWT secret key */
  secret: string;
  /** Token expiration time */
  expiresIn?: string;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string;
  /** Algorithm for JWT signing */
  algorithm?: string;
  /** Whether to ignore expiration */
  ignoreExpiration?: boolean;
}

/**
 * User interface for authentication
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email */
  email: string;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** Additional user data */
  [key: string]: any;
}

/**
 * Basic authentication credentials validator
 */
export type BasicAuthValidator = (username: string, password: string) => boolean | Promise<boolean>;

/**
 * API key validator function
 */
export type ApiKeyValidator = (apiKey: string) => boolean | Promise<boolean>;

/**
 * Session options
 */
export interface SessionOptions {
  /** Session secret */
  secret: string;
  /** Session name */
  name?: string;
  /** Session store */
  store?: any;
  /** Cookie options */
  cookie?: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  };
  /** Whether to save uninitialized sessions */
  saveUninitialized?: boolean;
  /** Whether to save session on every request */
  resave?: boolean;
}

/**
 * Role-based access control options
 */
export interface RbacOptions {
  /** Required roles */
  roles?: string[];
  /** Required permissions */
  permissions?: string[];
  /** Whether user needs all roles or just one */
  requireAll?: boolean;
  /** Custom authorization function */
  authorize?: (user: User, req: Request) => boolean | Promise<boolean>;
}

/**
 * CSRF protection options
 */
export interface CsrfOptions {
  /** Cookie options for CSRF token */
  cookie?: {
    name?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  };
  /** Header name for CSRF token */
  headerName?: string;
  /** Field name for CSRF token in forms */
  fieldName?: string;
  /** Secret for generating tokens */
  secret?: string;
  /** Token length */
  tokenLength?: number;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersOptions {
  /** Content Security Policy */
  contentSecurityPolicy?: string | false;
  /** X-Frame-Options */
  frameOptions?: 'deny' | 'sameorigin' | false;
  /** X-Content-Type-Options */
  contentTypeOptions?: boolean;
  /** X-XSS-Protection */
  xssProtection?: boolean;
  /** Strict-Transport-Security */
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  } | false;
  /** Referrer-Policy */
  referrerPolicy?: string | false;
}

/**
 * Request validation options
 */
export interface RequestValidationOptions {
  /** Maximum request body size */
  maxBodySize?: string | number;
  /** Allowed content types */
  allowedContentTypes?: string[];
  /** Maximum URL length */
  maxUrlLength?: number;
  /** Maximum header size */
  maxHeaderSize?: number;
}
