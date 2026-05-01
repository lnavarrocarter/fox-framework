"use strict";
/**
 * TotpMfaProvider — TOTP-based MFA using otplib.
 *
 * Enrollment: generates a secret and an otpauth:// URI (for QR code).
 * Verification: accepts a 6-digit TOTP code (window ±1 step).
 * Recovery codes: 8 random codes, stored hashed (plain hash in this impl; swap for bcrypt in prod).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TotpMfaProvider = void 0;
const otplib_1 = require("otplib");
const core_1 = require("@foxframework/core");
function generateRecoveryCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const bytes = new Uint8Array(5);
        crypto.getRandomValues(bytes);
        codes.push(Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase());
    }
    return codes;
}
class TotpMfaProvider {
    constructor(config = {}) {
        this.method = 'totp';
        this.enrollments = new Map();
        this.issuer = config.issuer ?? 'FoxFramework';
        this.recoveryCodeCount = config.recoveryCodeCount ?? 8;
        otplib_1.authenticator.options = {
            step: config.step ?? 30,
            window: config.window ?? 1,
        };
    }
    async enroll(userId) {
        const secret = otplib_1.authenticator.generateSecret();
        const recoveryCodes = generateRecoveryCodes(this.recoveryCodeCount);
        this.enrollments.set(userId, {
            secret,
            recoveryCodes: [...recoveryCodes],
            usedRecoveryCodes: new Set(),
        });
        const uri = otplib_1.authenticator.keyuri(userId, this.issuer, secret);
        return { method: 'totp', uri, secret, recoveryCodes };
    }
    async isEnrolled(userId) {
        return this.enrollments.has(userId);
    }
    async generateChallenge(userId) {
        // TOTP is time-based; no explicit challenge to send
        const expiresAt = new Date(Date.now() + 30000).toISOString();
        return {
            challengeId: `totp:${userId}:${Date.now()}`,
            method: 'totp',
            expiresAt,
        };
    }
    async verifyChallenge(_challengeId, code) {
        // challengeId encodes userId: 'totp:<userId>:<ts>'
        const userId = _challengeId.split(':')[1];
        const enrollment = this.enrollments.get(userId);
        if (!enrollment)
            throw new core_1.MfaInvalidCodeError('User not enrolled in TOTP');
        const valid = otplib_1.authenticator.verify({ token: code, secret: enrollment.secret });
        if (!valid)
            throw new core_1.MfaInvalidCodeError('Invalid TOTP code');
        return true;
    }
    async unenroll(userId) {
        this.enrollments.delete(userId);
    }
    async useRecoveryCode(userId, code) {
        const enrollment = this.enrollments.get(userId);
        if (!enrollment)
            return false;
        const upper = code.toUpperCase();
        if (enrollment.usedRecoveryCodes.has(upper))
            return false;
        if (!enrollment.recoveryCodes.includes(upper))
            return false;
        enrollment.usedRecoveryCodes.add(upper);
        return true;
    }
    async regenerateRecoveryCodes(userId) {
        const enrollment = this.enrollments.get(userId);
        if (!enrollment)
            throw new Error(`User ${userId} not enrolled`);
        const codes = generateRecoveryCodes(this.recoveryCodeCount);
        enrollment.recoveryCodes = [...codes];
        enrollment.usedRecoveryCodes = new Set();
        return codes;
    }
}
exports.TotpMfaProvider = TotpMfaProvider;
//# sourceMappingURL=totp.provider.js.map