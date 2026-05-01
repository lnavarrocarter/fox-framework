import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
export declare class GoogleStrategy implements OAuthStrategy {
    readonly name = "google";
    readonly defaultScopes: string[];
    readonly authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    readonly tokenUrl = "https://oauth2.googleapis.com/token";
    buildAuthUrl(cfg: OAuthStrategyConfig, state: string, pkceChallenge?: string): string;
    exchangeCode(cfg: OAuthStrategyConfig, code: string, pkceVerifier?: string): Promise<OAuthTokens>;
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    refreshTokens(cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=google.d.ts.map