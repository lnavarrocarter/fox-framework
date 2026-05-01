/**
 * @foxframework/core — Auth Errors
 */

export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message, 'INVALID_CREDENTIALS', 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

export class TokenInvalidError extends AuthError {
  constructor(message = 'Token is invalid') {
    super(message, 'TOKEN_INVALID', 401);
    this.name = 'TokenInvalidError';
  }
}

export class MfaRequiredError extends AuthError {
  constructor(message = 'Multi-factor authentication required') {
    super(message, 'MFA_REQUIRED', 403);
    this.name = 'MfaRequiredError';
  }
}

export class MfaInvalidCodeError extends AuthError {
  constructor(message = 'Invalid or expired MFA code') {
    super(message, 'MFA_INVALID_CODE', 401);
    this.name = 'MfaInvalidCodeError';
  }
}

export class AccountLockedError extends AuthError {
  constructor(message = 'Account is locked') {
    super(message, 'ACCOUNT_LOCKED', 403);
    this.name = 'AccountLockedError';
  }
}

export class AccountNotFoundError extends AuthError {
  constructor(message = 'Account not found') {
    super(message, 'ACCOUNT_NOT_FOUND', 404);
    this.name = 'AccountNotFoundError';
  }
}

export class OAuthError extends AuthError {
  constructor(message: string, code = 'OAUTH_ERROR') {
    super(message, code, 401);
    this.name = 'OAuthError';
  }
}

export class DirectoryError extends AuthError {
  constructor(message: string, code = 'DIRECTORY_ERROR') {
    super(message, code, 503);
    this.name = 'DirectoryError';
  }
}

export class PermissionDeniedError extends AuthError {
  constructor(message = 'Permission denied') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionDeniedError';
  }
}
