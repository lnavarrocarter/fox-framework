/**
 * Instagram strategy — uses Instagram Basic Display API.
 * Note: Instagram uses Facebook's OAuth infrastructure for business accounts;
 * this strategy targets the Basic Display API for personal accounts.
 */
import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
import { buildQueryString, postForm, getJson, parseTokenResponse } from '../strategy';

export class InstagramStrategy implements OAuthStrategy {
  readonly name = 'instagram';
  readonly defaultScopes = ['user_profile', 'user_media'];
  readonly authorizationUrl = 'https://api.instagram.com/oauth/authorize';
  readonly tokenUrl = 'https://api.instagram.com/oauth/access_token';

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
      grant_type: 'authorization_code',
      code,
    }));
  }

  async fetchProfile(accessToken: string): Promise<OAuthProfile> {
    const data = await getJson(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`,
      accessToken,
    );
    return {
      provider: 'instagram',
      providerId: data['id'] as string,
      displayName: data['username'] as string | undefined,
      raw: data,
    };
  }

  async refreshTokens(_cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens> {
    return parseTokenResponse(
      await postForm('https://graph.instagram.com/refresh_access_token', {
        grant_type: 'ig_refresh_token',
        access_token: refreshToken,
      }),
    );
  }
}
