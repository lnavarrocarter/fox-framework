/**
 * CognitoAuthProvider unit tests — all Cognito HTTP calls are mocked via global.fetch
 */

import { CognitoAuthProvider } from '../src/cognito-auth.provider';

const CFG = { region: 'us-east-1', userPoolId: 'us-east-1_abc', clientId: 'client123' };

function mockFetch(responses: Array<{ ok: boolean; json: unknown }>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return { ok: r.ok, json: async () => r.json, text: async () => JSON.stringify(r.json) } as unknown as Response;
  });
}

const ATTRIBUTES = [
  { Name: 'sub', Value: 'user-sub-123' },
  { Name: 'email', Value: 'test@cognito.com' },
  { Name: 'name', Value: 'Test User' },
];

afterEach(() => jest.restoreAllMocks());

describe('CognitoAuthProvider', () => {
  it('name is "cognito"', () => {
    expect(new CognitoAuthProvider(CFG).name).toBe('cognito');
  });

  describe('authenticate', () => {
    it('returns authenticated on success', async () => {
      mockFetch([
        { ok: true, json: { AuthenticationResult: { AccessToken: 'acc', IdToken: 'id', RefreshToken: 'ref', ExpiresIn: 3600 } } },
        { ok: true, json: { Username: 'user-sub-123', UserAttributes: ATTRIBUTES } },
      ]);
      const p = new CognitoAuthProvider(CFG);
      const result = await p.authenticate({ email: 'test@cognito.com', password: 'pw' });
      expect(result.status).toBe('authenticated');
      expect(result.user?.email).toBe('test@cognito.com');
    });

    it('throws on missing password', async () => {
      await expect(new CognitoAuthProvider(CFG).authenticate({ email: 'x@x.com' })).rejects.toThrow();
    });

    it('throws on Cognito NotAuthorized error', async () => {
      mockFetch([{ ok: false, json: { __type: 'NotAuthorizedException', message: 'Wrong password' } }]);
      await expect(new CognitoAuthProvider(CFG).authenticate({ email: 'x@x.com', password: 'bad' })).rejects.toThrow();
    });

    it('returns mfa_required on ChallengeName', async () => {
      mockFetch([{ ok: true, json: { ChallengeName: 'SMS_MFA' } }]);
      const result = await new CognitoAuthProvider(CFG).authenticate({ email: 'x@x.com', password: 'pw' });
      expect(result.status).toBe('mfa_required');
    });
  });

  describe('verify', () => {
    it('returns user for valid access token', async () => {
      mockFetch([{ ok: true, json: { Username: 'user-sub-123', UserAttributes: ATTRIBUTES } }]);
      const user = await new CognitoAuthProvider(CFG).verify('valid-token');
      expect(user.id).toBe('user-sub-123');
    });

    it('throws TokenInvalidError on bad token', async () => {
      mockFetch([{ ok: false, json: { __type: 'NotAuthorizedException', message: 'Invalid token' } }]);
      await expect(new CognitoAuthProvider(CFG).verify('bad')).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('returns new AuthToken', async () => {
      mockFetch([{ ok: true, json: { AuthenticationResult: { AccessToken: 'new-acc', IdToken: 'new-id', ExpiresIn: 3600 } } }]);
      const token = await new CognitoAuthProvider(CFG).refresh('refresh-token');
      expect(token.accessToken).toBe('new-acc');
    });
  });

  describe('revoke', () => {
    it('resolves without throwing', async () => {
      mockFetch([{ ok: true, json: {} }]);
      await expect(new CognitoAuthProvider(CFG).revoke('token')).resolves.toBeUndefined();
    });

    it('ignores errors silently', async () => {
      mockFetch([{ ok: false, json: { __type: 'Error', message: 'already expired' } }]);
      await expect(new CognitoAuthProvider(CFG).revoke('expired')).resolves.toBeUndefined();
    });
  });
});
