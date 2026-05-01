/**
 * @foxframework/auth-oauth — barrel
 */

export { OAuthProvider } from './oauth.provider';
export type { OAuthProviderConfig } from './oauth.provider';

export type { OAuthStrategy, OAuthStrategyConfig } from './strategy';

export { GoogleStrategy } from './strategies/google';
export { GitHubStrategy } from './strategies/github';
export { FacebookStrategy } from './strategies/facebook';
export { InstagramStrategy } from './strategies/instagram';
export { MicrosoftStrategy } from './strategies/microsoft';
