"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const strategy_1 = require("../strategy");
class GoogleStrategy {
    constructor() {
        this.name = 'google';
        this.defaultScopes = ['openid', 'email', 'profile'];
        this.authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        this.tokenUrl = 'https://oauth2.googleapis.com/token';
    }
    buildAuthUrl(cfg, state, pkceChallenge) {
        const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
        const params = {
            client_id: cfg.clientId,
            redirect_uri: cfg.redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            state,
            access_type: 'offline',
            prompt: 'consent',
        };
        if (pkceChallenge) {
            params['code_challenge'] = pkceChallenge;
            params['code_challenge_method'] = 'S256';
        }
        return `${this.authorizationUrl}?${(0, strategy_1.buildQueryString)(params)}`;
    }
    async exchangeCode(cfg, code, pkceVerifier) {
        const params = {
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            redirect_uri: cfg.redirectUri,
            grant_type: 'authorization_code',
            code,
        };
        if (pkceVerifier)
            params['code_verifier'] = pkceVerifier;
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)(this.tokenUrl, params));
    }
    async fetchProfile(accessToken) {
        const data = await (0, strategy_1.getJson)('https://www.googleapis.com/oauth2/v3/userinfo', accessToken);
        return {
            provider: 'google',
            providerId: data['sub'],
            email: data['email'],
            displayName: data['name'],
            avatarUrl: data['picture'],
            raw: data,
        };
    }
    async refreshTokens(cfg, refreshToken) {
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)(this.tokenUrl, {
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }));
    }
}
exports.GoogleStrategy = GoogleStrategy;
//# sourceMappingURL=google.js.map