/**
 * OAuthProvider — IOAuthProvider implementation.
 *
 * Wraps any OAuthStrategy and bridges it to the Fox Framework auth interfaces.
 * On successful callback it upserts the user in an optional IUserStore.
 */
import type { IOAuthProvider, AuthUser, AuthToken, AuthResult, Credentials, OAuthProfile, OAuthTokens, IUserStore } from '@foxframework/core';
import type { OAuthStrategy, OAuthStrategyConfig } from './strategy';
export interface OAuthProviderConfig extends OAuthStrategyConfig {
    /**
     * Map an OAuthProfile to the AuthUser that will be stored/returned.
     * If omitted, a minimal AuthUser is created from the profile.
     */
    mapProfile?: (profile: OAuthProfile, tokens: OAuthTokens) => AuthUser;
    /**
     * Optional store for persisting OAuth users.
     * If provided, users are upserted on every successful callback.
     */
    store?: IUserStore;
}
export declare class OAuthProvider implements IOAuthProvider {
    readonly name: string;
    private readonly strategy;
    private readonly cfg;
    private readonly store?;
    constructor(strategy: OAuthStrategy, config: OAuthProviderConfig);
    getAuthorizationUrl(state: string, pkceChallenge?: string): string;
    handleCallback(code: string, _state: string, pkceVerifier?: string): Promise<AuthResult>;
    getUserProfile(accessToken: string): Promise<OAuthProfile>;
    refreshOAuthToken(refreshToken: string): Promise<OAuthTokens>;
    authenticate(_credentials: Credentials): Promise<AuthResult>;
    verify(_token: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthToken>;
    revoke(_token: string): Promise<void>;
    private _upsert;
}
//# sourceMappingURL=oauth.provider.d.ts.map