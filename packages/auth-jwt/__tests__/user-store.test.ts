/**
 * InMemoryUserStore unit tests
 */

import { InMemoryUserStore } from '../src/user-store';

const plainHasher = {
  hash: async (p: string) => `hashed:${p}`,
  compare: async (p: string, h: string) => h === `hashed:${p}`,
};

describe('InMemoryUserStore', () => {
  let store: InMemoryUserStore;

  beforeEach(() => {
    store = new InMemoryUserStore();
    store._setHasher(plainHasher);
  });

  it('creates and retrieves a user by id', async () => {
    const u = await store.create({ email: 'a@b.com', roles: ['user'], permissions: [] });
    const found = await store.findById(u.id);
    expect(found?.email).toBe('a@b.com');
  });

  it('findOne by email', async () => {
    await store.create({ email: 'x@y.com', roles: [], permissions: [] });
    const found = await store.findOne({ email: 'x@y.com' });
    expect(found).not.toBeNull();
  });

  it('findOne by username', async () => {
    await store.create({ username: 'alice', roles: ['admin'], permissions: [] });
    const found = await store.findOne({ username: 'alice' });
    expect(found?.username).toBe('alice');
  });

  it('findMany by role', async () => {
    await store.create({ roles: ['admin'], permissions: [] });
    await store.create({ roles: ['user'], permissions: [] });
    const admins = await store.findMany({ role: 'admin' });
    expect(admins).toHaveLength(1);
  });

  it('returns null for unknown user', async () => {
    expect(await store.findById('no-such-id')).toBeNull();
    expect(await store.findOne({ email: 'none@none.com' })).toBeNull();
  });

  it('updates a user', async () => {
    const u = await store.create({ email: 'old@b.com', roles: [], permissions: [] });
    const updated = await store.update(u.id, { email: 'new@b.com' });
    expect(updated.email).toBe('new@b.com');
  });

  it('deletes a user', async () => {
    const u = await store.create({ roles: [], permissions: [] });
    const result = await store.delete(u.id);
    expect(result).toBe(true);
    expect(await store.findById(u.id)).toBeNull();
  });

  it('delete returns false for unknown id', async () => {
    expect(await store.delete('ghost')).toBe(false);
  });

  describe('password management', () => {
    it('sets and verifies a password', async () => {
      const u = await store.create({ roles: [], permissions: [] });
      await store.setPassword(u.id, 'secret123');
      expect(await store.verifyPassword(u.id, 'secret123')).toBe(true);
      expect(await store.verifyPassword(u.id, 'wrong')).toBe(false);
    });

    it('returns false for user with no password hash', async () => {
      const u = await store.create({ roles: [], permissions: [] });
      expect(await store.verifyPassword(u.id, 'anything')).toBe(false);
    });

    it('uses passwordHash from CreateUserInput when provided', async () => {
      const u = await store.create({ roles: [], permissions: [], passwordHash: 'hashed:preset' });
      expect(await store.verifyPassword(u.id, 'preset')).toBe(true);
    });
  });
});
