/**
 * LdapAuthProvider unit tests — ldapts is fully mocked
 */

import { LdapAuthProvider } from '../src/ldap-auth.provider';
import type { IUserStore, AuthUser, CreateUserInput, UpdateUserInput, UserStoreQuery } from '@foxframework/core';

// ---------------------------------------------------------------------------
// Mock ldapts
// ---------------------------------------------------------------------------

const mockBind = jest.fn();
const mockUnbind = jest.fn();
const mockSearch = jest.fn();

jest.mock('ldapts', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bind: mockBind,
    unbind: mockUnbind,
    search: mockSearch,
  })),
}), { virtual: true });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CFG = {
  url: 'ldap://localhost:389',
  baseDn: 'ou=users,dc=example,dc=com',
  bindDn: 'cn=admin,dc=example,dc=com',
  bindPassword: 'admin-pw',
};

const ENTRY = {
  dn: 'cn=alice,ou=users,dc=example,dc=com',
  sAMAccountName: 'alice',
  mail: 'alice@example.com',
  cn: 'Alice Smith',
  givenName: 'Alice',
  sn: 'Smith',
  memberOf: ['cn=devs,ou=groups,dc=example,dc=com'],
};

// ---------------------------------------------------------------------------
// InMemory store stub
// ---------------------------------------------------------------------------

function makeStore(): IUserStore & { users: AuthUser[] } {
  const users: AuthUser[] = [];
  return {
    users,
    findById: async (id) => users.find((u) => u.id === id) ?? null,
    findOne: async (q: UserStoreQuery) => users.find((u) => (!q.username || u.username === q.username)) ?? null,
    findMany: async () => users,
    create: async (input: CreateUserInput) => {
      const u: AuthUser = { id: `id-${Date.now()}`, roles: [], permissions: [], ...input };
      users.push(u);
      return u;
    },
    update: async (id: string, input: UpdateUserInput) => {
      const u = users.find((x) => x.id === id)!;
      Object.assign(u, input);
      return u;
    },
    delete: async (id: string) => { const i = users.findIndex((x) => x.id === id); if (i >= 0) users.splice(i, 1); return i >= 0; },
    verifyPassword: async () => false,
    setPassword: async () => {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockBind.mockResolvedValue(undefined);
  mockUnbind.mockResolvedValue(undefined);
  mockSearch.mockResolvedValue({ searchEntries: [ENTRY] });
});

afterEach(() => jest.clearAllMocks());

describe('LdapAuthProvider', () => {
  it('name is "ldap"', () => {
    expect(new LdapAuthProvider(CFG).name).toBe('ldap');
  });

  describe('connect / disconnect', () => {
    it('binds with service credentials on connect', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      expect(mockBind).toHaveBeenCalledWith(CFG.bindDn, CFG.bindPassword);
      expect(p.isConnected).toBe(true);
    });

    it('unbinds on disconnect', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      await p.disconnect();
      expect(p.isConnected).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('returns mapped DirectoryUser array', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      const users = await p.searchUsers({ username: 'alice' });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('alice');
      expect(users[0].email).toBe('alice@example.com');
      expect(users[0].groups).toContain('cn=devs,ou=groups,dc=example,dc=com');
    });
  });

  describe('getUser', () => {
    it('returns a DirectoryUser by username', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      const user = await p.getUser('alice');
      expect(user?.username).toBe('alice');
    });

    it('returns null when not found', async () => {
      mockSearch.mockResolvedValueOnce({ searchEntries: [] });
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      const user = await p.getUser('nobody');
      expect(user).toBeNull();
    });
  });

  describe('getGroups', () => {
    it('returns group list for a user', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      const groups = await p.getGroups('alice');
      expect(groups).toContain('cn=devs,ou=groups,dc=example,dc=com');
    });
  });

  describe('authenticate', () => {
    it('returns authenticated on valid credentials', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      const result = await p.authenticate({ username: 'alice', password: 'pw123' });
      expect(result.status).toBe('authenticated');
      expect(result.user?.username).toBe('alice');
    });

    it('throws on wrong password (second bind fails)', async () => {
      // First call: service bind (connect) ✓; second: user lookup ✓; third: user bind ✗
      mockBind
        .mockResolvedValueOnce(undefined) // service bind in connect
        .mockRejectedValueOnce(new Error('Invalid credentials')); // user bind
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      await expect(p.authenticate({ username: 'alice', password: 'wrong' })).rejects.toThrow();
    });

    it('throws when user not found', async () => {
      mockSearch.mockResolvedValueOnce({ searchEntries: [] });
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      await expect(p.authenticate({ username: 'nobody', password: 'pw' })).rejects.toThrow();
    });

    it('throws when no username or password', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      await expect(p.authenticate({})).rejects.toThrow();
    });
  });

  describe('revoke / refresh', () => {
    it('revoke resolves (no-op)', async () => {
      await expect(new LdapAuthProvider(CFG).revoke('tok')).resolves.toBeUndefined();
    });

    it('refresh throws (not supported)', async () => {
      await expect(new LdapAuthProvider(CFG).refresh('ref')).rejects.toThrow();
    });
  });

  describe('syncUsers', () => {
    it('creates new users in store', async () => {
      const store = makeStore();
      const p = new LdapAuthProvider({ ...CFG, store });
      await p.connect();
      const result = await p.syncUsers();
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(store.users).toHaveLength(1);
    });

    it('updates existing users', async () => {
      const store = makeStore();
      // Pre-populate with alice
      await store.create({ username: 'alice', roles: [], permissions: [] });
      const p = new LdapAuthProvider({ ...CFG, store });
      await p.connect();
      const result = await p.syncUsers();
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('dry run does not modify store', async () => {
      const store = makeStore();
      const p = new LdapAuthProvider({ ...CFG, store });
      await p.connect();
      await p.syncUsers({ dryRun: true });
      expect(store.users).toHaveLength(0);
    });

    it('throws when no store configured', async () => {
      const p = new LdapAuthProvider(CFG);
      await p.connect();
      await expect(p.syncUsers()).rejects.toThrow();
    });
  });

  describe('throws when not connected', () => {
    it('searchUsers throws if not connected', async () => {
      const p = new LdapAuthProvider(CFG);
      await expect(p.searchUsers({})).rejects.toThrow(/connect/);
    });
  });
});
