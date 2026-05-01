/**
 * EmailOtpProvider — 6-digit OTP sent via email.
 *
 * The provider manages challenge state in-memory (swap for Redis in prod).
 * Email delivery is delegated to an injected EmailSender function so the
 * caller controls the SMTP/SES/SendGrid transport.
 */
import type { IMfaProvider, MfaChallenge, MfaEnrollment } from '@foxframework/core';
export type EmailSender = (to: string, code: string) => Promise<void>;
export interface EmailOtpConfig {
    /** OTP validity window in milliseconds. Default: 600_000 (10 min) */
    ttlMs?: number;
    /** OTP code length. Default: 6 */
    codeLength?: number;
    sender: EmailSender;
}
export declare class EmailOtpProvider implements IMfaProvider {
    readonly method: "email_otp";
    private readonly ttlMs;
    private readonly codeLength;
    private readonly sender;
    /** userId → enrolled email */
    private readonly enrolled;
    /** challengeId → challenge data */
    private readonly challenges;
    constructor(config: EmailOtpConfig);
    /** Register a user's email for OTP delivery */
    enroll(userId: string, email?: string): Promise<MfaEnrollment>;
    isEnrolled(userId: string): Promise<boolean>;
    generateChallenge(userId: string): Promise<MfaChallenge>;
    verifyChallenge(challengeId: string, code: string): Promise<boolean>;
    unenroll(userId: string): Promise<void>;
    useRecoveryCode(_userId: string, _code: string): Promise<boolean>;
    regenerateRecoveryCodes(_userId: string): Promise<string[]>;
    private _generateCode;
}
//# sourceMappingURL=email-otp.provider.d.ts.map