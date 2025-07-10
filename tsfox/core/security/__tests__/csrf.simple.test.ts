/**
 * @fileoverview Simple CSRF tests
 */

import { CsrfMiddleware } from '../csrf.middleware';

describe('CsrfMiddleware Simple', () => {
  it('should have protect method', () => {
    expect(typeof CsrfMiddleware.protect).toBe('function');
  });

  it('should have getToken method', () => {
    expect(typeof CsrfMiddleware.getToken).toBe('function');
  });

  it('should have clearAllTokens method', () => {
    expect(typeof CsrfMiddleware.clearAllTokens).toBe('function');
  });

  it('should have cleanupExpiredTokens method', () => {
    expect(typeof CsrfMiddleware.cleanupExpiredTokens).toBe('function');
  });
});
