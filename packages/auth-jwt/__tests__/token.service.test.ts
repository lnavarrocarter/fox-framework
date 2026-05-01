/**
 * TokenService unit tests
 */

import jwt from 'jsonwebtoken';
import { TokenService } from '../src/token.service';

const SECRET = 'test-secret-key';

describe('TokenService', () => {
  let svc: TokenService;

  beforeEach(() => {
    svc = new TokenService({ secret: SECRET, accessTokenTtl: 60, refreshTokenTtl: 120 });
  });

  describe('sign / verify round-trip', () => {
    it('signs and verifies an access token', () => {
      const token = svc.sign({ sub: 'user1', roles: ['admin'], permissions: ['read'] }, 'access');
      const payload = svc.verify(token);
      expect(payload.sub).toBe('user1');
      expect(payload.type).toBe('access');
      expect(payload.roles).toEqual(['admin']);
    });

    it('signs and verifies a refresh token', () => {
      const token = svc.sign({ sub: 'user2', roles: [], permissions: [] }, 'refresh');
      const payload = svc.verify(token);
      expect(payload.type).toBe('refresh');
    });

    it('throws on tampered token', () => {
      const token = svc.sign({ sub: 'u', roles: [], permissions: [] });
      expect(() => svc.verify(token + 'x')).toThrow();
    });

    it('throws on expired token', () => {
      const expired = jwt.sign(
        { sub: 'u', roles: [], permissions: [], type: 'access' },
        SECRET,
        { expiresIn: -1 },
      );
      expect(() => svc.verify(expired)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('buildAuthToken', () => {
    it('returns correct AuthToken shape', () => {
      const t = svc.buildAuthToken('u1', ['user'], ['read']);
      expect(t.tokenType).toBe('Bearer');
      expect(t.expiresIn).toBe(60);
      expect(typeof t.accessToken).toBe('string');
      expect(typeof t.refreshToken).toBe('string');
      expect(t.issuedAt).toBeTruthy();
    });
  });

  describe('decode', () => {
    it('decodes without verification', () => {
      const token = svc.sign({ sub: 'x', roles: [], permissions: [] });
      const p = svc.decode(token);
      expect(p?.sub).toBe('x');
    });

    it('returns null for garbage input', () => {
      expect(svc.decode('not.a.token')).toBeNull();
    });
  });
});
