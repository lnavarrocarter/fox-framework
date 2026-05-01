/**
 * InMemoryUserStore — development / test implementation of IUserStore.
 * Stores password hashes in-process. Not suitable for production.
 */

import type { IUserStore, AuthUser, UserStoreQuery, CreateUserInput, UpdateUserInput } from '@foxframework/core';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface StoredUser extends AuthUser {
  passwordHash?: string;
}

export class InMemoryUserStore implements IUserStore {
  private readonly users = new Map<string, StoredUser>();
  private hasher?: { hash(p: string): Promise<string>; compare(p: string, h: string): Promise<boolean> };

  /** Inject a hasher (set by JwtAuthProvider so verifyPassword / setPassword work) */
  _setHasher(h: typeof this.hasher): void {
    this.hasher = h;
  }

  /** Seed users directly (useful in tests) */
  seed(users: Array<AuthUser & { passwordHash?: string }>): void {
    for (const u of users) this.users.set(u.id, { ...u });
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async findOne(query: UserStoreQuery): Promise<AuthUser | null> {
    for (const u of this.users.values()) {
      if (query.id && u.id !== query.id) continue;
      if (query.email && u.email !== query.email) continue;
      if (query.username && u.username !== query.username) continue;
      if (query.role && !u.roles.includes(query.role)) continue;
      return u;
    }
    return null;
  }

  async findMany(query: UserStoreQuery): Promise<AuthUser[]> {
    const results: AuthUser[] = [];
    for (const u of this.users.values()) {
      if (query.id && u.id !== query.id) continue;
      if (query.email && u.email !== query.email) continue;
      if (query.username && u.username !== query.username) continue;
      if (query.role && !u.roles.includes(query.role)) continue;
      results.push(u);
    }
    return results;
  }

  async create(input: CreateUserInput): Promise<AuthUser> {
    const id = generateId();
    const user: StoredUser = {
      id,
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      roles: input.roles ?? [],
      permissions: input.permissions ?? [],
      metadata: input.metadata,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return this._strip(user);
  }

  async update(id: string, input: UpdateUserInput): Promise<AuthUser> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found`);
    const updated: StoredUser = {
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return this._strip(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async verifyPassword(id: string, plainPassword: string): Promise<boolean> {
    const u = this.users.get(id);
    if (!u?.passwordHash) return false;
    if (!this.hasher) throw new Error('No hasher configured on InMemoryUserStore');
    return this.hasher.compare(plainPassword, u.passwordHash);
  }

  async setPassword(id: string, plainPassword: string): Promise<void> {
    const u = this.users.get(id);
    if (!u) throw new Error(`User ${id} not found`);
    if (!this.hasher) throw new Error('No hasher configured on InMemoryUserStore');
    const hash = await this.hasher.hash(plainPassword);
    this.users.set(id, { ...u, passwordHash: hash });
  }

  /** Strip internal fields before returning to callers */
  private _strip(u: StoredUser): AuthUser {
    const { passwordHash: _pw, ...rest } = u;
    return rest;
  }
}
