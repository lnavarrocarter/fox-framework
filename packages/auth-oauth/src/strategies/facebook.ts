import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
import { buildQueryString, postForm, getJson, parseTokenResponse } from '../strategy';

export class FacebookStrategy implements OAuthStrategy {
  readonly name = 'facebook';
  readonly defaultScopes = ['email', 'public_profile'];
  readonly authorizationUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  readonly tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';

  buildAuthUrl(cfg: OAuthStrategyConfig, state: string): string {
    const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
    return `${this.authorizationUrl}?${buildQueryString({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: scopes.join(','),
      state,
      response_type: 'code',
    })}`;
  }

  async exchangeCode(cfg: OAuthStrategyConfig, code: string): Promise<OAuthTokens> {
    return parseTokenResponse(await postForm(this.tokenUrl, {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      code,
    }));
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const data = await getJson(
      'https://graph.facebook.com/me?fields=id,name,email,picture',
      accessToken,
    );
    return {
      provider: 'facebook',
      providerId: data['id'] as string,
      email: data['email'] as string | undefined,
      displayName: data['name'] as string | undefined,
      avatarUrl: (data['picture'] as Record<string, unknown> | undefined)?.['url'] as string | undefined,
      raw: data,
    };
  }

  async refreshTokens(_cfg: OAuthStrategyConfig, _refreshToken: string): Promise<OAuthTokens> {
    throw new Error('Facebook long-lived tokens do not support standard refresh');
  }
}
