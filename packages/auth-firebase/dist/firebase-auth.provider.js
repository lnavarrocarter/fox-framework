"use strict";
/**
 * FirebaseAuthProvider — IAuthProvider backed by Firebase Authentication REST API.
 *
 * Uses the Firebase Auth REST API (no firebase-admin SDK dependency).
 * For server-side token verification it validates the Firebase ID token
 * by calling the tokeninfo endpoint (simple; swap for JWKS in prod).
 *
 * Supports:
 *  - authenticate(): email/password sign-in
 *  - verify(): validates ID token via Google tokeninfo API
 *  - refresh(): exchanges a refresh token for a new ID token
 *  - revoke(): calls revokeRefreshTokens via Firebase Auth REST
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthProvider = void 0;
const core_1 = require("@foxframework/core");
const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_URL = 'https://securetoken.googleapis.com/v1';
function defaultMapUser(u) {
    return {
        id: u['localId'],
        email: u['email'],
        displayName: u['displayName'],
        avatarUrl: u['photoUrl'],
        roles: [],
        permissions: [],
        metadata: { source: 'firebase', emailVerified: u['emailVerified'] },
    };
}
class FirebaseAuthProvider {
    constructor(config) {
        this.name = 'firebase';
        this.cfg = config;
    }
    async authenticate(credentials) {
        const email = credentials.email;
        const password = credentials.password;
        if (!email || !password)
            throw new core_1.InvalidCredentialsError();
        const res = await fetch(`${IDENTITY_URL}/accounts:signInWithPassword?key=${this.cfg.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        const data = await res.json();
        if (!res.ok) {
            const code = data['error']?.['message'] ?? '';
            if (code.includes('INVALID') || code.includes('NOT_FOUND')) {
                throw new core_1.InvalidCredentialsError();
            }
            throw new Error(`Firebase signIn error: ${code}`);
        }
        const mapper = this.cfg.mapUser ?? defaultMapUser;
        const user = mapper(data);
        const token = this._buildToken(data);
        return { status: 'authenticated', user, token };
    }
    async verify(idToken) {
        // Validate via Google tokeninfo endpoint
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        const data = await res.json();
        if (!res.ok) {
            const err = data['error'] ?? '';
            if (err.includes('expired'))
                throw new core_1.TokenExpiredError();
            throw new core_1.TokenInvalidError();
        }
        return {
            id: data['sub'],
            email: data['email'],
            displayName: data['name'],
            avatarUrl: data['picture'],
            roles: [],
            permissions: [],
            metadata: { source: 'firebase' },
        };
    }
    async refresh(refreshToken) {
        const res = await fetch(`${TOKEN_URL}/token?key=${this.cfg.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
        });
        const data = await res.json();
        if (!res.ok)
            throw new core_1.TokenInvalidError('Firebase refresh token invalid');
        return {
            accessToken: data['id_token'],
            refreshToken: data['refresh_token'],
            tokenType: 'Bearer',
            expiresIn: Number(data['expires_in'] ?? 3600),
            issuedAt: new Date().toISOString(),
        };
    }
    async revoke(_token) {
        // Firebase doesn't offer a direct "revoke single token" REST endpoint.
        // revokeRefreshTokens is an Admin SDK operation. No-op here.
    }
    _buildToken(data) {
        return {
            accessToken: data['idToken'],
            refreshToken: data['refreshToken'],
            tokenType: 'Bearer',
            expiresIn: Number(data['expiresIn'] ?? 3600),
            issuedAt: new Date().toISOString(),
        };
    }
}
exports.FirebaseAuthProvider = FirebaseAuthProvider;
//# sourceMappingURL=firebase-auth.provider.js.map