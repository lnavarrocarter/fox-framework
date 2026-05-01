/**
 * EmailOtpProvider — 6-digit OTP sent via email.
 *
 * The provider manages challenge state in-memory (swap for Redis in prod).
 * Email delivery is delegated to an injected EmailSender function so the
 * caller controls the SMTP/SES/SendGrid transport.
 */

import type { IMfaProvider, MfaChallenge, MfaEnrollment } from '@foxframework/core';
import { MfaInvalidCodeError } from '@foxframework/core';

export type EmailSender = (to: string, code: string) => Promise<void>;

export interface EmailOtpConfig {
  /** OTP validity window in milliseconds. Default: 600_000 (10 min) */
  ttlMs?: number;
  /** OTP code length. Default: 6 */
  codeLength?: number;
  sender: EmailSender;
}

interface Challenge {
  code: string;
  expiresAt: number;
  email: string;
}

export class EmailOtpProvider implements IMfaProvider {
  readonly method = 'email_otp' as const;

  private readonly ttlMs: number;
  private readonly codeLength: number;
  private readonly sender: EmailSender;

  /** userId → enrolled email */
  private readonly enrolled = new Map<string, string>();
  /** challengeId → challenge data */
  private readonly challenges = new Map<string, Challenge>();

  constructor(config: EmailOtpConfig) {
    this.ttlMs = config.ttlMs ?? 600_000;
    this.codeLength = config.codeLength ?? 6;
    this.sender = config.sender;
  }

  /** Register a user's email for OTP delivery */
  async enroll(userId: string, email?: string): Promise<MfaEnrollment> {
    if (!email) throw new Error('EmailOtpProvider.enroll requires an email address');
    this.enrolled.set(userId, email);
    return { method: 'email_otp' };
  }

  async isEnrolled(userId: string): Promise<boolean> {
    return this.enrolled.has(userId);
  }

  async generateChallenge(userId: string): Promise<MfaChallenge> {
    const email = this.enrolled.get(userId);
    if (!email) throw new Error(`User ${userId} not enrolled in Email OTP`);

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

  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new MfaInvalidCodeError('Challenge not found or already used');
    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      throw new MfaInvalidCodeError('OTP has expired');
    }
    if (challenge.code !== code) throw new MfaInvalidCodeError('Invalid OTP code');

    // Single-use: delete after successful verification
    this.challenges.delete(challengeId);
    return true;
  }

  async unenroll(userId: string): Promise<void> {
    this.enrolled.delete(userId);
  }

  async useRecoveryCode(_userId: string, _code: string): Promise<boolean> {
    // Email OTP doesn't support recovery codes (use TotpMfaProvider for that)
    return false;
  }

  async regenerateRecoveryCodes(_userId: string): Promise<string[]> {
    return [];
  }

  private _generateCode(): string {
    const max = Math.pow(10, this.codeLength);
    const num = Math.floor(Math.random() * max);
    return num.toString().padStart(this.codeLength, '0');
  }
}
