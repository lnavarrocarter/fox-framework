"use strict";
/**
 * TokenService — signs, verifies and builds AuthTokens using jsonwebtoken.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class TokenService {
    constructor(config) {
        this.cfg = {
            secret: config.secret,
            accessTokenTtl: config.accessTokenTtl ?? 3600,
            refreshTokenTtl: config.refreshTokenTtl ?? 604800,
            algorithm: config.algorithm ?? 'HS256',
            issuer: config.issuer,
            audience: config.audience,
        };
    }
    sign(payload, type = 'access') {
        const ttl = type === 'access' ? this.cfg.accessTokenTtl : this.cfg.refreshTokenTtl;
        return jsonwebtoken_1.default.sign({ ...payload, type }, this.cfg.secret, {
            algorithm: this.cfg.algorithm,
            expiresIn: ttl,
            ...(this.cfg.issuer ? { issuer: this.cfg.issuer } : {}),
            ...(this.cfg.audience ? { audience: this.cfg.audience } : {}),
        });
    }
    verify(token) {
        const decoded = jsonwebtoken_1.default.verify(token, this.cfg.secret, {
            algorithms: [this.cfg.algorithm],
            ...(this.cfg.issuer ? { issuer: this.cfg.issuer } : {}),
            ...(this.cfg.audience ? { audience: this.cfg.audience } : {}),
        });
        return decoded;
    }
    decode(token) {
        return jsonwebtoken_1.default.decode(token);
    }
    buildAuthToken(userId, roles, permissions, extra) {
        const payload = { sub: userId, roles, permissions, ...extra };
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
exports.TokenService = TokenService;
//# sourceMappingURL=token.service.js.map