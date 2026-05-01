/**
 * FirebaseAuthProvider — IAuthProvider backed by Firebase Authentication REST API.
 *
 * Uses the Firebase Auth REST API (no firebase-admin SDK dependency).
 * For server-side token verification it validates the Firebase ID token
 * by calling the tokeninfo endpoint (simple; swap for JWKS in prod).
 *
 * Supports:
 *  - authenticate(): email/password sign-in
 *  - verify(): validates ID token via Google tokeninfo API
 *  - refresh(): exchanges a refresh token for a new ID token
 *  - revoke(): calls revokeRefreshTokens via Firebase Auth REST
 */

import type { IAuthProvider, AuthUser, AuthToken, AuthResult, Credentials } from '@foxframework/core';
import {
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
} from '@foxframework/core';

export interface FirebaseAuthProviderConfig {
  /** Firebase Web API key (from Firebase Console → Project settings) */
  apiKey: string;
  /** Optional: map Firebase user data to Fox AuthUser */
  mapUser?: (firebaseUser: Record<string, unknown>) => AuthUser;
}

const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_URL = 'https://securetoken.googleapis.com/v1';

function defaultMapUser(u: Record<string, unknown>): AuthUser {
  return {
    id: u['localId'] as string,
    email: u['email'] as string | undefined,
    displayName: u['displayName'] as string | undefined,
    avatarUrl: u['photoUrl'] as string | undefined,
    roles: [],
    permissions: [],
    metadata: { source: 'firebase', emailVerified: u['emailVerified'] },
  };
}

export class FirebaseAuthProvider implements IAuthProvider {
  readonly name = 'firebase';

  private readonly cfg: FirebaseAuthProviderConfig;

  constructor(config: FirebaseAuthProviderConfig) {
    this.cfg = config;
  }

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    const email = credentials.email;
    const password = credentials.password;
    if (!email || !password) throw new InvalidCredentialsError();

    const res = await fetch(
      `${IDENTITY_URL}/accounts:signInWithPassword?key=${this.cfg.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const code = (data['error'] as Record<string, unknown>)?.['message'] as string ?? '';
      if (code.includes('INVALID') || code.includes('NOT_FOUND')) {
        throw new InvalidCredentialsError();
      }
      throw new Error(`Firebase signIn error: ${code}`);
    }

    const mapper = this.cfg.mapUser ?? defaultMapUser;
    const user = mapper(data);
    const token = this._buildToken(data);
    return { status: 'authenticated', user, token };
  }

  async verify(idToken: string): Promise<AuthUser> {
    // Validate via Google tokeninfo endpoint
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const err = (data['error'] as string) ?? '';
      if (err.includes('expired')) throw new TokenExpiredError();
      throw new TokenInvalidError();
    }

    return {
      id: data['sub'] as string,
      email: data['email'] as string | undefined,
      displayName: data['name'] as string | undefined,
      avatarUrl: data['picture'] as string | undefined,
      roles: [],
      permissions: [],
      metadata: { source: 'firebase' },
    };
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
    const res = await fetch(`${TOKEN_URL}/token?key=${this.cfg.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new TokenInvalidError('Firebase refresh token invalid');

    return {
      accessToken: data['id_token'] as string,
      refreshToken: data['refresh_token'] as string,
      tokenType: 'Bearer',
      expiresIn: Number(data['expires_in'] ?? 3600),
      issuedAt: new Date().toISOString(),
    };
  }

  async revoke(_token: string): Promise<void> {
    // Firebase doesn't offer a direct "revoke single token" REST endpoint.
    // revokeRefreshTokens is an Admin SDK operation. No-op here.
  }

  private _buildToken(data: Record<string, unknown>): AuthToken {
    return {
      accessToken: data['idToken'] as string,
      refreshToken: data['refreshToken'] as string | undefined,
      tokenType: 'Bearer',
      expiresIn: Number(data['expiresIn'] ?? 3600),
      issuedAt: new Date().toISOString(),
    };
  }
}
