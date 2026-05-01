"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookStrategy = void 0;
const strategy_1 = require("../strategy");
class FacebookStrategy {
    constructor() {
        this.name = 'facebook';
        this.defaultScopes = ['email', 'public_profile'];
        this.authorizationUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
        this.tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    }
    buildAuthUrl(cfg, state) {
        const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
        return `${this.authorizationUrl}?${(0, strategy_1.buildQueryString)({
            client_id: cfg.clientId,
            redirect_uri: cfg.redirectUri,
            scope: scopes.join(','),
            state,
            response_type: 'code',
        })}`;
    }
    async exchangeCode(cfg, code) {
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)(this.tokenUrl, {
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            redirect_uri: cfg.redirectUri,
            code,
        }));
    }
    async fetchProfile(accessToken) {
        const data = await (0, strategy_1.getJson)('https://graph.facebook.com/me?fields=id,name,email,picture', accessToken);
        return {
            provider: 'facebook',
            providerId: data['id'],
            email: data['email'],
            displayName: data['name'],
            avatarUrl: data['picture']?.['url'],
            raw: data,
        };
    }
    async refreshTokens(_cfg, _refreshToken) {
        throw new Error('Facebook long-lived tokens do not support standard refresh');
    }
}
exports.FacebookStrategy = FacebookStrategy;
//# sourceMappingURL=facebook.js.map