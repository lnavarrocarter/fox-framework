"use strict";
/**
 * OAuthProvider — IOAuthProvider implementation.
 *
 * Wraps any OAuthStrategy and bridges it to the Fox Framework auth interfaces.
 * On successful callback it upserts the user in an optional IUserStore.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthProvider = void 0;
const core_1 = require("@foxframework/core");
function defaultMapProfile(profile) {
    return {
        id: `${profile.provider}:${profile.providerId}`,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        roles: [],
        permissions: [],
        metadata: { provider: profile.provider, providerId: profile.providerId },
    };
}
class OAuthProvider {
    constructor(strategy, config) {
        this.strategy = strategy;
        this.cfg = config;
        this.store = config.store;
        this.name = `oauth:${strategy.name}`;
    }
    // -------------------------------------------------------------------------
    // IOAuthProvider
    // -------------------------------------------------------------------------
    getAuthorizationUrl(state, pkceChallenge) {
        return this.strategy.buildAuthUrl(this.cfg, state, pkceChallenge);
    }
    async handleCallback(code, _state, pkceVerifier) {
        let tokens;
        try {
            tokens = await this.strategy.exchangeCode(this.cfg, code, pkceVerifier);
        }
        catch (err) {
            throw new core_1.OAuthError(`Code exchange failed: ${err.message}`);
        }
        let profile;
        try {
            profile = await this.strategy.fetchProfile(tokens.accessToken);
        }
        catch (err) {
            throw new core_1.OAuthError(`Profile fetch failed: ${err.message}`);
        }
        const mapper = this.cfg.mapProfile ?? defaultMapProfile;
        const user = mapper(profile, tokens);
        if (this.store) {
            await this._upsert(user);
        }
        const authToken = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: 'Bearer',
            expiresIn: tokens.expiresIn ?? 3600,
            issuedAt: new Date().toISOString(),
            scope: tokens.scope,
        };
        return { status: 'authenticated', user, token: authToken };
    }
    async getUserProfile(accessToken) {
        return this.strategy.fetchProfile(accessToken);
    }
    async refreshOAuthToken(refreshToken) {
        return this.strategy.refreshTokens(this.cfg, refreshToken);
    }
    // -------------------------------------------------------------------------
    // IAuthProvider — minimal implementations for interface compliance
    // -------------------------------------------------------------------------
    async authenticate(_credentials) {
        throw new core_1.OAuthError(`${this.name}: use getAuthorizationUrl() + handleCallback() for OAuth flows`);
    }
    async verify(_token) {
        // OAuth access tokens are opaque; fetch profile instead
        const profile = await this.getUserProfile(_token);
        return (this.cfg.mapProfile ?? defaultMapProfile)(profile, { accessToken: _token });
    }
    async refresh(refreshToken) {
        const tokens = await this.refreshOAuthToken(refreshToken);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: 'Bearer',
            expiresIn: tokens.expiresIn ?? 3600,
            issuedAt: new Date().toISOString(),
            scope: tokens.scope,
        };
    }
    async revoke(_token) {
        // Provider-specific revocation not implemented here; override if needed
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    async _upsert(user) {
        if (!this.store)
            return;
        const existing = await this.store.findOne({ id: user.id });
        if (existing) {
            await this.store.update(user.id, {
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                metadata: user.metadata,
            });
        }
        else {
            const input = {
                email: user.email,
                displayName: user.displayName,
                roles: user.roles,
                permissions: user.permissions,
                metadata: user.metadata,
            };
            await this.store.create(input);
        }
    }
}
exports.OAuthProvider = OAuthProvider;
//# sourceMappingURL=oauth.provider.js.map