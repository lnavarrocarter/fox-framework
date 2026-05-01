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

import type {
  IAuthProvider,
  IMfaProvider,
  AuthUser,
  AuthToken,
  AuthResult,
  Credentials,
} from '@foxframework/core';

interface PendingMfa {
  user: AuthUser;
  token: AuthToken;
  expiresAt: number;
}

export interface MfaMiddlewareConfig {
  /** How long (ms) a pending MFA session is valid. Default: 300_000 (5 min) */
  sessionTtlMs?: number;
}

export class MfaMiddleware implements IAuthProvider {
  readonly name: string;

  private readonly inner: IAuthProvider;
  private readonly mfa: IMfaProvider;
  private readonly sessionTtlMs: number;
  private readonly pending = new Map<string, PendingMfa>();

  constructor(inner: IAuthProvider, mfa: IMfaProvider, config: MfaMiddlewareConfig = {}) {
    this.inner = inner;
    this.mfa = mfa;
    this.name = `${inner.name}+${mfa.method}`;
    this.sessionTtlMs = config.sessionTtlMs ?? 300_000;
  }

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    const result = await this.inner.authenticate(credentials);

    if (result.status !== 'authenticated' || !result.user || !result.token) {
      return result;
    }

    const enrolled = await this.mfa.isEnrolled(result.user.id);
    if (!enrolled) return result;

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
  async completeMfa(challengeId: string, code: string): Promise<AuthResult> {
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
  verify(token: string) { return this.inner.verify(token); }
  refresh(refreshToken: string) { return this.inner.refresh(refreshToken); }
  revoke(token: string) { return this.inner.revoke(token); }
}
