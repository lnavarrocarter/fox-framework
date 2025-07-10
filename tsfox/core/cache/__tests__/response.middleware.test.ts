/**
 * @fileoverview Response cache middleware tests
 * @module tsfox/core/cache/__tests__/response.middleware.test
 */

import { 
  responseCache, 
  apiCache, 
  templateCache, 
  invalidateCache,
  cacheMetrics 
} from '../middleware/response.middleware';
import { CacheFactory } from '../cache.factory';

// Mock Express request/response objects
const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  path: '/test',
  query: {},
  get: jest.fn(),
  ...overrides
});

const createMockResponse = (overrides = {}) => ({
  json: jest.fn(),
  send: jest.fn(),
  set: jest.fn(),
  statusCode: 200,
  get: jest.fn(),
  ...overrides
});

const createMockNext = () => jest.fn();

describe('Response Cache Middleware', () => {
  beforeEach(async () => {
    // Clear all cache instances before each test
    await CacheFactory.clear();
  });

  afterEach(async () => {
    await CacheFactory.clear();
  });

  describe('responseCache', () => {
    test('should cache successful responses', async () => {
      const middleware = responseCache({ ttl: 300 });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // First request - should go to next() and cache response
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');

      // Simulate response
      res.json({ data: 'test' });

      // Second request - should return cached response
      const req2 = createMockRequest();
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      
      expect(next2).not.toHaveBeenCalled();
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res2.json).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should use custom cache key generator', async () => {
      const customKeyGen = jest.fn(() => 'custom-key');
      const middleware = responseCache({ 
        key: customKeyGen,
        ttl: 300 
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(customKeyGen).toHaveBeenCalledWith(req);
    });

    test('should use string cache key', async () => {
      const middleware = responseCache({ 
        key: 'static-key',
        ttl: 300 
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate response
      res.json({ data: 'test' });

      // Second request with different path should still hit cache
      const req2 = createMockRequest({ path: '/different' });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      expect(next2).not.toHaveBeenCalled();
      expect(res2.json).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should respect cache conditions', async () => {
      const condition = jest.fn(() => false); // Never cache
      const middleware = responseCache({ 
        condition,
        ttl: 300 
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(condition).toHaveBeenCalledWith(req, res);
      expect(next).toHaveBeenCalled();
    });

    test('should skip caching for specified methods', async () => {
      const middleware = responseCache({ 
        ttl: 300 
      });

      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate response - should not be cached for POST
      res.json({ data: 'test' });

      // GET request should not find cached POST response
      const req2 = createMockRequest({ method: 'GET' });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      expect(next2).toHaveBeenCalled(); // Should go to next, not cache hit
    });

    test('should respect Cache-Control headers in request', async () => {
      const middleware = responseCache({ ttl: 300 });
      
      const req = createMockRequest();
      req.get.mockReturnValue('no-cache');
      
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should handle Vary headers', async () => {
      const middleware = responseCache({ 
        vary: ['Accept', 'Authorization'],
        ttl: 300 
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      res.json({ data: 'test' });

      // Second request should get cache hit and set Vary header
      const req2 = createMockRequest();
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      
      expect(res2.set).toHaveBeenCalledWith('Vary', 'Accept, Authorization');
    });

    test('should handle errors gracefully', async () => {
      const middleware = responseCache({ ttl: 300 });
      
      // Create a request that will cause an error
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Mock an error in cache operations
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Restore console.error
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('apiCache', () => {
    test('should use default API cache settings', async () => {
      const middleware = apiCache();
      
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should skip caching for POST requests by default', async () => {
      const middleware = apiCache();
      
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should override default settings', async () => {
      const middleware = apiCache({
        ttl: 600,
        skipMethods: ['PUT'] // Only skip PUT, allow POST
      });

      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('templateCache', () => {
    test('should use template-specific cache settings', async () => {
      const middleware = templateCache();
      
      const req = createMockRequest({ 
        method: 'GET',
        path: '/about',
        query: { lang: 'en' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should only cache GET requests by default', async () => {
      const middleware = templateCache();
      
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    test('should invalidate cache patterns', async () => {
      // First, set up some cached data
      const cache = CacheFactory.createNamed('default', { provider: 'memory' });
      await cache.set('user:1', 'User 1');
      await cache.set('user:2', 'User 2');
      await cache.set('product:1', 'Product 1');

      const middleware = invalidateCache(['user:*']);
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Verify user data was invalidated but product data remains
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('product:1')).toBe('Product 1');
    });

    test('should handle invalidation errors gracefully', async () => {
      const middleware = invalidateCache(['invalid:*']);
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      jest.spyOn(console, 'error').mockImplementation(() => {});

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('cacheMetrics', () => {
    test('should add cache metrics to response headers', async () => {
      // Set up cache with some data
      const cache = CacheFactory.createNamed('default', { provider: 'memory' });
      await cache.set('test', 'value');
      await cache.get('test'); // Generate a hit
      await cache.get('nonexistent'); // Generate a miss

      const middleware = cacheMetrics();
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith('X-Cache-Hits', '1');
      expect(res.set).toHaveBeenCalledWith('X-Cache-Misses', '1');
      expect(res.set).toHaveBeenCalledWith('X-Cache-Hit-Ratio', '0.50');
    });

    test('should handle missing cache gracefully', async () => {
      const middleware = cacheMetrics();
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate different keys for different paths', async () => {
      const middleware = responseCache({ ttl: 300 });

      // First request
      const req1 = createMockRequest({ path: '/path1' });
      const res1 = createMockResponse();
      const next1 = createMockNext();

      await middleware(req1, res1, next1);
      res1.json({ data: 'path1' });

      // Second request with different path
      const req2 = createMockRequest({ path: '/path2' });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      
      // Should go to next() since it's a different path
      expect(next2).toHaveBeenCalled();
    });

    test('should generate different keys for different query parameters', async () => {
      const middleware = responseCache({ ttl: 300 });

      // First request
      const req1 = createMockRequest({ query: { page: 1 } });
      const res1 = createMockResponse();
      const next1 = createMockNext();

      await middleware(req1, res1, next1);
      res1.json({ data: 'page1' });

      // Second request with different query
      const req2 = createMockRequest({ query: { page: 2 } });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      
      // Should go to next() since it's different query params
      expect(next2).toHaveBeenCalled();
    });
  });

  describe('Status Code Handling', () => {
    test('should only cache successful status codes', async () => {
      const middleware = responseCache({ 
        ttl: 300,
        statusCodes: [200] 
      });

      const req = createMockRequest();
      const res = createMockResponse({ statusCode: 404 });
      const next = createMockNext();

      await middleware(req, res, next);
      res.json({ error: 'Not found' });

      // Second request should not get cached 404 response
      const req2 = createMockRequest();
      const res2 = createMockResponse({ statusCode: 200 });
      const next2 = createMockNext();

      await middleware(req2, res2, next2);
      expect(next2).toHaveBeenCalled(); // Should go to next, not cache hit
    });
  });
});
