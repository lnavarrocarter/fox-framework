/**
 * TokenService — signs, verifies and builds AuthTokens using jsonwebtoken.
 */

import jwt from 'jsonwebtoken';
import type { AuthToken } from '@foxframework/core';

export interface TokenServiceConfig {
  /** Secret key (HS256/HS384/HS512) or PEM private key (RS/ES) */
  secret: string;
  /** Access token TTL in seconds. Default: 3600 (1 h) */
  accessTokenTtl?: number;
  /** Refresh token TTL in seconds. Default: 604800 (7 d) */
  refreshTokenTtl?: number;
  /** JWT algorithm. Default: 'HS256' */
  algorithm?: jwt.Algorithm;
  /** JWT issuer claim */
  issuer?: string;
  /** JWT audience claim (single string only for jsonwebtoken compat) */
  audience?: string;
}

export interface TokenPayload {
  sub: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  [key: string]: unknown;
}

export class TokenService {
  private readonly cfg: Required<Omit<TokenServiceConfig, 'issuer' | 'audience'>> &
    Pick<TokenServiceConfig, 'issuer' | 'audience'>;

  constructor(config: TokenServiceConfig) {
    this.cfg = {
      secret: config.secret,
      accessTokenTtl: config.accessTokenTtl ?? 3600,
      refreshTokenTtl: config.refreshTokenTtl ?? 604800,
      algorithm: config.algorithm ?? 'HS256',
      issuer: config.issuer,
      audience: config.audience,
    };
  }

  sign(payload: Omit<TokenPayload, 'type'>, type: 'access' | 'refresh' = 'access'): string {
    const ttl = type === 'access' ? this.cfg.accessTokenTtl : this.cfg.refreshTokenTtl;
    return jwt.sign(
      { ...payload, type },
      this.cfg.secret,
      {
        algorithm: this.cfg.algorithm,
        expiresIn: ttl,
        ...(this.cfg.issuer ? { issuer: this.cfg.issuer } : {}),
        ...(this.cfg.audience ? { audience: this.cfg.audience } : {}),
      } as jwt.SignOptions,
    );
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.cfg.secret, {
      algorithms: [this.cfg.algorithm],
      ...(this.cfg.issuer ? { issuer: this.cfg.issuer } : {}),
      ...(this.cfg.audience ? { audience: this.cfg.audience } : {}),
    } as jwt.VerifyOptions) as unknown as TokenPayload;
    return decoded;
  }

  decode(token: string): TokenPayload | null {
    return jwt.decode(token) as TokenPayload | null;
  }

  buildAuthToken(
    userId: string,
    roles: string[],
    permissions: string[],
    extra?: Record<string, unknown>,
  ): AuthToken {
    const payload: Omit<TokenPayload, 'type'> = { sub: userId, roles, permissions, ...extra };
    const accessToken = this.sign(payload, 'access');
    const refreshToken = this.sign(payload, 'refresh');

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.cfg.accessTokenTtl,
      issuedAt: new Date().toISOString(),
      scope: [...roles, ...permissions],
    };
  }
}
