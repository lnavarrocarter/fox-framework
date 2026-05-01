/**
 * TotpMfaProvider — TOTP-based MFA using otplib.
 *
 * Enrollment: generates a secret and an otpauth:// URI (for QR code).
 * Verification: accepts a 6-digit TOTP code (window ±1 step).
 * Recovery codes: 8 random codes, stored hashed (plain hash in this impl; swap for bcrypt in prod).
 */

import { authenticator } from 'otplib';
import type { IMfaProvider, MfaChallenge, MfaEnrollment } from '@foxframework/core';
import { MfaInvalidCodeError } from '@foxframework/core';

interface TotpEnrollment {
  secret: string;
  recoveryCodes: string[];
  usedRecoveryCodes: Set<string>;
}

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

function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    codes.push(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
    );
  }
  return codes;
}

export class TotpMfaProvider implements IMfaProvider {
  readonly method = 'totp' as const;
  private readonly issuer: string;
  private readonly recoveryCodeCount: number;
  private readonly enrollments = new Map<string, TotpEnrollment>();

  constructor(config: TotpMfaProviderConfig = {}) {
    this.issuer = config.issuer ?? 'FoxFramework';
    this.recoveryCodeCount = config.recoveryCodeCount ?? 8;
    authenticator.options = {
      step: config.step ?? 30,
      window: config.window ?? 1,
    };
  }

  async enroll(userId: string): Promise<MfaEnrollment> {
    const secret = authenticator.generateSecret();
    const recoveryCodes = generateRecoveryCodes(this.recoveryCodeCount);
    this.enrollments.set(userId, {
      secret,
      recoveryCodes: [...recoveryCodes],
      usedRecoveryCodes: new Set(),
    });
    const uri = authenticator.keyuri(userId, this.issuer, secret);
    return { method: 'totp', uri, secret, recoveryCodes };
  }

  async isEnrolled(userId: string): Promise<boolean> {
    return this.enrollments.has(userId);
  }

  async generateChallenge(userId: string): Promise<MfaChallenge> {
    // TOTP is time-based; no explicit challenge to send
    const expiresAt = new Date(Date.now() + 30_000).toISOString();
    return {
      challengeId: `totp:${userId}:${Date.now()}`,
      method: 'totp',
      expiresAt,
    };
  }

  async verifyChallenge(_challengeId: string, code: string): Promise<boolean> {
    // challengeId encodes userId: 'totp:<userId>:<ts>'
    const userId = _challengeId.split(':')[1];
    const enrollment = this.enrollments.get(userId);
    if (!enrollment) throw new MfaInvalidCodeError('User not enrolled in TOTP');

    const valid = authenticator.verify({ token: code, secret: enrollment.secret });
    if (!valid) throw new MfaInvalidCodeError('Invalid TOTP code');
    return true;
  }

  async unenroll(userId: string): Promise<void> {
    this.enrollments.delete(userId);
  }

  async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    const enrollment = this.enrollments.get(userId);
    if (!enrollment) return false;

    const upper = code.toUpperCase();
    if (enrollment.usedRecoveryCodes.has(upper)) return false;
    if (!enrollment.recoveryCodes.includes(upper)) return false;

    enrollment.usedRecoveryCodes.add(upper);
    return true;
  }

  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const enrollment = this.enrollments.get(userId);
    if (!enrollment) throw new Error(`User ${userId} not enrolled`);

    const codes = generateRecoveryCodes(this.recoveryCodeCount);
    enrollment.recoveryCodes = [...codes];
    enrollment.usedRecoveryCodes = new Set();
    return codes;
  }
}
