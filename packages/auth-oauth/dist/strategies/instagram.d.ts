/**
 * Instagram strategy — uses Instagram Basic Display API.
 * Note: Instagram uses Facebook's OAuth infrastructure for business accounts;
 * this strategy targets the Basic Display API for personal accounts.
 */
import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
export declare class InstagramStrategy implements OAuthStrategy {
    readonly name = "instagram";
    readonly defaultScopes: string[];
    readonly authorizationUrl = "https://api.instagram.com/oauth/authorize";
    readonly tokenUrl = "https://api.instagram.com/oauth/access_token";
    buildAuthUrl(cfg: OAuthStrategyConfig, state: string): string;
    exchangeCode(cfg: OAuthStrategyConfig, code: string): Promise<OAuthTokens>;
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    refreshTokens(_cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=instagram.d.ts.map