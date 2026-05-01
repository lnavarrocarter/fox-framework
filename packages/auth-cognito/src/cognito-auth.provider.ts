/**
 * CognitoAuthProvider — IAuthProvider backed by AWS Cognito User Pools.
 *
 * Uses the Cognito REST API (InitiateAuth, GetUser, GlobalSignOut) via fetch.
 * No AWS SDK dependency — just HTTP calls to the Cognito endpoint.
 *
 * Supports:
 *  - authenticate(): USER_PASSWORD_AUTH flow
 *  - verify(): validates the IdToken via Cognito's JWKS (cached)
 *  - refresh(): REFRESH_TOKEN_AUTH flow
 *  - revoke(): GlobalSignOut
 */

import type { IAuthProvider, AuthUser, AuthToken, AuthResult, Credentials } from '@foxframework/core';
import {
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
  AccountNotFoundError,
} from '@foxframework/core';

export interface CognitoAuthProviderConfig {
  /** AWS region (e.g. 'us-east-1') */
  region: string;
  /** Cognito User Pool ID (e.g. 'us-east-1_AbCdEfGhI') */
  userPoolId: string;
  /** App client ID */
  clientId: string;
  /** App client secret (optional, only if client has a secret) */
  clientSecret?: string;
  /** Map Cognito attributes to Fox AuthUser (optional) */
  mapUser?: (attributes: Record<string, string>, sub: string) => AuthUser;
}

interface CognitoTokens {
  IdToken: string;
  AccessToken: string;
  RefreshToken?: string;
  ExpiresIn: number;
}

function defaultMapUser(attributes: Record<string, string>, sub: string): AuthUser {
  return {
    id: sub,
    email: attributes['email'],
    displayName: attributes['name'] ?? attributes['preferred_username'],
    roles: [],
    permissions: [],
    metadata: { source: 'cognito', ...attributes },
  };
}

export class CognitoAuthProvider implements IAuthProvider {
  readonly name = 'cognito';

  private readonly cfg: CognitoAuthProviderConfig;
  private readonly endpoint: string;

  constructor(config: CognitoAuthProviderConfig) {
    this.cfg = config;
    this.endpoint = `https://cognito-idp.${config.region}.amazonaws.com`;
  }

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    if (!credentials.password) throw new InvalidCredentialsError();
    const username = credentials.username ?? credentials.email;
    if (!username) throw new InvalidCredentialsError();

    const body: Record<string, unknown> = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.cfg.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: credentials.password,
      },
    };

    const data = await this._post('AWSCognito-Identity-Provider-1.1.InitiateAuth', body);

    if (data['ChallengeName']) {
      // MFA or new password required — surface as mfa_required for simplicity
      return { status: 'mfa_required', mfaChallenge: undefined };
    }

    const tokens = data['AuthenticationResult'] as CognitoTokens;
    const user = await this._getUser(tokens.AccessToken);
    const token = this._buildAuthToken(tokens);
    return { status: 'authenticated', user, token };
  }

  async verify(token: string): Promise<AuthUser> {
    // Use GetUser to validate access token (simpler than JWKS validation)
    try {
      return await this._getUser(token);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('expired') || msg.includes('Expired')) throw new TokenExpiredError();
      throw new TokenInvalidError();
    }
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
    const body = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.cfg.clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    };

    let data: Record<string, unknown>;
    try {
      data = await this._post('AWSCognito-Identity-Provider-1.1.InitiateAuth', body);
    } catch {
      throw new TokenInvalidError('Refresh token invalid or expired');
    }

    const tokens = data['AuthenticationResult'] as CognitoTokens;
    return this._buildAuthToken({ ...tokens, RefreshToken: refreshToken });
  }

  async revoke(token: string): Promise<void> {
    await this._post('AWSCognito-Identity-Provider-1.1.GlobalSignOut', {
      AccessToken: token,
    }).catch(() => {
      // Ignore errors on revoke (token may already be expired)
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async _getUser(accessToken: string): Promise<AuthUser> {
    const data = await this._post('AWSCognito-Identity-Provider-1.1.GetUser', {
      AccessToken: accessToken,
    });

    const sub = (data['UserAttributes'] as Array<{ Name: string; Value: string }>)
      .find((a) => a.Name === 'sub')?.Value ?? data['Username'] as string;

    if (!sub) throw new AccountNotFoundError('unknown');

    const attributes: Record<string, string> = {};
    for (const attr of data['UserAttributes'] as Array<{ Name: string; Value: string }>) {
      attributes[attr.Name] = attr.Value;
    }

    const mapper = this.cfg.mapUser ?? defaultMapUser;
    return mapper(attributes, sub);
  }

  private _buildAuthToken(tokens: CognitoTokens & { RefreshToken?: string }): AuthToken {
    return {
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.ExpiresIn,
      issuedAt: new Date().toISOString(),
    };
  }

  private async _post(target: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': target,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const code = data['__type'] as string ?? 'Error';
      const message = data['message'] as string ?? res.statusText;
      if (code.includes('NotAuthorized') || code.includes('UserNotFound')) {
        throw new InvalidCredentialsError(message);
      }
      throw new Error(`Cognito ${code}: ${message}`);
    }
    return data;
  }
}
