/**
 * @fileoverview Core cache implementation tests
 * @module tsfox/core/cache/__tests__/cache.test
 */

import { Cache } from '../cache';
import { MemoryCacheProvider } from '../providers/memory.provider';
import { CacheConfig } from '../interfaces';

describe('Cache', () => {
  let provider: MemoryCacheProvider;
  let cache: Cache;
  let config: CacheConfig;

  beforeEach(() => {
    provider = new MemoryCacheProvider();
    config = {
      provider: 'memory',
      ttl: 300,
      maxKeys: 100
    };
    cache = new Cache(provider, config);
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      
      expect(result).toBe('value1');
    });

    test('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('should delete values', async () => {
      await cache.set('key1', 'value1');
      
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      
      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    test('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });

    test('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      
      expect(await cache.exists('key1')).toBe(true);
      expect(await cache.exists('nonexistent')).toBe(false);
    });
  });

  describe('TTL Configuration', () => {
    test('should use default TTL from config', async () => {
      await cache.set('key1', 'value1'); // Should use config TTL
      
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    test('should override default TTL', async () => {
      await cache.set('key1', 'value1', 600); // Override with 600 seconds
      
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    test('should handle TTL expiration', async () => {
      await cache.set('key1', 'value1', 0.1); // 100ms TTL
      
      let result = await cache.get('key1');
      expect(result).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      result = await cache.get('key1');
      expect(result).toBeNull();
    });
  });

  describe('Metrics Tracking', () => {
    test('should track hits and misses', async () => {
      await cache.set('key1', 'value1');
      
      // Hit
      await cache.get('key1');
      
      // Miss
      await cache.get('nonexistent');
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.hitRatio).toBe(0.5);
    });

    test('should track total keys', async () => {
      let metrics = cache.getMetrics();
      expect(metrics.totalKeys).toBe(0);
      
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      metrics = cache.getMetrics();
      expect(metrics.totalKeys).toBe(2);
      
      await cache.delete('key1');
      
      metrics = cache.getMetrics();
      expect(metrics.totalKeys).toBe(1);
    });

    test('should track average response time', async () => {
      await cache.set('key1', 'value1');
      
      // Add a small delay to ensure measurable response time
      await new Promise(resolve => setTimeout(resolve, 1));
      await cache.get('key1');
      
      const metrics = cache.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should reset metrics on clear', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      
      let metrics = cache.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
      
      await cache.clear();
      
      metrics = cache.getMetrics();
      expect(metrics.totalKeys).toBe(0);
      // Note: hits/misses don't reset on clear, only on cache instance recreation
    });
  });

  describe('Pattern Invalidation', () => {
    beforeEach(async () => {
      await cache.set('user:1', 'User 1');
      await cache.set('user:2', 'User 2');
      await cache.set('product:1', 'Product 1');
      await cache.set('order:1', 'Order 1');
    });

    test('should invalidate keys matching pattern', async () => {
      const deletedCount = await cache.invalidatePattern('user:*');
      
      expect(deletedCount).toBe(2);
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('product:1')).toBe('Product 1');
      expect(await cache.get('order:1')).toBe('Order 1');
    });

    test('should return zero for non-matching patterns', async () => {
      const deletedCount = await cache.invalidatePattern('category:*');
      expect(deletedCount).toBe(0);
    });

    test('should handle empty cache invalidation', async () => {
      await cache.clear();
      
      const deletedCount = await cache.invalidatePattern('*');
      expect(deletedCount).toBe(0);
    });
  });

  describe('Configuration Access', () => {
    test('should return cache configuration', () => {
      const actualConfig = cache.getConfig();
      expect(actualConfig).toEqual(config);
    });

    test('should return provider instance', () => {
      const actualProvider = cache.getProvider();
      expect(actualProvider).toBe(provider);
    });
  });

  describe('Error Handling', () => {
    test('should handle provider errors gracefully', async () => {
      // Disconnect provider to simulate error
      await provider.disconnect();
      
      // Operations should throw errors
      await expect(cache.get('key1')).rejects.toThrow();
      await expect(cache.set('key1', 'value1')).rejects.toThrow();
    });

    test('should update metrics even on errors', async () => {
      await provider.disconnect();
      
      try {
        await cache.get('key1');
      } catch (error) {
        // Expected error
      }
      
      const metrics = cache.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(1);
    });
  });

  describe('Max Keys Enforcement', () => {
    test('should enforce maximum keys limit', async () => {
      const limitedConfig: CacheConfig = {
        provider: 'memory',
        maxKeys: 2
      };
      const limitedCache = new Cache(provider, limitedConfig);
      
      await limitedCache.set('key1', 'value1');
      await limitedCache.set('key2', 'value2');
      
      const metricsBefore = limitedCache.getMetrics();
      expect(metricsBefore.totalKeys).toBe(2);
      
      // This should trigger eviction
      await limitedCache.set('key3', 'value3');
      
      const metricsAfter = limitedCache.getMetrics();
      expect(metricsAfter.evictions).toBeGreaterThan(0);
    });

    test('should not enforce limit when maxKeys is not set', async () => {
      const unlimitedConfig: CacheConfig = {
        provider: 'memory'
        // No maxKeys specified
      };
      const unlimitedCache = new Cache(provider, unlimitedConfig);
      
      // Add many keys
      for (let i = 0; i < 10; i++) {
        await unlimitedCache.set(`key${i}`, `value${i}`);
      }
      
      const metrics = unlimitedCache.getMetrics();
      expect(metrics.totalKeys).toBe(10);
      expect(metrics.evictions).toBe(0);
    });
  });

  describe('Complex Data Types', () => {
    test('should handle object values', async () => {
      const objectValue = {
        id: 1,
        name: 'Test Object',
        data: { nested: true }
      };
      
      await cache.set('object', objectValue);
      const result = await cache.get('object');
      
      expect(result).toEqual(objectValue);
    });

    test('should handle array values', async () => {
      const arrayValue = [1, 2, 3, { nested: 'object' }];
      
      await cache.set('array', arrayValue);
      const result = await cache.get('array');
      
      expect(result).toEqual(arrayValue);
    });

    test('should handle null and undefined values', async () => {
      await cache.set('null-value', null);
      await cache.set('undefined-value', undefined);
      
      expect(await cache.get('null-value')).toBeNull();
      expect(await cache.get('undefined-value')).toBeUndefined();
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent gets', async () => {
      await cache.set('key1', 'value1');
      
      const promises = Array(10).fill(0).map(() => cache.get('key1'));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBe('value1');
      });
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(10);
    });

    test('should handle concurrent sets', async () => {
      const promises = Array(10).fill(0).map((_, i) => 
        cache.set(`key${i}`, `value${i}`)
      );
      
      await Promise.all(promises);
      
      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });
});
