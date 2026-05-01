/**
 * OAuthProvider — IOAuthProvider implementation.
 *
 * Wraps any OAuthStrategy and bridges it to the Fox Framework auth interfaces.
 * On successful callback it upserts the user in an optional IUserStore.
 */

import type {
  IOAuthProvider,
  AuthUser,
  AuthToken,
  AuthResult,
  Credentials,
  OAuthProfile,
  OAuthTokens,
  IUserStore,
  CreateUserInput,
} from '@foxframework/core';
import { OAuthError } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from './strategy';

export interface OAuthProviderConfig extends OAuthStrategyConfig {
  /**
   * Map an OAuthProfile to the AuthUser that will be stored/returned.
   * If omitted, a minimal AuthUser is created from the profile.
   */
  mapProfile?: (profile: OAuthProfile, tokens: OAuthTokens) => AuthUser;
  /**
   * Optional store for persisting OAuth users.
   * If provided, users are upserted on every successful callback.
   */
  store?: IUserStore;
}

function defaultMapProfile(profile: OAuthProfile): AuthUser {
  return {
    id: `${profile.provider}:${profile.providerId}`,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    roles: [],
    permissions: [],
    metadata: { provider: profile.provider, providerId: profile.providerId },
  };
}

export class OAuthProvider implements IOAuthProvider {
  readonly name: string;

  private readonly strategy: OAuthStrategy;
  private readonly cfg: OAuthProviderConfig;
  private readonly store?: IUserStore;

  constructor(strategy: OAuthStrategy, config: OAuthProviderConfig) {
    this.strategy = strategy;
    this.cfg = config;
    this.store = config.store;
    this.name = `oauth:${strategy.name}`;
  }

  // -------------------------------------------------------------------------
  // IOAuthProvider
  // -------------------------------------------------------------------------

  getAuthorizationUrl(state: string, pkceChallenge?: string): string {
    return this.strategy.buildAuthUrl(this.cfg, state, pkceChallenge);
  }

  async handleCallback(code: string, _state: string, pkceVerifier?: string): Promise<AuthResult> {
    let tokens: OAuthTokens;
    try {
      tokens = await this.strategy.exchangeCode(this.cfg, code, pkceVerifier);
    } catch (err) {
      throw new OAuthError(`Code exchange failed: ${(err as Error).message}`);
    }

    let profile: OAuthProfile;
    try {
      profile = await this.strategy.fetchProfile(tokens.accessToken);
    } catch (err) {
      throw new OAuthError(`Profile fetch failed: ${(err as Error).message}`);
    }

    const mapper = this.cfg.mapProfile ?? defaultMapProfile;
    const user = mapper(profile, tokens);

    if (this.store) {
      await this._upsert(user);
    }

    const authToken: AuthToken = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn ?? 3600,
      issuedAt: new Date().toISOString(),
      scope: tokens.scope,
    };

    return { status: 'authenticated', user, token: authToken };
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    return this.strategy.fetchProfile(accessToken);
  }

  async refreshOAuthToken(refreshToken: string): Promise<OAuthTokens> {
    return this.strategy.refreshTokens(this.cfg, refreshToken);
  }

  // -------------------------------------------------------------------------
  // IAuthProvider — minimal implementations for interface compliance
  // -------------------------------------------------------------------------

  async authenticate(_credentials: Credentials): Promise<AuthResult> {
    throw new OAuthError(
      `${this.name}: use getAuthorizationUrl() + handleCallback() for OAuth flows`,
    );
  }

  async verify(_token: string): Promise<AuthUser> {
    // OAuth access tokens are opaque; fetch profile instead
    const profile = await this.getUserProfile(_token);
    return (this.cfg.mapProfile ?? defaultMapProfile)(profile, { accessToken: _token });
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
    const tokens = await this.refreshOAuthToken(refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn ?? 3600,
      issuedAt: new Date().toISOString(),
      scope: tokens.scope,
    };
  }

  async revoke(_token: string): Promise<void> {
    // Provider-specific revocation not implemented here; override if needed
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async _upsert(user: AuthUser): Promise<void> {
    if (!this.store) return;
    const existing = await this.store.findOne({ id: user.id });
    if (existing) {
      await this.store.update(user.id, {
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        metadata: user.metadata,
      });
    } else {
      const input: CreateUserInput = {
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        permissions: user.permissions,
        metadata: user.metadata,
      };
      await this.store.create(input);
    }
  }
}
