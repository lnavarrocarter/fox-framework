/**
 * EmailOtpProvider unit tests
 */

import { EmailOtpProvider } from '../src/email-otp.provider';

describe('EmailOtpProvider', () => {
  let sentEmails: Array<{ to: string; code: string }>;
  let provider: EmailOtpProvider;

  beforeEach(() => {
    sentEmails = [];
    provider = new EmailOtpProvider({
      ttlMs: 5000,
      codeLength: 6,
      sender: async (to, code) => { sentEmails.push({ to, code }); },
    });
  });

  it('method is "email_otp"', () => {
    expect(provider.method).toBe('email_otp');
  });

  it('enroll registers user email', async () => {
    await provider.enroll('u1', 'test@example.com');
    expect(await provider.isEnrolled('u1')).toBe(true);
  });

  it('isEnrolled false before enroll', async () => {
    expect(await provider.isEnrolled('nobody')).toBe(false);
  });

  it('enroll without email throws', async () => {
    await expect(provider.enroll('u2')).rejects.toThrow();
  });

  it('generateChallenge sends email and returns challenge', async () => {
    await provider.enroll('u3', 'user@x.com');
    const challenge = await provider.generateChallenge('u3');
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('user@x.com');
    expect(challenge.method).toBe('email_otp');
    expect(challenge.destination).toMatch(/\*\*\*/);
  });

  it('verifyChallenge succeeds with correct code', async () => {
    await provider.enroll('u4', 'a@b.com');
    const challenge = await provider.generateChallenge('u4');
    const code = sentEmails[sentEmails.length - 1].code;
    const result = await provider.verifyChallenge(challenge.challengeId, code);
    expect(result).toBe(true);
  });

  it('verifyChallenge throws on wrong code', async () => {
    await provider.enroll('u5', 'a@b.com');
    const challenge = await provider.generateChallenge('u5');
    await expect(provider.verifyChallenge(challenge.challengeId, '000000')).rejects.toThrow();
  });

  it('code is single-use — second verify throws', async () => {
    await provider.enroll('u6', 'a@b.com');
    const challenge = await provider.generateChallenge('u6');
    const code = sentEmails[sentEmails.length - 1].code;
    await provider.verifyChallenge(challenge.challengeId, code);
    await expect(provider.verifyChallenge(challenge.challengeId, code)).rejects.toThrow();
  });

  it('expired challenge throws', async () => {
    const shortProvider = new EmailOtpProvider({
      ttlMs: 1,
      sender: async (to, code) => { sentEmails.push({ to, code }); },
    });
    await shortProvider.enroll('u7', 'a@b.com');
    const challenge = await shortProvider.generateChallenge('u7');
    await new Promise((r) => setTimeout(r, 10));
    const code = sentEmails[sentEmails.length - 1].code;
    await expect(shortProvider.verifyChallenge(challenge.challengeId, code)).rejects.toThrow();
  });

  it('unenroll removes user', async () => {
    await provider.enroll('u8', 'z@z.com');
    await provider.unenroll('u8');
    expect(await provider.isEnrolled('u8')).toBe(false);
  });
});
