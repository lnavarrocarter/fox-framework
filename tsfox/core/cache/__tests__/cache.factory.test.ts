/**
 * @fileoverview Cache factory tests
 * @module tsfox/core/cache/__tests__/cache.factory.test
 */

import { CacheFactory } from '../cache.factory';
import { Cache } from '../cache';
import { MemoryCacheProvider } from '../providers/memory.provider';
import { CacheConfig } from '../interfaces';

describe('CacheFactory', () => {
  afterEach(async () => {
    // Clean up all instances after each test
    await CacheFactory.clear();
  });

  describe('Basic Factory Operations', () => {
    test('should create memory cache provider', () => {
      const config: CacheConfig = { provider: 'memory' };
      const cache = CacheFactory.create(config);
      
      expect(cache).toBeInstanceOf(Cache);
      expect((cache as Cache).getProvider()).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should reuse existing cache instances with same config', () => {
      const config: CacheConfig = { provider: 'memory', ttl: 300 };
      
      const cache1 = CacheFactory.create(config);
      const cache2 = CacheFactory.create(config);
      
      expect(cache1).toBe(cache2);
    });

    test('should create different instances for different configs', () => {
      const config1: CacheConfig = { provider: 'memory', ttl: 300 };
      const config2: CacheConfig = { provider: 'memory', ttl: 600 };
      
      const cache1 = CacheFactory.create(config1);
      const cache2 = CacheFactory.create(config2);
      
      expect(cache1).not.toBe(cache2);
    });

    test('should throw error for unsupported providers', () => {
      const config = { provider: 'unsupported' as any };
      
      expect(() => CacheFactory.create(config)).toThrow('Unsupported cache provider: unsupported');
    });
  });

  describe('Named Cache Instances', () => {
    test('should create named cache instances', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const cache = CacheFactory.createNamed('test-cache', config);
      
      expect(cache).toBeInstanceOf(Cache);
    });

    test('should reuse existing named cache instances', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const cache1 = CacheFactory.createNamed('test-cache', config);
      const cache2 = CacheFactory.createNamed('test-cache', config);
      
      expect(cache1).toBe(cache2);
    });

    test('should get existing named cache', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const originalCache = CacheFactory.createNamed('test-cache', config);
      const retrievedCache = CacheFactory.get('test-cache');
      
      expect(retrievedCache).toBe(originalCache);
    });

    test('should return undefined for non-existent named cache', () => {
      const cache = CacheFactory.get('non-existent');
      expect(cache).toBeUndefined();
    });

    test('should check if named cache exists', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      expect(CacheFactory.has('test-cache')).toBe(false);
      
      CacheFactory.createNamed('test-cache', config);
      
      expect(CacheFactory.has('test-cache')).toBe(true);
    });

    test('should remove named cache instances', async () => {
      const config: CacheConfig = { provider: 'memory' };
      
      CacheFactory.createNamed('test-cache', config);
      expect(CacheFactory.has('test-cache')).toBe(true);
      
      const removed = await CacheFactory.remove('test-cache');
      expect(removed).toBe(true);
      expect(CacheFactory.has('test-cache')).toBe(false);
    });

    test('should return false when removing non-existent cache', async () => {
      const removed = await CacheFactory.remove('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Instance Management', () => {
    test('should get all instance names', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      CacheFactory.createNamed('cache1', config);
      CacheFactory.createNamed('cache2', config);
      
      const names = CacheFactory.getInstanceNames();
      
      expect(names).toHaveLength(2);
      expect(names).toContain('cache1');
      expect(names).toContain('cache2');
    });

    test('should get metrics for all instances', async () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const cache1 = CacheFactory.createNamed('cache1', config);
      const cache2 = CacheFactory.createNamed('cache2', config);
      
      // Add some data to generate metrics
      await cache1.set('key1', 'value1');
      await cache2.set('key2', 'value2');
      
      await cache1.get('key1');
      await cache2.get('key2');
      
      const allMetrics = CacheFactory.getAllMetrics();
      
      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has('cache1')).toBe(true);
      expect(allMetrics.has('cache2')).toBe(true);
      
      const cache1Metrics = allMetrics.get('cache1');
      expect(cache1Metrics.hits).toBe(1);
      expect(cache1Metrics.totalRequests).toBe(1);
    });

    test('should clear all instances', async () => {
      const config: CacheConfig = { provider: 'memory' };
      
      CacheFactory.createNamed('cache1', config);
      CacheFactory.createNamed('cache2', config);
      
      expect(CacheFactory.getInstanceNames()).toHaveLength(2);
      
      await CacheFactory.clear();
      
      expect(CacheFactory.getInstanceNames()).toHaveLength(0);
    });
  });

  describe('Convenience Methods', () => {
    test('should create default memory cache', () => {
      const cache = CacheFactory.createMemoryCache();
      
      expect(cache).toBeInstanceOf(Cache);
      expect((cache as Cache).getProvider()).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should create memory cache with TTL', () => {
      const cache = CacheFactory.createMemoryCache(300);
      const config = (cache as Cache).getConfig();
      
      expect(config.ttl).toBe(300);
      expect(config.provider).toBe('memory');
    });

    test('should create high performance cache', () => {
      const cache = CacheFactory.createHighPerformanceCache(5000, 50 * 1024 * 1024);
      const config = (cache as Cache).getConfig();
      
      expect(config.provider).toBe('memory');
      expect(config.evictionPolicy).toBe('lru');
      expect(config.maxKeys).toBe(5000);
      expect(config.memory?.maxSize).toBe(50 * 1024 * 1024);
    });
  });

  describe('Configuration Validation', () => {
    test('should handle memory cache configuration', () => {
      const config: CacheConfig = {
        provider: 'memory',
        ttl: 300,
        maxKeys: 1000,
        memory: {
          maxKeys: 1000,
          maxSize: 10 * 1024 * 1024,
          checkPeriod: 60
        }
      };
      
      const cache = CacheFactory.create(config);
      const actualConfig = (cache as Cache).getConfig();
      
      expect(actualConfig).toEqual(config);
    });

    test('should handle minimal configuration', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const cache = CacheFactory.create(config);
      
      expect(cache).toBeInstanceOf(Cache);
    });
  });

  describe('Provider Reuse', () => {
    test('should reuse providers for same configuration', () => {
      const config: CacheConfig = { provider: 'memory' };
      
      const cache1 = CacheFactory.create(config);
      const cache2 = CacheFactory.create(config);
      
      const provider1 = (cache1 as Cache).getProvider();
      const provider2 = (cache2 as Cache).getProvider();
      
      // Since we're creating the same config, providers should be reused
      expect(provider1).toBe(provider2);
    });

    test('should create different providers for different configurations', () => {
      const config1: CacheConfig = { 
        provider: 'memory',
        memory: { maxKeys: 100 }
      };
      const config2: CacheConfig = { 
        provider: 'memory',
        memory: { maxKeys: 200 }
      };
      
      const cache1 = CacheFactory.create(config1);
      const cache2 = CacheFactory.create(config2);
      
      const provider1 = (cache1 as Cache).getProvider();
      const provider2 = (cache2 as Cache).getProvider();
      
      // Different configurations should create different providers
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('Integration Tests', () => {
    test('should work with actual cache operations', async () => {
      const cache = CacheFactory.createMemoryCache(300);
      
      await cache.set('test-key', 'test-value');
      const value = await cache.get('test-key');
      
      expect(value).toBe('test-value');
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.totalRequests).toBe(1);
    });

    test('should maintain separate data in different cache instances', async () => {
      const cache1 = CacheFactory.createNamed('cache1', { provider: 'memory' });
      const cache2 = CacheFactory.createNamed('cache2', { provider: 'memory' });
      
      await cache1.set('key', 'value1');
      await cache2.set('key', 'value2');
      
      expect(await cache1.get('key')).toBe('value1');
      expect(await cache2.get('key')).toBe('value2');
    });
  });
});
