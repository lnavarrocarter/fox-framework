/**
 * @foxframework/core — Auth Interfaces
 * Provider-agnostic contracts for all authentication packages.
 */

import type {
  AuthResult,
  AuthToken,
  AuthUser,
  Credentials,
  CreateUserInput,
  DirectoryFilter,
  DirectoryUser,
  MfaChallenge,
  MfaEnrollment,
  MfaMethod,
  OAuthProfile,
  OAuthTokens,
  SyncOptions,
  SyncResult,
  UpdateUserInput,
  UserStoreQuery,
} from './types';

// ---------------------------------------------------------------------------
// Core provider
// ---------------------------------------------------------------------------

/**
 * Base contract for every authentication provider.
 * Implementations: JwtAuthProvider, CognitoAuthProvider, FirebaseAuthProvider,
 * OAuthProvider, LdapAuthProvider.
 */
export interface IAuthProvider {
  /** Human-readable provider identifier (e.g. 'jwt', 'cognito', 'google') */
  readonly name: string;

  /**
   * Authenticate using credentials.
   * Returns an AuthResult which may require MFA as a second step.
   */
  authenticate(credentials: Credentials): Promise<AuthResult>;

  /**
   * Verify a raw access token and return the associated user.
   * Throws TokenExpiredError or TokenInvalidError on failure.
   */
  verify(token: string): Promise<AuthUser>;

  /**
   * Issue a new access token from a refresh token.
   * Throws TokenInvalidError if the refresh token is invalid or revoked.
   */
  refresh(refreshToken: string): Promise<AuthToken>;

  /**
   * Revoke a token (logout / sign-out).
   */
  revoke(token: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// OAuth provider
// ---------------------------------------------------------------------------

/**
 * Extends IAuthProvider with the OAuth2 authorization code flow.
 */
export interface IOAuthProvider extends IAuthProvider {
  /**
   * Build the provider's authorization URL to redirect the user to.
   * @param state CSRF-prevention state token
   * @param pkceChallenge Optional PKCE code_challenge
   */
  getAuthorizationUrl(state: string, pkceChallenge?: string): string;

  /**
   * Handle the OAuth callback: exchange code for tokens and return the user.
   * @param code Authorization code from the provider
   * @param state State token to validate
   * @param pkceVerifier Optional PKCE code_verifier
   */
  handleCallback(
    code: string,
    state: string,
    pkceVerifier?: string,
  ): Promise<AuthResult>;

  /**
   * Fetch the raw profile from the provider using an access token.
   */
  getUserProfile(accessToken: string): Promise<OAuthProfile>;

  /**
   * Refresh OAuth tokens using a provider refresh token.
   */
  refreshOAuthToken(refreshToken: string): Promise<OAuthTokens>;
}

// ---------------------------------------------------------------------------
// Directory provider (LDAP / Active Directory)
// ---------------------------------------------------------------------------

/**
 * Extends IAuthProvider with directory search and sync capabilities.
 */
export interface IDirectoryProvider extends IAuthProvider {
  /**
   * Bind to the directory server and verify connectivity.
   */
  connect(): Promise<void>;

  /**
   * Unbind and close all connections.
   */
  disconnect(): Promise<void>;

  readonly isConnected: boolean;

  /**
   * Search for users in the directory.
   */
  searchUsers(filter: DirectoryFilter): Promise<DirectoryUser[]>;

  /**
   * Retrieve a single user by username or DN.
   */
  getUser(usernameOrDn: string): Promise<DirectoryUser | null>;

  /**
   * List groups the user belongs to.
   */
  getGroups(userId: string): Promise<string[]>;

  /**
   * Sync directory users to the local IUserStore.
   */
  syncUsers(options?: SyncOptions): Promise<SyncResult>;
}

// ---------------------------------------------------------------------------
// MFA provider
// ---------------------------------------------------------------------------

/**
 * Manages multi-factor authentication for a specific method.
 * Can be stacked on top of any IAuthProvider.
 */
export interface IMfaProvider {
  readonly method: MfaMethod;

  /**
   * Enroll a user in this MFA method.
   * Returns enrollment data (QR URI for TOTP, recovery codes, etc.).
   */
  enroll(userId: string): Promise<MfaEnrollment>;

  /**
   * Check if a user is enrolled.
   */
  isEnrolled(userId: string): Promise<boolean>;

  /**
   * Generate and (if needed) deliver a new challenge.
   * For TOTP this is a no-op challenge; for Email OTP it sends the email.
   */
  generateChallenge(userId: string): Promise<MfaChallenge>;

  /**
   * Verify the user-supplied code against the active challenge.
   * Returns true on success; throws MfaInvalidCodeError on failure.
   */
  verifyChallenge(challengeId: string, code: string): Promise<boolean>;

  /**
   * Remove MFA enrollment for a user.
   */
  unenroll(userId: string): Promise<void>;

  /**
   * Burn a single-use recovery code.
   * Returns true if the code was valid.
   */
  useRecoveryCode(userId: string, code: string): Promise<boolean>;

  /**
   * Generate a fresh set of recovery codes (invalidates previous ones).
   */
  regenerateRecoveryCodes(userId: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// User store
// ---------------------------------------------------------------------------

/**
 * Persistence abstraction for auth users.
 * Implementations: InMemoryUserStore (included in auth-jwt), any DB-backed store.
 */
export interface IUserStore {
  findById(id: string): Promise<AuthUser | null>;
  findOne(query: UserStoreQuery): Promise<AuthUser | null>;
  findMany(query: UserStoreQuery): Promise<AuthUser[]>;
  create(input: CreateUserInput): Promise<AuthUser>;
  update(id: string, input: UpdateUserInput): Promise<AuthUser>;
  delete(id: string): Promise<boolean>;

  /**
   * Verify a plain-text password against the stored hash.
   */
  verifyPassword(id: string, plainPassword: string): Promise<boolean>;

  /**
   * Hash and store a new password.
   */
  setPassword(id: string, plainPassword: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Auth middleware factory
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';

export type AuthMiddlewareFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void | Response>;

/**
 * Configuration for the provider-agnostic auth middleware.
 */
export interface AuthMiddlewareOptions {
  /** Where to look for the token. Defaults to ['header'] */
  tokenSources?: Array<'header' | 'cookie' | 'query'>;
  /** Header name when source is 'header'. Defaults to 'Authorization' */
  headerName?: string;
  /** Cookie name when source is 'cookie'. Defaults to 'auth_token' */
  cookieName?: string;
  /** Query param when source is 'query'. Defaults to 'token' */
  queryParam?: string;
  /** If true, missing token calls next() instead of returning 401. Defaults to false */
  optional?: boolean;
  /** Roles required to pass (OR logic). Checked after verify. */
  roles?: string[];
  /** Permissions required to pass (AND logic). Checked after verify. */
  permissions?: string[];
}
