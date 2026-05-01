/**
 * JwtAuthProvider — IAuthProvider implementation using jsonwebtoken.
 *
 *  authenticate(credentials)  → verifies password via IUserStore, issues AuthToken
 *  verify(token)              → validates JWT, returns AuthUser
 *  refresh(token)             → rotates access/refresh pair
 *  revoke(token)              → adds token to in-process denylist
 */

import type {
  IAuthProvider,
  AuthUser,
  AuthToken,
  AuthResult,
  Credentials,
  IUserStore,
} from '@foxframework/core';
import {
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
  AccountNotFoundError,
} from '@foxframework/core';
import jwt from 'jsonwebtoken';
import { TokenService, type TokenServiceConfig } from './token.service';
import { InMemoryUserStore } from './user-store';

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

type Hasher = {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
};

function buildHasher(cfg: JwtAuthProviderConfig): Hasher {
  if ((cfg.passwordHasher ?? 'bcrypt') === 'plain') {
    return {
      hash: async (p) => p,
      compare: async (p, h) => p === h,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bcrypt = require('bcrypt') as typeof import('bcrypt');
  const rounds = cfg.saltRounds ?? 12;
  return {
    hash: (p) => bcrypt.hash(p, rounds),
    compare: (p, h) => bcrypt.compare(p, h),
  };
}

export class JwtAuthProvider implements IAuthProvider {
  readonly name = 'jwt';

  private readonly tokenSvc: TokenService;
  private readonly store: IUserStore;
  private readonly hasher: Hasher;
  /** In-process denylist — swap for Redis in production */
  private readonly denylist = new Set<string>();

  constructor(store: IUserStore, config: JwtAuthProviderConfig) {
    this.store = store;
    this.tokenSvc = new TokenService(config);
    this.hasher = buildHasher(config);

    // Wire hasher into InMemoryUserStore if applicable
    if (store instanceof InMemoryUserStore) {
      store._setHasher(this.hasher);
    }
  }

  // -------------------------------------------------------------------------
  // IAuthProvider
  // -------------------------------------------------------------------------

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    if (!credentials.password) throw new InvalidCredentialsError();

    const user = credentials.email
      ? await this.store.findOne({ email: credentials.email })
      : credentials.username
        ? await this.store.findOne({ username: credentials.username })
        : null;

    if (!user) throw new InvalidCredentialsError();

    const match = await this.store.verifyPassword(user.id, credentials.password);
    if (!match) throw new InvalidCredentialsError();

    const token = this.tokenSvc.buildAuthToken(user.id, user.roles, user.permissions);
    return { status: 'authenticated', user, token };
  }

  async verify(token: string): Promise<AuthUser> {
    if (this.denylist.has(token)) throw new TokenInvalidError('Token has been revoked');

    let payload;
    try {
      payload = this.tokenSvc.verify(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
      throw new TokenInvalidError();
    }

    if (payload.type !== 'access') throw new TokenInvalidError('Expected access token');

    const user = await this.store.findOne({ id: payload.sub });
    if (!user) throw new AccountNotFoundError(payload.sub);
    return user;
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
    if (this.denylist.has(refreshToken)) throw new TokenInvalidError('Token has been revoked');

    let payload;
    try {
      payload = this.tokenSvc.verify(refreshToken);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
      throw new TokenInvalidError();
    }

    if (payload.type !== 'refresh') throw new TokenInvalidError('Expected refresh token');

    const user = await this.store.findOne({ id: payload.sub });
    if (!user) throw new AccountNotFoundError(payload.sub);

    // Rotate: invalidate old refresh token
    this.denylist.add(refreshToken);
    return this.tokenSvc.buildAuthToken(user.id, user.roles, user.permissions);
  }

  async revoke(token: string): Promise<void> {
    this.denylist.add(token);
  }
}
