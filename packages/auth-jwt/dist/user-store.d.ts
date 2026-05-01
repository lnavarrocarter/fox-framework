/**
 * InMemoryUserStore — development / test implementation of IUserStore.
 * Stores password hashes in-process. Not suitable for production.
 */
import type { IUserStore, AuthUser, UserStoreQuery, CreateUserInput, UpdateUserInput } from '@foxframework/core';
export declare class InMemoryUserStore implements IUserStore {
    private readonly users;
    private hasher?;
    /** Inject a hasher (set by JwtAuthProvider so verifyPassword / setPassword work) */
    _setHasher(h: typeof this.hasher): void;
    /** Seed users directly (useful in tests) */
    seed(users: Array<AuthUser & {
        passwordHash?: string;
    }>): void;
    findById(id: string): Promise<AuthUser | null>;
    findOne(query: UserStoreQuery): Promise<AuthUser | null>;
    findMany(query: UserStoreQuery): Promise<AuthUser[]>;
    create(input: CreateUserInput): Promise<AuthUser>;
    update(id: string, input: UpdateUserInput): Promise<AuthUser>;
    delete(id: string): Promise<boolean>;
    verifyPassword(id: string, plainPassword: string): Promise<boolean>;
    setPassword(id: string, plainPassword: string): Promise<void>;
    /** Strip internal fields before returning to callers */
    private _strip;
}
//# sourceMappingURL=user-store.d.ts.map