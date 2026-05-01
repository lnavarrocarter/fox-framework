/**
 * OAuthProvider + Strategy tests — all network calls are mocked
 */

import { OAuthProvider } from '../src/oauth.provider';
import { GoogleStrategy } from '../src/strategies/google';
import { GitHubStrategy } from '../src/strategies/github';
import { FacebookStrategy } from '../src/strategies/facebook';
import { InstagramStrategy } from '../src/strategies/instagram';
import { MicrosoftStrategy } from '../src/strategies/microsoft';

const BASE_CFG = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://example.com/callback',
};

// ---------------------------------------------------------------------------
// Helpers to mock fetch
// ---------------------------------------------------------------------------

function mockFetch(responses: Array<{ ok: boolean; json?: unknown; text?: string }>) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[call++] ?? responses[responses.length - 1];
    return {
      ok: r.ok,
      json: async () => r.json ?? {},
      text: async () => r.text ?? JSON.stringify(r.json ?? {}),
    } as unknown as Response;
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Strategy URL builders (no network)
// ---------------------------------------------------------------------------

describe('Strategy.buildAuthUrl', () => {
  it('Google includes state and access_type=offline', () => {
    const url = new GoogleStrategy().buildAuthUrl(BASE_CFG, 'my-state');
    expect(url).toContain('state=my-state');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('accounts.google.com');
  });

  it('GitHub builds correct authorize URL', () => {
    const url = new GitHubStrategy().buildAuthUrl(BASE_CFG, 's1');
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).toContain('state=s1');
  });

  it('Facebook builds correct authorize URL', () => {
    const url = new FacebookStrategy().buildAuthUrl(BASE_CFG, 's2');
    expect(url).toContain('facebook.com');
    expect(url).toContain('state=s2');
  });

  it('Instagram builds correct authorize URL', () => {
    const url = new InstagramStrategy().buildAuthUrl(BASE_CFG, 's3');
    expect(url).toContain('instagram.com');
    expect(url).toContain('state=s3');
  });

  it('Microsoft builds correct authorize URL', () => {
    const url = new MicrosoftStrategy().buildAuthUrl(BASE_CFG, 's4');
    expect(url).toContain('microsoftonline.com');
    expect(url).toContain('state=s4');
  });

  it('Google includes PKCE challenge when provided', () => {
    const url = new GoogleStrategy().buildAuthUrl(BASE_CFG, 'st', 'pkce-challenge');
    expect(url).toContain('code_challenge=pkce-challenge');
    expect(url).toContain('code_challenge_method=S256');
  });
});

// ---------------------------------------------------------------------------
// OAuthProvider
// ---------------------------------------------------------------------------

describe('OAuthProvider', () => {
  it('name is "oauth:<strategy>"', () => {
    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    expect(p.name).toBe('oauth:google');
  });

  it('getAuthorizationUrl delegates to strategy', () => {
    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    const url = p.getAuthorizationUrl('state1');
    expect(url).toContain('accounts.google.com');
  });

  it('handleCallback returns authenticated result', async () => {
    mockFetch([
      { ok: true, json: { access_token: 'acc', refresh_token: 'ref', expires_in: 3600 } },
      { ok: true, json: { sub: 'g123', email: 'u@google.com', name: 'User', picture: 'http://img' } },
    ]);

    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    const result = await p.handleCallback('code123', 'state1');
    expect(result.status).toBe('authenticated');
    expect(result.user?.email).toBe('u@google.com');
    expect(result.token?.accessToken).toBe('acc');
  });

  it('handleCallback with custom mapProfile', async () => {
    mockFetch([
      { ok: true, json: { access_token: 'acc' } },
      { ok: true, json: { sub: 'g456', email: 'custom@x.com' } },
    ]);

    const p = new OAuthProvider(new GoogleStrategy(), {
      ...BASE_CFG,
      mapProfile: (profile) => ({
        id: `custom:${profile.providerId}`,
        email: profile.email,
        roles: ['oauth_user'],
        permissions: [],
      }),
    });
    const result = await p.handleCallback('code', 'state');
    expect(result.user?.id).toBe('custom:g456');
    expect(result.user?.roles).toContain('oauth_user');
  });

  it('authenticate throws (OAuth flow only)', async () => {
    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    await expect(p.authenticate({})).rejects.toThrow();
  });

  it('refresh delegates to strategy.refreshTokens', async () => {
    mockFetch([
      { ok: true, json: { access_token: 'new-acc', expires_in: 3600 } },
    ]);
    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    const token = await p.refresh('old-refresh');
    expect(token.accessToken).toBe('new-acc');
  });

  it('revoke resolves without error', async () => {
    const p = new OAuthProvider(new GoogleStrategy(), BASE_CFG);
    await expect(p.revoke('any-token')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GitHub-specific: no refresh support
// ---------------------------------------------------------------------------

describe('GitHubStrategy', () => {
  it('refreshTokens throws', async () => {
    await expect(new GitHubStrategy().refreshTokens(BASE_CFG, 'rt')).rejects.toThrow();
  });
});
