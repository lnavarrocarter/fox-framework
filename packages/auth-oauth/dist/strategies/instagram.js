"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramStrategy = void 0;
const strategy_1 = require("../strategy");
class InstagramStrategy {
    constructor() {
        this.name = 'instagram';
        this.defaultScopes = ['user_profile', 'user_media'];
        this.authorizationUrl = 'https://api.instagram.com/oauth/authorize';
        this.tokenUrl = 'https://api.instagram.com/oauth/access_token';
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
            grant_type: 'authorization_code',
            code,
        }));
    }
    async fetchProfile(accessToken) {
        const data = await (0, strategy_1.getJson)(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`, accessToken);
        return {
            provider: 'instagram',
            providerId: data['id'],
            displayName: data['username'],
            raw: data,
        };
    }
    async refreshTokens(_cfg, refreshToken) {
        return (0, strategy_1.parseTokenResponse)(await (0, strategy_1.postForm)('https://graph.instagram.com/refresh_access_token', {
            grant_type: 'ig_refresh_token',
            access_token: refreshToken,
        }));
    }
}
exports.InstagramStrategy = InstagramStrategy;
//# sourceMappingURL=instagram.js.map