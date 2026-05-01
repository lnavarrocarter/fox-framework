/**
 * TotpMfaProvider unit tests
 */

import { TotpMfaProvider } from '../src/totp.provider';

describe('TotpMfaProvider', () => {
  let provider: TotpMfaProvider;

  beforeEach(() => {
    provider = new TotpMfaProvider({ issuer: 'TestApp', recoveryCodeCount: 4 });
  });

  it('method is "totp"', () => {
    expect(provider.method).toBe('totp');
  });

  it('enrolls a user and returns uri + secret + recoveryCodes', async () => {
    const enrollment = await provider.enroll('user1');
    expect(enrollment.method).toBe('totp');
    expect(enrollment.uri).toMatch(/^otpauth:\/\/totp\//);
    expect(enrollment.secret).toBeTruthy();
    expect(enrollment.recoveryCodes).toHaveLength(4);
  });

  it('isEnrolled returns true after enroll', async () => {
    await provider.enroll('user2');
    expect(await provider.isEnrolled('user2')).toBe(true);
  });

  it('isEnrolled returns false before enroll', async () => {
    expect(await provider.isEnrolled('nobody')).toBe(false);
  });

  it('generates a challenge with totp prefix', async () => {
    await provider.enroll('user3');
    const challenge = await provider.generateChallenge('user3');
    expect(challenge.challengeId).toMatch(/^totp:user3:/);
    expect(challenge.method).toBe('totp');
  });

  it('verifyChallenge succeeds with correct TOTP code', async () => {
    const { authenticator } = await import('otplib');
    await provider.enroll('user4');
    const enrollment = await provider.enroll('user4'); // re-enroll to get the secret
    const challenge = await provider.generateChallenge('user4');
    const code = authenticator.generate(enrollment.secret!);
    const result = await provider.verifyChallenge(challenge.challengeId, code);
    expect(result).toBe(true);
  });

  it('verifyChallenge throws on wrong code', async () => {
    await provider.enroll('user5');
    const challenge = await provider.generateChallenge('user5');
    await expect(provider.verifyChallenge(challenge.challengeId, '000000')).rejects.toThrow();
  });

  it('unenrolls a user', async () => {
    await provider.enroll('user6');
    await provider.unenroll('user6');
    expect(await provider.isEnrolled('user6')).toBe(false);
  });

  describe('recovery codes', () => {
    it('valid recovery code returns true', async () => {
      const enrollment = await provider.enroll('user7');
      const code = enrollment.recoveryCodes![0];
      expect(await provider.useRecoveryCode('user7', code)).toBe(true);
    });

    it('used recovery code cannot be reused', async () => {
      const enrollment = await provider.enroll('user8');
      const code = enrollment.recoveryCodes![0];
      await provider.useRecoveryCode('user8', code);
      expect(await provider.useRecoveryCode('user8', code)).toBe(false);
    });

    it('invalid recovery code returns false', async () => {
      await provider.enroll('user9');
      expect(await provider.useRecoveryCode('user9', 'INVALID')).toBe(false);
    });

    it('regenerateRecoveryCodes replaces old codes', async () => {
      const enrollment = await provider.enroll('user10');
      const oldCode = enrollment.recoveryCodes![0];
      const newCodes = await provider.regenerateRecoveryCodes('user10');
      expect(newCodes).toHaveLength(4);
      expect(await provider.useRecoveryCode('user10', oldCode)).toBe(false);
    });
  });
});
