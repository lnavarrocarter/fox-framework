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
    exchangeCode(config: OAuthStrategyConfig, code: string, pkceVerifier?: string): Promise<OAuthTokens>;
    /** Fetch the user profile using the access token */
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    /** Refresh tokens */
    refreshTokens(config: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens>;
}
export declare function buildQueryString(params: Record<string, string>): string;
export declare function postForm(url: string, params: Record<string, string>): Promise<Record<string, unknown>>;
export declare function getJson(url: string, accessToken: string): Promise<Record<string, unknown>>;
export declare function parseTokenResponse(data: Record<string, unknown>): OAuthTokens;
//# sourceMappingURL=strategy.d.ts.map