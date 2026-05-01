/**
 * MfaMiddleware — wraps any IAuthProvider to enforce MFA as a second step.
 *
 * Usage:
 *   const mfa = new MfaMiddleware(jwtProvider, totpProvider);
 *   app.post('/login', async (req, res) => {
 *     const result = await mfa.authenticate(req.body);
 *     // result.status === 'mfa_required' → return mfaChallenge to client
 *     // result.status === 'authenticated' → return token
 *   });
 *   app.post('/mfa/verify', async (req, res) => {
 *     const result = await mfa.completeMfa(challengeId, code);
 *   });
 */
import type { IAuthProvider, IMfaProvider, AuthUser, AuthToken, AuthResult, Credentials } from '@foxframework/core';
export interface MfaMiddlewareConfig {
    /** How long (ms) a pending MFA session is valid. Default: 300_000 (5 min) */
    sessionTtlMs?: number;
}
export declare class MfaMiddleware implements IAuthProvider {
    readonly name: string;
    private readonly inner;
    private readonly mfa;
    private readonly sessionTtlMs;
    private readonly pending;
    constructor(inner: IAuthProvider, mfa: IMfaProvider, config?: MfaMiddlewareConfig);
    authenticate(credentials: Credentials): Promise<AuthResult>;
    /**
     * Complete an MFA challenge. Returns the final AuthResult with the token.
     */
    completeMfa(challengeId: string, code: string): Promise<AuthResult>;
    verify(token: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthToken>;
    revoke(token: string): Promise<void>;
}
//# sourceMappingURL=mfa.middleware.d.ts.map