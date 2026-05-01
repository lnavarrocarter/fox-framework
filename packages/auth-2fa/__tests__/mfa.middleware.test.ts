/**
 * MfaMiddleware integration tests
 */

import { MfaMiddleware } from '../src/mfa.middleware';
import type { IAuthProvider, IMfaProvider, AuthResult, AuthUser, AuthToken, Credentials, MfaChallenge, MfaEnrollment } from '@foxframework/core';

// Minimal stub IAuthProvider
function makeInnerProvider(enrolled = true): IAuthProvider {
  const user: AuthUser = { id: 'u1', email: 'a@b.com', roles: [], permissions: [] };
  const token: AuthToken = {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    issuedAt: new Date().toISOString(),
  };
  return {
    name: 'stub',
    authenticate: async () => ({ status: 'authenticated', user, token } as AuthResult),
    verify: async () => user,
    refresh: async () => token,
    revoke: async () => {},
  };
}

// Minimal stub IMfaProvider
function makeMfaProvider(isEnrolled = true): IMfaProvider & { lastChallenge?: string } {
  const obj: IMfaProvider & { lastChallenge?: string } = {
    method: 'totp',
    lastChallenge: undefined,
    enroll: async () => ({ method: 'totp' } as MfaEnrollment),
    isEnrolled: async () => isEnrolled,
    generateChallenge: async (userId) => {
      const id = `totp:${userId}:1`;
      obj.lastChallenge = id;
      return {
        challengeId: id,
        method: 'totp',
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
      } as MfaChallenge;
    },
    verifyChallenge: async (_id, code) => {
      if (code !== '123456') throw new Error('Invalid code');
      return true;
    },
    unenroll: async () => {},
    useRecoveryCode: async () => false,
    regenerateRecoveryCodes: async () => [],
  };
  return obj;
}

describe('MfaMiddleware', () => {
  it('name combines inner provider and mfa method', () => {
    const mw = new MfaMiddleware(makeInnerProvider(), makeMfaProvider());
    expect(mw.name).toBe('stub+totp');
  });

  describe('when user is enrolled', () => {
    it('returns mfa_required on authenticate', async () => {
      const mw = new MfaMiddleware(makeInnerProvider(), makeMfaProvider(true));
      const result = await mw.authenticate({ email: 'a@b.com', password: 'pw' });
      expect(result.status).toBe('mfa_required');
      expect(result.mfaChallenge).toBeDefined();
    });

    it('completeMfa returns authenticated with token on correct code', async () => {
      const mfaProvider = makeMfaProvider(true);
      const mw = new MfaMiddleware(makeInnerProvider(), mfaProvider);
      await mw.authenticate({ email: 'a@b.com', password: 'pw' });
      const challengeId = mfaProvider.lastChallenge!;
      const result = await mw.completeMfa(challengeId, '123456');
      expect(result.status).toBe('authenticated');
      expect(result.token).toBeDefined();
    });

    it('completeMfa throws on wrong code', async () => {
      const mfaProvider = makeMfaProvider(true);
      const mw = new MfaMiddleware(makeInnerProvider(), mfaProvider);
      await mw.authenticate({ email: 'a@b.com', password: 'pw' });
      const challengeId = mfaProvider.lastChallenge!;
      await expect(mw.completeMfa(challengeId, 'wrong')).rejects.toThrow();
    });

    it('completeMfa throws on unknown challenge', async () => {
      const mw = new MfaMiddleware(makeInnerProvider(), makeMfaProvider(true));
      await expect(mw.completeMfa('no-such-challenge', '000000')).rejects.toThrow();
    });
  });

  describe('when user is NOT enrolled', () => {
    it('returns authenticated directly (bypasses MFA)', async () => {
      const mw = new MfaMiddleware(makeInnerProvider(), makeMfaProvider(false));
      const result = await mw.authenticate({ email: 'a@b.com', password: 'pw' });
      expect(result.status).toBe('authenticated');
    });
  });

  it('delegates verify/refresh/revoke to inner provider', async () => {
    const inner = makeInnerProvider();
    const mw = new MfaMiddleware(inner, makeMfaProvider());
    expect(await mw.verify('tok')).toBeDefined();
    expect(await mw.refresh('ref')).toBeDefined();
    await expect(mw.revoke('tok')).resolves.toBeUndefined();
  });
});
