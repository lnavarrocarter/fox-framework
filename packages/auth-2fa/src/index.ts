/**
 * @foxframework/auth-2fa — barrel
 */

export { TotpMfaProvider } from './totp.provider';
export type { TotpMfaProviderConfig } from './totp.provider';

export { EmailOtpProvider } from './email-otp.provider';
export type { EmailOtpConfig, EmailSender } from './email-otp.provider';

export { MfaMiddleware } from './mfa.middleware';
export type { MfaMiddlewareConfig } from './mfa.middleware';
