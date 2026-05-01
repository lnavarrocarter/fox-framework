/**
 * FirebaseAuthProvider — IAuthProvider backed by Firebase Authentication REST API.
 *
 * Uses the Firebase Auth REST API (no firebase-admin SDK dependency).
 * For server-side token verification it validates the Firebase ID token
 * by calling the tokeninfo endpoint (simple; swap for JWKS in prod).
 *
 * Supports:
 *  - authenticate(): email/password sign-in
 *  - verify(): validates ID token via Google tokeninfo API
 *  - refresh(): exchanges a refresh token for a new ID token
 *  - revoke(): calls revokeRefreshTokens via Firebase Auth REST
 */
import type { IAuthProvider, AuthUser, AuthToken, AuthResult, Credentials } from '@foxframework/core';
export interface FirebaseAuthProviderConfig {
    /** Firebase Web API key (from Firebase Console → Project settings) */
    apiKey: string;
    /** Optional: map Firebase user data to Fox AuthUser */
    mapUser?: (firebaseUser: Record<string, unknown>) => AuthUser;
}
export declare class FirebaseAuthProvider implements IAuthProvider {
    readonly name = "firebase";
    private readonly cfg;
    constructor(config: FirebaseAuthProviderConfig);
    authenticate(credentials: Credentials): Promise<AuthResult>;
    verify(idToken: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthToken>;
    revoke(_token: string): Promise<void>;
    private _buildToken;
}
//# sourceMappingURL=firebase-auth.provider.d.ts.map