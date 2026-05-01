"use strict";
/**
 * InMemoryUserStore — development / test implementation of IUserStore.
 * Stores password hashes in-process. Not suitable for production.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryUserStore = void 0;
function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
class InMemoryUserStore {
    constructor() {
        this.users = new Map();
    }
    /** Inject a hasher (set by JwtAuthProvider so verifyPassword / setPassword work) */
    _setHasher(h) {
        this.hasher = h;
    }
    /** Seed users directly (useful in tests) */
    seed(users) {
        for (const u of users)
            this.users.set(u.id, { ...u });
    }
    async findById(id) {
        return this.users.get(id) ?? null;
    }
    async findOne(query) {
        for (const u of this.users.values()) {
            if (query.id && u.id !== query.id)
                continue;
            if (query.email && u.email !== query.email)
                continue;
            if (query.username && u.username !== query.username)
                continue;
            if (query.role && !u.roles.includes(query.role))
                continue;
            return u;
        }
        return null;
    }
    async findMany(query) {
        const results = [];
        for (const u of this.users.values()) {
            if (query.id && u.id !== query.id)
                continue;
            if (query.email && u.email !== query.email)
                continue;
            if (query.username && u.username !== query.username)
                continue;
            if (query.role && !u.roles.includes(query.role))
                continue;
            results.push(u);
        }
        return results;
    }
    async create(input) {
        const id = generateId();
        const user = {
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
    async update(id, input) {
        const existing = this.users.get(id);
        if (!existing)
            throw new Error(`User ${id} not found`);
        const updated = {
            ...existing,
            ...input,
            id,
            updatedAt: new Date().toISOString(),
        };
        this.users.set(id, updated);
        return this._strip(updated);
    }
    async delete(id) {
        return this.users.delete(id);
    }
    async verifyPassword(id, plainPassword) {
        const u = this.users.get(id);
        if (!u?.passwordHash)
            return false;
        if (!this.hasher)
            throw new Error('No hasher configured on InMemoryUserStore');
        return this.hasher.compare(plainPassword, u.passwordHash);
    }
    async setPassword(id, plainPassword) {
        const u = this.users.get(id);
        if (!u)
            throw new Error(`User ${id} not found`);
        if (!this.hasher)
            throw new Error('No hasher configured on InMemoryUserStore');
        const hash = await this.hasher.hash(plainPassword);
        this.users.set(id, { ...u, passwordHash: hash });
    }
    /** Strip internal fields before returning to callers */
    _strip(u) {
        const { passwordHash: _pw, ...rest } = u;
        return rest;
    }
}
exports.InMemoryUserStore = InMemoryUserStore;
//# sourceMappingURL=user-store.js.map