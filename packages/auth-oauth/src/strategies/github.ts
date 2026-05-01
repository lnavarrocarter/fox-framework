import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
import { buildQueryString, postForm, getJson, parseTokenResponse } from '../strategy';

export class GitHubStrategy implements OAuthStrategy {
  readonly name = 'github';
  readonly defaultScopes = ['read:user', 'user:email'];
  readonly authorizationUrl = 'https://github.com/login/oauth/authorize';
  readonly tokenUrl = 'https://github.com/login/oauth/access_token';

  buildAuthUrl(cfg: OAuthStrategyConfig, state: string): string {
    const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
    return `${this.authorizationUrl}?${buildQueryString({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: scopes.join(' '),
      state,
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
    const [user, emails] = await Promise.all([
      getJson('https://api.github.com/user', accessToken),
      getJson('https://api.github.com/user/emails', accessToken).catch(() => []),
    ]);
    const primary = Array.isArray(emails)
      ? (emails as Array<{ email: string; primary: boolean }>).find((e) => e.primary)?.email
      : undefined;
    return {
      provider: 'github',
      providerId: String(user['id']),
      email: primary ?? (user['email'] as string | undefined),
      displayName: (user['name'] as string | undefined) ?? (user['login'] as string),
      avatarUrl: user['avatar_url'] as string | undefined,
      raw: user,
    };
  }

  async refreshTokens(_cfg: OAuthStrategyConfig, _refreshToken: string): Promise<OAuthTokens> {
    throw new Error('GitHub OAuth does not support token refresh');
  }
}
