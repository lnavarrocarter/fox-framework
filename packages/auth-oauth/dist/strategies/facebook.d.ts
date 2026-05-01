import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
export declare class FacebookStrategy implements OAuthStrategy {
    readonly name = "facebook";
    readonly defaultScopes: string[];
    readonly authorizationUrl = "https://www.facebook.com/v18.0/dialog/oauth";
    readonly tokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token";
    buildAuthUrl(cfg: OAuthStrategyConfig, state: string): string;
    exchangeCode(cfg: OAuthStrategyConfig, code: string): Promise<OAuthTokens>;
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    refreshTokens(_cfg: OAuthStrategyConfig, _refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=facebook.d.ts.map