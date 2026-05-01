/**
 * JwtAuthProvider — IAuthProvider implementation using jsonwebtoken.
 *
 *  authenticate(credentials)  → verifies password via IUserStore, issues AuthToken
 *  verify(token)              → validates JWT, returns AuthUser
 *  refresh(token)             → rotates access/refresh pair
 *  revoke(token)              → adds token to in-process denylist
 */
import type { IAuthProvider, AuthUser, AuthToken, AuthResult, Credentials, IUserStore } from '@foxframework/core';
import { type TokenServiceConfig } from './token.service';
export interface JwtAuthProviderConfig extends TokenServiceConfig {
    /**
     * How to hash/verify passwords.
     * 'bcrypt' (default) requires the `bcrypt` peer dep.
     * 'plain' stores passwords as-is — FOR TESTING ONLY.
     */
    passwordHasher?: 'bcrypt' | 'plain';
    /** bcrypt salt rounds. Default: 12 */
    saltRounds?: number;
}
export declare class JwtAuthProvider implements IAuthProvider {
    readonly name = "jwt";
    private readonly tokenSvc;
    private readonly store;
    private readonly hasher;
    /** In-process denylist — swap for Redis in production */
    private readonly denylist;
    constructor(store: IUserStore, config: JwtAuthProviderConfig);
    authenticate(credentials: Credentials): Promise<AuthResult>;
    verify(token: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthToken>;
    revoke(token: string): Promise<void>;
}
//# sourceMappingURL=jwt-auth.provider.d.ts.map