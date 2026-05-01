/**
 * FirebaseAuthProvider unit tests — all Firebase REST calls are mocked
 */

import { FirebaseAuthProvider } from '../src/firebase-auth.provider';

const CFG = { apiKey: 'test-api-key' };

function mockFetch(responses: Array<{ ok: boolean; json: unknown }>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return { ok: r.ok, json: async () => r.json } as unknown as Response;
  });
}

afterEach(() => jest.restoreAllMocks());

describe('FirebaseAuthProvider', () => {
  it('name is "firebase"', () => {
    expect(new FirebaseAuthProvider(CFG).name).toBe('firebase');
  });

  describe('authenticate', () => {
    it('returns authenticated on success', async () => {
      mockFetch([{
        ok: true,
        json: { localId: 'fb-uid-1', email: 'a@firebase.com', idToken: 'id.tok', refreshToken: 'ref.tok', expiresIn: '3600' },
      }]);
      const result = await new FirebaseAuthProvider(CFG).authenticate({ email: 'a@firebase.com', password: 'pw' });
      expect(result.status).toBe('authenticated');
      expect(result.user?.email).toBe('a@firebase.com');
      expect(result.token?.accessToken).toBe('id.tok');
    });

    it('throws InvalidCredentialsError on INVALID_PASSWORD', async () => {
      mockFetch([{ ok: false, json: { error: { message: 'INVALID_PASSWORD' } } }]);
      await expect(new FirebaseAuthProvider(CFG).authenticate({ email: 'x@x.com', password: 'bad' })).rejects.toThrow();
    });

    it('throws when email or password missing', async () => {
      await expect(new FirebaseAuthProvider(CFG).authenticate({ email: 'x@x.com' })).rejects.toThrow();
      await expect(new FirebaseAuthProvider(CFG).authenticate({ password: 'pw' })).rejects.toThrow();
    });

    it('supports custom mapUser', async () => {
      mockFetch([{
        ok: true,
        json: { localId: 'uid2', email: 'b@fb.com', idToken: 'tok', refreshToken: 'ref', expiresIn: '3600' },
      }]);
      const p = new FirebaseAuthProvider({
        ...CFG,
        mapUser: (u) => ({ id: `custom:${u['localId']}`, roles: ['firebase_user'], permissions: [] }),
      });
      const result = await p.authenticate({ email: 'b@fb.com', password: 'pw' });
      expect(result.user?.id).toBe('custom:uid2');
    });
  });

  describe('verify', () => {
    it('returns user for valid ID token', async () => {
      mockFetch([{ ok: true, json: { sub: 'fb-sub-1', email: 'v@fb.com', name: 'Verified' } }]);
      const user = await new FirebaseAuthProvider(CFG).verify('id-token');
      expect(user.id).toBe('fb-sub-1');
    });

    it('throws TokenExpiredError on expired token', async () => {
      mockFetch([{ ok: false, json: { error: 'Token expired' } }]);
      await expect(new FirebaseAuthProvider(CFG).verify('expired')).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('returns new AuthToken', async () => {
      mockFetch([{ ok: true, json: { id_token: 'new-id', refresh_token: 'new-ref', expires_in: '3600' } }]);
      const token = await new FirebaseAuthProvider(CFG).refresh('old-refresh');
      expect(token.accessToken).toBe('new-id');
      expect(token.refreshToken).toBe('new-ref');
    });

    it('throws on invalid refresh token', async () => {
      mockFetch([{ ok: false, json: { error: 'TOKEN_EXPIRED' } }]);
      await expect(new FirebaseAuthProvider(CFG).refresh('bad')).rejects.toThrow();
    });
  });

  describe('revoke', () => {
    it('resolves (no-op)', async () => {
      await expect(new FirebaseAuthProvider(CFG).revoke('any')).resolves.toBeUndefined();
    });
  });
});
