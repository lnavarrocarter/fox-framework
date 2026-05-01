import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
import { buildQueryString, postForm, getJson, parseTokenResponse } from '../strategy';

export class MicrosoftStrategy implements OAuthStrategy {
  readonly name = 'microsoft';
  readonly defaultScopes = ['openid', 'email', 'profile', 'User.Read'];
  readonly authorizationUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  readonly tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  buildAuthUrl(cfg: OAuthStrategyConfig, state: string, pkceChallenge?: string): string {
    const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
    const params: Record<string, string> = {
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      response_mode: 'query',
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
      scope: this.defaultScopes.join(' '),
      code,
    };
    if (pkceVerifier) params['code_verifier'] = pkceVerifier;
    return parseTokenResponse(await postForm(this.tokenUrl, params));
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const data = await getJson('https://graph.microsoft.com/v1.0/me', accessToken);
    return {
      provider: 'microsoft',
      providerId: data['id'] as string,
      email: (data['mail'] ?? data['userPrincipalName']) as string | undefined,
      displayName: data['displayName'] as string | undefined,
      raw: data,
    };
  }

  async refreshTokens(cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens> {
    return parseTokenResponse(await postForm(this.tokenUrl, {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      scope: this.defaultScopes.join(' '),
      refresh_token: refreshToken,
    }));
  }
}
