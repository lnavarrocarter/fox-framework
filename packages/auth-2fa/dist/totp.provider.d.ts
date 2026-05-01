/**
 * TotpMfaProvider — TOTP-based MFA using otplib.
 *
 * Enrollment: generates a secret and an otpauth:// URI (for QR code).
 * Verification: accepts a 6-digit TOTP code (window ±1 step).
 * Recovery codes: 8 random codes, stored hashed (plain hash in this impl; swap for bcrypt in prod).
 */
import type { IMfaProvider, MfaChallenge, MfaEnrollment } from '@foxframework/core';
export interface TotpMfaProviderConfig {
    /** App/issuer name shown in authenticator apps */
    issuer?: string;
    /** TOTP step size in seconds. Default: 30 */
    step?: number;
    /** Allowed time window (steps). Default: 1 */
    window?: number;
    /** Number of recovery codes to generate on enrollment. Default: 8 */
    recoveryCodeCount?: number;
}
export declare class TotpMfaProvider implements IMfaProvider {
    readonly method: "totp";
    private readonly issuer;
    private readonly recoveryCodeCount;
    private readonly enrollments;
    constructor(config?: TotpMfaProviderConfig);
    enroll(userId: string): Promise<MfaEnrollment>;
    isEnrolled(userId: string): Promise<boolean>;
    generateChallenge(userId: string): Promise<MfaChallenge>;
    verifyChallenge(_challengeId: string, code: string): Promise<boolean>;
    unenroll(userId: string): Promise<void>;
    useRecoveryCode(userId: string, code: string): Promise<boolean>;
    regenerateRecoveryCodes(userId: string): Promise<string[]>;
}
//# sourceMappingURL=totp.provider.d.ts.map