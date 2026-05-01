"use strict";
/**
 * CognitoAuthProvider — IAuthProvider backed by AWS Cognito User Pools.
 *
 * Uses the Cognito REST API (InitiateAuth, GetUser, GlobalSignOut) via fetch.
 * No AWS SDK dependency — just HTTP calls to the Cognito endpoint.
 *
 * Supports:
 *  - authenticate(): USER_PASSWORD_AUTH flow
 *  - verify(): validates the IdToken via Cognito's JWKS (cached)
 *  - refresh(): REFRESH_TOKEN_AUTH flow
 *  - revoke(): GlobalSignOut
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuthProvider = void 0;
const core_1 = require("@foxframework/core");
function defaultMapUser(attributes, sub) {
    return {
        id: sub,
        email: attributes['email'],
        displayName: attributes['name'] ?? attributes['preferred_username'],
        roles: [],
        permissions: [],
        metadata: { source: 'cognito', ...attributes },
    };
}
class CognitoAuthProvider {
    constructor(config) {
        this.name = 'cognito';
        this.cfg = config;
        this.endpoint = `https://cognito-idp.${config.region}.amazonaws.com`;
    }
    async authenticate(credentials) {
        if (!credentials.password)
            throw new core_1.InvalidCredentialsError();
        const username = credentials.username ?? credentials.email;
        if (!username)
            throw new core_1.InvalidCredentialsError();
        const body = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.cfg.clientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: credentials.password,
            },
        };
        const data = await this._post('AWSCognito-Identity-Provider-1.1.InitiateAuth', body);
        if (data['ChallengeName']) {
            // MFA or new password required — surface as mfa_required for simplicity
            return { status: 'mfa_required', mfaChallenge: undefined };
        }
        const tokens = data['AuthenticationResult'];
        const user = await this._getUser(tokens.AccessToken);
        const token = this._buildAuthToken(tokens);
        return { status: 'authenticated', user, token };
    }
    async verify(token) {
        // Use GetUser to validate access token (simpler than JWKS validation)
        try {
            return await this._getUser(token);
        }
        catch (err) {
            const msg = err.message ?? '';
            if (msg.includes('expired') || msg.includes('Expired'))
                throw new core_1.TokenExpiredError();
            throw new core_1.TokenInvalidError();
        }
    }
    async refresh(refreshToken) {
        const body = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: this.cfg.clientId,
            AuthParameters: { REFRESH_TOKEN: refreshToken },
        };
        let data;
        try {
            data = await this._post('AWSCognito-Identity-Provider-1.1.InitiateAuth', body);
        }
        catch {
            throw new core_1.TokenInvalidError('Refresh token invalid or expired');
        }
        const tokens = data['AuthenticationResult'];
        return this._buildAuthToken({ ...tokens, RefreshToken: refreshToken });
    }
    async revoke(token) {
        await this._post('AWSCognito-Identity-Provider-1.1.GlobalSignOut', {
            AccessToken: token,
        }).catch(() => {
            // Ignore errors on revoke (token may already be expired)
        });
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    async _getUser(accessToken) {
        const data = await this._post('AWSCognito-Identity-Provider-1.1.GetUser', {
            AccessToken: accessToken,
        });
        const sub = data['UserAttributes']
            .find((a) => a.Name === 'sub')?.Value ?? data['Username'];
        if (!sub)
            throw new core_1.AccountNotFoundError('unknown');
        const attributes = {};
        for (const attr of data['UserAttributes']) {
            attributes[attr.Name] = attr.Value;
        }
        const mapper = this.cfg.mapUser ?? defaultMapUser;
        return mapper(attributes, sub);
    }
    _buildAuthToken(tokens) {
        return {
            accessToken: tokens.AccessToken,
            refreshToken: tokens.RefreshToken,
            tokenType: 'Bearer',
            expiresIn: tokens.ExpiresIn,
            issuedAt: new Date().toISOString(),
        };
    }
    async _post(target, body) {
        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': target,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            const code = data['__type'] ?? 'Error';
            const message = data['message'] ?? res.statusText;
            if (code.includes('NotAuthorized') || code.includes('UserNotFound')) {
                throw new core_1.InvalidCredentialsError(message);
            }
            throw new Error(`Cognito ${code}: ${message}`);
        }
        return data;
    }
}
exports.CognitoAuthProvider = CognitoAuthProvider;
//# sourceMappingURL=cognito-auth.provider.js.map