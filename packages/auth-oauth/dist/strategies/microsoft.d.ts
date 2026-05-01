import type { OAuthProfile, OAuthTokens } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from '../strategy';
export declare class MicrosoftStrategy implements OAuthStrategy {
    readonly name = "microsoft";
    readonly defaultScopes: string[];
    readonly authorizationUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
    readonly tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    buildAuthUrl(cfg: OAuthStrategyConfig, state: string, pkceChallenge?: string): string;
    exchangeCode(cfg: OAuthStrategyConfig, code: string, pkceVerifier?: string): Promise<OAuthTokens>;
    fetchProfile(accessToken: string): Promise<OAuthProfile>;
    refreshTokens(cfg: OAuthStrategyConfig, refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=microsoft.d.ts.map