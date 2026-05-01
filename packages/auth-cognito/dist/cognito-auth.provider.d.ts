/**
 * CognitoAuthProvider — IAuthProvider backed by AWS Cognito User Pools.
 *
 * Uses the Cognito REST API (InitiateAuth, GetUser, GlobalSignOut) via fetch.
 * No AWS SDK dependency — just HTTP calls to the Cognito endpoint.
 *
 * Supports:
 *  - authenticate(): USER_PASSWORD_AUTH flow
 *  - verify(): validates the IdToken via Cognito's JWKS (cached)
 *  - refresh(): REFRESH_TOKEN_AUTH flow
 *  - revoke(): GlobalSignOut
 */
import type { IAuthProvider, AuthUser, AuthToken, AuthResult, Credentials } from '@foxframework/core';
export interface CognitoAuthProviderConfig {
    /** AWS region (e.g. 'us-east-1') */
    region: string;
    /** Cognito User Pool ID (e.g. 'us-east-1_AbCdEfGhI') */
    userPoolId: string;
    /** App client ID */
    clientId: string;
    /** App client secret (optional, only if client has a secret) */
    clientSecret?: string;
    /** Map Cognito attributes to Fox AuthUser (optional) */
    mapUser?: (attributes: Record<string, string>, sub: string) => AuthUser;
}
export declare class CognitoAuthProvider implements IAuthProvider {
    readonly name = "cognito";
    private readonly cfg;
    private readonly endpoint;
    constructor(config: CognitoAuthProviderConfig);
    authenticate(credentials: Credentials): Promise<AuthResult>;
    verify(token: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthToken>;
    revoke(token: string): Promise<void>;
    private _getUser;
    private _buildAuthToken;
    private _post;
}
//# sourceMappingURL=cognito-auth.provider.d.ts.map