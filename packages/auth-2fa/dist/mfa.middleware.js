"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaMiddleware = void 0;
class MfaMiddleware {
    constructor(inner, mfa, config = {}) {
        this.pending = new Map();
        this.inner = inner;
        this.mfa = mfa;
        this.name = `${inner.name}+${mfa.method}`;
        this.sessionTtlMs = config.sessionTtlMs ?? 300000;
    }
    async authenticate(credentials) {
        const result = await this.inner.authenticate(credentials);
        if (result.status !== 'authenticated' || !result.user || !result.token) {
            return result;
        }
        const enrolled = await this.mfa.isEnrolled(result.user.id);
        if (!enrolled)
            return result;
        // MFA required: issue a challenge and hold the token pending
        const challenge = await this.mfa.generateChallenge(result.user.id);
        this.pending.set(challenge.challengeId, {
            user: result.user,
            token: result.token,
            expiresAt: Date.now() + this.sessionTtlMs,
        });
        return { status: 'mfa_required', user: result.user, mfaChallenge: challenge };
    }
    /**
     * Complete an MFA challenge. Returns the final AuthResult with the token.
     */
    async completeMfa(challengeId, code) {
        const session = this.pending.get(challengeId);
        if (!session || Date.now() > session.expiresAt) {
            this.pending.delete(challengeId);
            throw new Error('MFA session expired or not found');
        }
        await this.mfa.verifyChallenge(challengeId, code);
        this.pending.delete(challengeId);
        return { status: 'authenticated', user: session.user, token: session.token };
    }
    // Delegate remaining IAuthProvider methods to the inner provider
    verify(token) { return this.inner.verify(token); }
    refresh(refreshToken) { return this.inner.refresh(refreshToken); }
    revoke(token) { return this.inner.revoke(token); }
}
exports.MfaMiddleware = MfaMiddleware;
//# sourceMappingURL=mfa.middleware.js.map