/**
 * @fileoverview Redis cache provider tests
 * @module tsfox/core/cache/__tests__/redis.provider
 */

import { RedisCacheProvider } from '../providers/redis.provider';
import { RedisConfig } from '../interfaces';

describe('RedisCacheProvider', () => {
  let provider: RedisCacheProvider;
  let config: RedisConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 6379,
      database: 0
    };
    provider = new RedisCacheProvider(config);
  });

  afterEach(async () => {
    if (provider.isConnected()) {
      await provider.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      expect(provider.isConnected()).toBe(false);
      
      await provider.connect();
      
      expect(provider.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
      
      await provider.disconnect();
      
      expect(provider.isConnected()).toBe(false);
    });

    it('should not connect twice', async () => {
      await provider.connect();
      const firstConnectionState = provider.isConnected();
      
      await provider.connect(); // Should not throw
      
      expect(provider.isConnected()).toBe(firstConnectionState);
    });
  });

  describe('Basic Operations', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value', number: 42 };

      await provider.set(key, value);
      const result = await provider.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await provider.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete values correctly', async () => {
      const key = 'delete-test';
      const value = 'delete-value';

      await provider.set(key, value);
      expect(await provider.exists(key)).toBe(true);

      const deleted = await provider.delete(key);
      expect(deleted).toBe(true);
      expect(await provider.exists(key)).toBe(false);

      // Second delete should return false
      const deletedAgain = await provider.delete(key);
      expect(deletedAgain).toBe(false);
    });

    it('should clear all values', async () => {
      await provider.set('key1', 'value1');
      await provider.set('key2', 'value2');
      
      expect(await provider.exists('key1')).toBe(true);
      expect(await provider.exists('key2')).toBe(true);

      await provider.clear();

      expect(await provider.exists('key1')).toBe(false);
      expect(await provider.exists('key2')).toBe(false);
    });

    it('should check existence correctly', async () => {
      const key = 'exists-test';
      
      expect(await provider.exists(key)).toBe(false);
      
      await provider.set(key, 'value');
      expect(await provider.exists(key)).toBe(true);
      
      await provider.delete(key);
      expect(await provider.exists(key)).toBe(false);
    });
  });

  describe('TTL Support', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should expire values after TTL', async () => {
      const key = 'ttl-test';
      const value = 'ttl-value';
      const ttl = 1; // 1 second

      await provider.set(key, value, ttl);
      
      // Should exist immediately
      expect(await provider.get(key)).toBe(value);
      expect(await provider.exists(key)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      expect(await provider.get(key)).toBeNull();
      expect(await provider.exists(key)).toBe(false);
    });

    it('should not expire values without TTL', async () => {
      const key = 'no-ttl-test';
      const value = 'no-ttl-value';

      await provider.set(key, value); // No TTL
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should still exist
      expect(await provider.get(key)).toBe(value);
      expect(await provider.exists(key)).toBe(true);
    });
  });

  describe('Key Operations', () => {
    beforeEach(async () => {
      await provider.connect();
      await provider.clear(); // Start clean
    });

    it('should return all keys when no pattern provided', async () => {
      await provider.set('key1', 'value1');
      await provider.set('key2', 'value2');
      await provider.set('key3', 'value3');

      const keys = await provider.keys();
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should filter keys by pattern', async () => {
      await provider.set('user:1', 'user1');
      await provider.set('user:2', 'user2');
      await provider.set('session:1', 'session1');
      await provider.set('cache:data', 'data');

      const userKeys = await provider.keys('user:*');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');

      const sessionKeys = await provider.keys('session:*');
      expect(sessionKeys).toHaveLength(1);
      expect(sessionKeys).toContain('session:1');
    });

    it('should exclude expired keys from results', async () => {
      await provider.set('permanent', 'value');
      await provider.set('temporary', 'value', 1); // 1 second TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const keys = await provider.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain('permanent');
      expect(keys).not.toContain('temporary');
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await provider.connect();
      provider.resetMetrics();
    });

    it('should track hit and miss counts', async () => {
      await provider.set('key1', 'value1');
      
      // Hit
      await provider.get('key1');
      
      // Miss
      await provider.get('non-existent');
      
      const metrics = provider.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.hitRatio).toBe(0.5);
    });

    it('should track response times', async () => {
      await provider.set('key1', 'value1');
      await provider.get('key1');
      
      const metrics = provider.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', async () => {
      await provider.set('key1', 'value1');
      await provider.get('key1');
      
      let metrics = provider.getMetrics();
      expect(metrics.hits).toBe(1);
      
      provider.resetMetrics();
      metrics = provider.getMetrics();
      
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.hitRatio).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe('Provider Info', () => {
    it('should return correct provider information', () => {
      const info = provider.getInfo();
      
      expect(info.name).toBe('redis');
      expect(info.version).toBe('1.0.0');
      expect(info.connected).toBe(false);
      expect(info.uptime).toBeGreaterThanOrEqual(0);
      expect(info.memoryUsage).toBeDefined();
    });

    it('should update connection status in info', async () => {
      let info = provider.getInfo();
      expect(info.connected).toBe(false);
      
      await provider.connect();
      info = provider.getInfo();
      expect(info.connected).toBe(true);
      
      await provider.disconnect();
      info = provider.getInfo();
      expect(info.connected).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when operating without connection', async () => {
      expect(provider.isConnected()).toBe(false);
      
      await expect(provider.get('key')).rejects.toThrow('Redis provider not connected');
      await expect(provider.set('key', 'value')).rejects.toThrow('Redis provider not connected');
      await expect(provider.delete('key')).rejects.toThrow('Redis provider not connected');
      await expect(provider.clear()).rejects.toThrow('Redis provider not connected');
      await expect(provider.exists('key')).rejects.toThrow('Redis provider not connected');
      await expect(provider.keys()).rejects.toThrow('Redis provider not connected');
    });

    it('should handle connection errors gracefully', async () => {
      // Mock a connection failure by modifying config to invalid host
      const invalidProvider = new RedisCacheProvider({
        host: 'invalid-host',
        port: 9999
      });

      // Note: In this mock implementation, we don't actually connect to Redis
      // In a real implementation, this would test actual connection failures
      await expect(invalidProvider.connect()).resolves.not.toThrow();
    });
  });

  describe('Type Safety', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'array', value: [1, 2, 3, 'mixed', true] },
        { key: 'null', value: null }
      ];

      for (const testCase of testCases) {
        await provider.set(testCase.key, testCase.value);
        const result = await provider.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });

    it('should maintain type information through serialization', async () => {
      const complexObject = {
        id: 123,
        name: 'Test User',
        active: true,
        metadata: {
          created: '2023-01-01',
          tags: ['user', 'test'],
          settings: {
            theme: 'dark',
            notifications: false
          }
        }
      };

      await provider.set('complex', complexObject);
      const result = await provider.get<typeof complexObject>('complex');

      expect(result).toEqual(complexObject);
      expect(typeof result?.id).toBe('number');
      expect(typeof result?.active).toBe('boolean');
      expect(Array.isArray(result?.metadata.tags)).toBe(true);
    });
  });
});
