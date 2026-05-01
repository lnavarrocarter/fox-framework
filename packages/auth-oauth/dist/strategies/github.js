"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubStrategy = void 0;
const strategy_1 = require("../strategy");
class GitHubStrategy {
    constructor() {
        this.name = 'github';
        this.defaultScopes = ['read:user', 'user:email'];
        this.authorizationUrl = 'https://github.com/login/oauth/authorize';
        this.tokenUrl = 'https://github.com/login/oauth/access_token';
    }
    buildAuthUrl(cfg, state) {
        const scopes = [...this.defaultScopes, ...(cfg.scopes ?? [])];
        return `${this.authorizationUrl}?${(0, strategy_1.buildQueryString)({
            client_id: cfg.clientId,
            redirect_uri: cfg.redirectUri,
            scope: scopes.join(' '),
            state,
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
        const [user, emails] = await Promise.all([
            (0, strategy_1.getJson)('https://api.github.com/user', accessToken),
            (0, strategy_1.getJson)('https://api.github.com/user/emails', accessToken).catch(() => []),
        ]);
        const primary = Array.isArray(emails)
            ? emails.find((e) => e.primary)?.email
            : undefined;
        return {
            provider: 'github',
            providerId: String(user['id']),
            email: primary ?? user['email'],
            displayName: user['name'] ?? user['login'],
            avatarUrl: user['avatar_url'],
            raw: user,
        };
    }
    async refreshTokens(_cfg, _refreshToken) {
        throw new Error('GitHub OAuth does not support token refresh');
    }
}
exports.GitHubStrategy = GitHubStrategy;
//# sourceMappingURL=github.js.map