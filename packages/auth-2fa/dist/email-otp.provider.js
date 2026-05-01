"use strict";
/**
 * EmailOtpProvider — 6-digit OTP sent via email.
 *
 * The provider manages challenge state in-memory (swap for Redis in prod).
 * Email delivery is delegated to an injected EmailSender function so the
 * caller controls the SMTP/SES/SendGrid transport.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOtpProvider = void 0;
const core_1 = require("@foxframework/core");
class EmailOtpProvider {
    constructor(config) {
        this.method = 'email_otp';
        /** userId → enrolled email */
        this.enrolled = new Map();
        /** challengeId → challenge data */
        this.challenges = new Map();
        this.ttlMs = config.ttlMs ?? 600000;
        this.codeLength = config.codeLength ?? 6;
        this.sender = config.sender;
    }
    /** Register a user's email for OTP delivery */
    async enroll(userId, email) {
        if (!email)
            throw new Error('EmailOtpProvider.enroll requires an email address');
        this.enrolled.set(userId, email);
        return { method: 'email_otp' };
    }
    async isEnrolled(userId) {
        return this.enrolled.has(userId);
    }
    async generateChallenge(userId) {
        const email = this.enrolled.get(userId);
        if (!email)
            throw new Error(`User ${userId} not enrolled in Email OTP`);
        const code = this._generateCode();
        const challengeId = `email_otp:${userId}:${Date.now()}`;
        const expiresAt = Date.now() + this.ttlMs;
        this.challenges.set(challengeId, { code, expiresAt, email });
        await this.sender(email, code);
        const dest = email.replace(/^(.).*@/, '$1***@');
        return {
            challengeId,
            method: 'email_otp',
            expiresAt: new Date(expiresAt).toISOString(),
            destination: dest,
        };
    }
    async verifyChallenge(challengeId, code) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge)
            throw new core_1.MfaInvalidCodeError('Challenge not found or already used');
        if (Date.now() > challenge.expiresAt) {
            this.challenges.delete(challengeId);
            throw new core_1.MfaInvalidCodeError('OTP has expired');
        }
        if (challenge.code !== code)
            throw new core_1.MfaInvalidCodeError('Invalid OTP code');
        // Single-use: delete after successful verification
        this.challenges.delete(challengeId);
        return true;
    }
    async unenroll(userId) {
        this.enrolled.delete(userId);
    }
    async useRecoveryCode(_userId, _code) {
        // Email OTP doesn't support recovery codes (use TotpMfaProvider for that)
        return false;
    }
    async regenerateRecoveryCodes(_userId) {
        return [];
    }
    _generateCode() {
        const max = Math.pow(10, this.codeLength);
        const num = Math.floor(Math.random() * max);
        return num.toString().padStart(this.codeLength, '0');
    }
}
exports.EmailOtpProvider = EmailOtpProvider;
//# sourceMappingURL=email-otp.provider.js.map