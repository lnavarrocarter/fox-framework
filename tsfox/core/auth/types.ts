/**
 * @foxframework/core — Auth Types
 * Plain data types used across all auth providers.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
  /** ISO 8601 */
  createdAt?: string;
  updatedAt?: string;
}

export interface Credentials {
  username?: string;
  email?: string;
  password?: string;
  /** Raw token (e.g. Bearer from header) */
  token?: string;
  /** Provider-specific extras (e.g. SAML assertion, OAuth code) */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer' | string;
  /** Seconds until expiry */
  expiresIn: number;
  /** ISO 8601 */
  issuedAt: string;
  scope?: string[];
}

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Auth result
// ---------------------------------------------------------------------------

export type AuthResultStatus = 'authenticated' | 'mfa_required' | 'password_change_required';

export interface AuthResult {
  status: AuthResultStatus;
  token?: AuthToken;
  user?: AuthUser;
  /** Set when status === 'mfa_required' */
  mfaChallenge?: MfaChallenge;
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

export type MfaMethod = 'totp' | 'email_otp' | 'sms_otp' | 'recovery_code';

export interface MfaChallenge {
  challengeId: string;
  method: MfaMethod;
  /** ISO 8601 expiry of this challenge */
  expiresAt: string;
  /** Partial destination for display (e.g. "j***@example.com") */
  destination?: string;
}

export interface MfaEnrollment {
  method: MfaMethod;
  /** TOTP: otpauth:// URI for QR code */
  uri?: string;
  /** TOTP: base32 secret (show once) */
  secret?: string;
  /** Recovery codes (show once, store hashed) */
  recoveryCodes?: string[];
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export type OAuthStrategy =
  | 'facebook'
  | 'instagram'
  | 'google'
  | 'github'
  | 'microsoft';

export interface OAuthProfile {
  provider: OAuthStrategy;
  providerId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  raw: Record<string, unknown>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string[];
  tokenType?: string;
}

// ---------------------------------------------------------------------------
// Directory (LDAP / AD)
// ---------------------------------------------------------------------------

export interface DirectoryUser {
  dn: string;
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  groups: string[];
  attributes: Record<string, string | string[]>;
}

export interface DirectoryFilter {
  username?: string;
  email?: string;
  group?: string;
  custom?: string;
}

export interface SyncOptions {
  /** Only sync users modified after this date */
  since?: Date;
  /** Sync groups too */
  includeGroups?: boolean;
  /** Dry run — report changes without applying */
  dryRun?: boolean;
  /** Batch size */
  batchSize?: number;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{ dn: string; error: string }>;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// User store
// ---------------------------------------------------------------------------

export interface UserStoreQuery {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface CreateUserInput {
  email?: string;
  username?: string;
  displayName?: string;
  passwordHash?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  passwordHash?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}
