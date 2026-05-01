import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
export declare class GitHubStrategy implements OAuthStrategy {
    readonly name = "github";
    readonly defaultScopes: string[];
    readonly authorizationUrl = "https://github.com/login/oauth/authorize";
    readonly tokenUrl = "https://github.com/login/oauth/access_token";
    buildAuthUrl(cfg: OAuthStrategyConfig, state: string): string;
    exchangeCode(cfg: OAuthStrategyConfig, code: string): Promise<OAuthTokens>;
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    refreshTokens(_cfg: OAuthStrategyConfig, _refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=github.d.ts.map