/**
 * JwtAuthProvider integration tests
 */

import { JwtAuthProvider } from '../src/jwt-auth.provider';
import { InMemoryUserStore } from '../src/user-store';

const SECRET = 'integration-secret';

function makeProvider() {
  const store = new InMemoryUserStore();
  const provider = new JwtAuthProvider(store, {
    secret: SECRET,
    accessTokenTtl: 60,
    refreshTokenTtl: 120,
    passwordHasher: 'plain', // no bcrypt in unit tests
  });
  return { store, provider };
}

describe('JwtAuthProvider', () => {
  it('has name "jwt"', () => {
    const { provider } = makeProvider();
    expect(provider.name).toBe('jwt');
  });

  describe('authenticate', () => {
    it('returns authenticated result on valid credentials', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'alice@example.com', roles: ['user'], permissions: ['read'] });
      const user = await store.findOne({ email: 'alice@example.com' });
      await store.setPassword(user!.id, 'p4ssw0rd');

      const result = await provider.authenticate({ email: 'alice@example.com', password: 'p4ssw0rd' });
      expect(result.status).toBe('authenticated');
      expect(result.user?.email).toBe('alice@example.com');
      expect(result.token?.accessToken).toBeTruthy();
    });

    it('throws on wrong password', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'bob@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'bob@x.com' });
      await store.setPassword(user!.id, 'correct');

      await expect(provider.authenticate({ email: 'bob@x.com', password: 'wrong' })).rejects.toThrow();
    });

    it('throws on unknown user', async () => {
      const { provider } = makeProvider();
      await expect(provider.authenticate({ email: 'ghost@x.com', password: 'x' })).rejects.toThrow();
    });

    it('works with username credential', async () => {
      const { store, provider } = makeProvider();
      await store.create({ username: 'charlie', roles: [], permissions: [] });
      const user = await store.findOne({ username: 'charlie' });
      await store.setPassword(user!.id, 'abc');

      const result = await provider.authenticate({ username: 'charlie', password: 'abc' });
      expect(result.status).toBe('authenticated');
    });

    it('throws when no password provided', async () => {
      const { provider } = makeProvider();
      await expect(provider.authenticate({ email: 'x@x.com' })).rejects.toThrow();
    });
  });

  describe('verify', () => {
    it('returns user for valid access token', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'v@x.com', roles: ['admin'], permissions: [] });
      const user = await store.findOne({ email: 'v@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'v@x.com', password: 'pw' }));
      const verified = await provider.verify(token!.accessToken);
      expect(verified.id).toBe(user!.id);
    });

    it('throws on revoked token', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'rv@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'rv@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'rv@x.com', password: 'pw' }));
      await provider.revoke(token!.accessToken);
      await expect(provider.verify(token!.accessToken)).rejects.toThrow();
    });

    it('throws when refresh token is passed to verify', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'rt@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'rt@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'rt@x.com', password: 'pw' }));
      await expect(provider.verify(token!.refreshToken!)).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('issues new token pair from refresh token', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'ref@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'ref@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'ref@x.com', password: 'pw' }));
      const newToken = await provider.refresh(token!.refreshToken!);
      expect(newToken.accessToken).toBeTruthy();
      // Verify the new token is usable
      const user2 = await provider.verify(newToken.accessToken);
      expect(user2.id).toBe(user!.id);
    });

    it('invalidates old refresh token after rotation', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'rot@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'rot@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'rot@x.com', password: 'pw' }));
      await provider.refresh(token!.refreshToken!);
      await expect(provider.refresh(token!.refreshToken!)).rejects.toThrow();
    });

    it('throws when access token is passed to refresh', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'at@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'at@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'at@x.com', password: 'pw' }));
      await expect(provider.refresh(token!.accessToken)).rejects.toThrow();
    });
  });

  describe('revoke', () => {
    it('prevents use of revoked token', async () => {
      const { store, provider } = makeProvider();
      await store.create({ email: 'rev2@x.com', roles: [], permissions: [] });
      const user = await store.findOne({ email: 'rev2@x.com' });
      await store.setPassword(user!.id, 'pw');

      const { token } = (await provider.authenticate({ email: 'rev2@x.com', password: 'pw' }));
      await provider.revoke(token!.refreshToken!);
      await expect(provider.refresh(token!.refreshToken!)).rejects.toThrow();
    });
  });
});
