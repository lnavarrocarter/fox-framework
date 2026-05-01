"use strict";
/**
 * JwtAuthProvider — IAuthProvider implementation using jsonwebtoken.
 *
 *  authenticate(credentials)  → verifies password via IUserStore, issues AuthToken
 *  verify(token)              → validates JWT, returns AuthUser
 *  refresh(token)             → rotates access/refresh pair
 *  revoke(token)              → adds token to in-process denylist
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthProvider = void 0;
const core_1 = require("@foxframework/core");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const token_service_1 = require("./token.service");
const user_store_1 = require("./user-store");
function buildHasher(cfg) {
    if ((cfg.passwordHasher ?? 'bcrypt') === 'plain') {
        return {
            hash: async (p) => p,
            compare: async (p, h) => p === h,
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require('bcrypt');
    const rounds = cfg.saltRounds ?? 12;
    return {
        hash: (p) => bcrypt.hash(p, rounds),
        compare: (p, h) => bcrypt.compare(p, h),
    };
}
class JwtAuthProvider {
    constructor(store, config) {
        this.name = 'jwt';
        /** In-process denylist — swap for Redis in production */
        this.denylist = new Set();
        this.store = store;
        this.tokenSvc = new token_service_1.TokenService(config);
        this.hasher = buildHasher(config);
        // Wire hasher into InMemoryUserStore if applicable
        if (store instanceof user_store_1.InMemoryUserStore) {
            store._setHasher(this.hasher);
        }
    }
    // -------------------------------------------------------------------------
    // IAuthProvider
    // -------------------------------------------------------------------------
    async authenticate(credentials) {
        if (!credentials.password)
            throw new core_1.InvalidCredentialsError();
        const user = credentials.email
            ? await this.store.findOne({ email: credentials.email })
            : credentials.username
                ? await this.store.findOne({ username: credentials.username })
                : null;
        if (!user)
            throw new core_1.InvalidCredentialsError();
        const match = await this.store.verifyPassword(user.id, credentials.password);
        if (!match)
            throw new core_1.InvalidCredentialsError();
        const token = this.tokenSvc.buildAuthToken(user.id, user.roles, user.permissions);
        return { status: 'authenticated', user, token };
    }
    async verify(token) {
        if (this.denylist.has(token))
            throw new core_1.TokenInvalidError('Token has been revoked');
        let payload;
        try {
            payload = this.tokenSvc.verify(token);
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError)
                throw new core_1.TokenExpiredError();
            throw new core_1.TokenInvalidError();
        }
        if (payload.type !== 'access')
            throw new core_1.TokenInvalidError('Expected access token');
        const user = await this.store.findOne({ id: payload.sub });
        if (!user)
            throw new core_1.AccountNotFoundError(payload.sub);
        return user;
    }
    async refresh(refreshToken) {
        if (this.denylist.has(refreshToken))
            throw new core_1.TokenInvalidError('Token has been revoked');
        let payload;
        try {
            payload = this.tokenSvc.verify(refreshToken);
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError)
                throw new core_1.TokenExpiredError();
            throw new core_1.TokenInvalidError();
        }
        if (payload.type !== 'refresh')
            throw new core_1.TokenInvalidError('Expected refresh token');
        const user = await this.store.findOne({ id: payload.sub });
        if (!user)
            throw new core_1.AccountNotFoundError(payload.sub);
        // Rotate: invalidate old refresh token
        this.denylist.add(refreshToken);
        return this.tokenSvc.buildAuthToken(user.id, user.roles, user.permissions);
    }
    async revoke(token) {
        this.denylist.add(token);
    }
}
exports.JwtAuthProvider = JwtAuthProvider;
//# sourceMappingURL=jwt-auth.provider.js.map