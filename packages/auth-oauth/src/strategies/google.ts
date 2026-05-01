import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
import { buildQueryString, postForm, getJson, parseTokenResponse } from '../strategy';

export class GoogleStrategy implements OAuthStrategy {
  readonly name = 'google';
  readonly defaultScopes = ['openid', 'email', 'profile'];
  readonly authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  readonly tokenUrl = 'https://oauth2.googleapis.com/token';

  buildAuthUrl(cfg: OAuthStrategyConfig, state: string, pkceChallenge?: string): string {
    const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
    const params: Record<string, string> = {
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    };
    if (pkceChallenge) {
      params['code_challenge'] = pkceChallenge;
      params['code_challenge_method'] = 'S256';
    }
    return `${this.authorizationUrl}?${buildQueryString(params)}`;
  }

  async exchangeCode(cfg: OAuthStrategyConfig, code: string, pkceVerifier?: string): Promise<OAuthTokens> {
    const params: Record<string, string> = {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
      code,
    };
    if (pkceVerifier) params['code_verifier'] = pkceVerifier;
    return parseTokenResponse(await postForm(this.tokenUrl, params));
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const data = await getJson('https://www.googleapis.com/oauth2/v3/userinfo', accessToken);
    return {
      provider: 'google',
      providerId: data['sub'] as string,
      email: data['email'] as string | undefined,
      displayName: data['name'] as string | undefined,
      avatarUrl: data['picture'] as string | undefined,
      raw: data,
    };
  }

  async refreshTokens(cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens> {
    return parseTokenResponse(await postForm(this.tokenUrl, {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }));
  }
}
