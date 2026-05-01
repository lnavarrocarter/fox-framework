"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftStrategy = void 0;
const strategy_1 = require("../strategy");
class MicrosoftStrategy {
    constructor() {
        this.name = 'microsoft';
        this.defaultScopes = ['openid', 'email', 'profile', 'User.Read'];
        this.authorizationUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
        this.tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    }
    buildAuthUrl(cfg, state, pkceChallenge) {
        const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
        const params = {
            client_id: cfg.clientId,
            redirect_uri: cfg.redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            state,
            response_mode: 'query',
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
            scope: this.defaultScopes.join(' '),
            code,
        };
        if (pkceVerifier)
            params['code_verifier'] = pkceVerifier;
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)(this.tokenUrl, params));
    }
    async fetchProfile(accessToken) {
        const data = await (0, strategy_1.getJson)('https://graph.microsoft.com/v1.0/me', accessToken);
        return {
            provider: 'microsoft',
            providerId: data['id'],
            email: (data['mail'] ?? data['userPrincipalName']),
            displayName: data['displayName'],
            raw: data,
        };
    }
    async refreshTokens(cfg, refreshToken) {
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)(this.tokenUrl, {
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            grant_type: 'refresh_token',
            scope: this.defaultScopes.join(' '),
            refresh_token: refreshToken,
        }));
    }
}
exports.MicrosoftStrategy = MicrosoftStrategy;
//# sourceMappingURL=microsoft.js.map