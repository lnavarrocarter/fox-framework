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
export declare class TokenService {
    private readonly cfg;
    constructor(config: TokenServiceConfig);
    sign(payload: Omit<TokenPayload, 'type'>, type?: 'access' | 'refresh'): string;
    verify(token: string): TokenPayload;
    decode(token: string): TokenPayload | null;
    buildAuthToken(userId: string, roles: string[], permissions: string[], extra?: Record<string, unknown>): AuthToken;
}
//# sourceMappingURL=token.service.d.ts.map