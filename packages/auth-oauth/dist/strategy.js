"use strict";
/**
 * OAuthStrategy — interface each provider strategy must implement.
 * All network calls use the global fetch (Node 18+).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQueryString = buildQueryString;
exports.postForm = postForm;
exports.getJson = getJson;
exports.parseTokenResponse = parseTokenResponse;
// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function buildQueryString(params) {
    return new URLSearchParams(params).toString();
}
async function postForm(url, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: buildQueryString(params),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OAuth token exchange failed [${response.status}]: ${body}`);
    }
    return response.json();
}
async function getJson(url, accessToken) {
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OAuth profile fetch failed [${response.status}]: ${body}`);
    }
    return response.json();
}
function parseTokenResponse(data) {
    return {
        accessToken: data['access_token'],
        refreshToken: data['refresh_token'],
        expiresIn: data['expires_in'],
        scope: typeof data['scope'] === 'string' ? data['scope'].split(' ') : undefined,
        tokenType: data['token_type'],
    };
}
//# sourceMappingURL=strategy.js.map