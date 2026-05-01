/**
 * OAuthStrategy — interface each provider strategy must implement.
 * All network calls use the global fetch (Node 18+).
 */

import type { OAuthProfile, OAuthTokens } from '@foxframework/core';

export interface OAuthStrategyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Extra scopes on top of the strategy defaults */
  scopes?: string[];
}

export interface OAuthStrategy {
  readonly name: string;
  readonly defaultScopes: string[];
  readonly authorizationUrl: string;
  readonly tokenUrl: string;

  /** Build the authorization URL to redirect the user to */
  buildAuthUrl(config: OAuthStrategyConfig, state: string, pkceChallenge?: string): string;

  /** Exchange an authorization code for tokens */
  exchangeCode(
    config: OAuthStrategyConfig,
    code: string,
    pkceVerifier?: string,
  ): Promise<OAuthTokens>;

  /** Fetch the user profile using the access token */
  fetchProfile(accessToken: string): Promise<OAuthProfile>;

  /** Refresh tokens */
  refreshTokens(config: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function buildQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: buildQueryString(params),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OAuth token exchange failed [${response.status}]: ${body}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export async function getJson(
  url: string,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OAuth profile fetch failed [${response.status}]: ${body}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export function parseTokenResponse(data: Record<string, unknown>): OAuthTokens {
  return {
    accessToken: data['access_token'] as string,
    refreshToken: data['refresh_token'] as string | undefined,
    expiresIn: data['expires_in'] as number | undefined,
    scope: typeof data['scope'] === 'string' ? data['scope'].split(' ') : undefined,
    tokenType: data['token_type'] as string | undefined,
  };
}
