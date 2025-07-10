/**
 * @fileoverview Memory cache provider tests
 * @module tsfox/core/cache/__tests__/memory.provider.test
 */

import { MemoryCacheProvider } from '../providers/memory.provider';
import { MemoryConfig } from '../interfaces';

describe('MemoryCacheProvider', () => {
  let provider: MemoryCacheProvider;

  beforeEach(() => {
    provider = new MemoryCacheProvider();
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', async () => {
      await provider.set('key1', 'value1');
      const result = await provider.get('key1');
      expect(result).toBe('value1');
    });

    test('should return null for non-existent keys', async () => {
      const result = await provider.get('nonexistent');
      expect(result).toBeNull();
    });

    test('should delete values', async () => {
      await provider.set('key1', 'value1');
      
      const deleted = await provider.delete('key1');
      expect(deleted).toBe(true);
      
      const result = await provider.get('key1');
      expect(result).toBeNull();
    });

    test('should return false when deleting non-existent key', async () => {
      const deleted = await provider.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    test('should clear all values', async () => {
      await provider.set('key1', 'value1');
      await provider.set('key2', 'value2');
      
      await provider.clear();
      
      expect(await provider.get('key1')).toBeNull();
      expect(await provider.get('key2')).toBeNull();
    });

    test('should check if key exists', async () => {
      await provider.set('key1', 'value1');
      
      expect(await provider.exists('key1')).toBe(true);
      expect(await provider.exists('nonexistent')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should handle TTL expiration', async () => {
      await provider.set('key1', 'value1', 0.1); // 100ms TTL
      
      let result = await provider.get('key1');
      expect(result).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      result = await provider.get('key1');
      expect(result).toBeNull();
    });

    test('should not expire values without TTL', async () => {
      await provider.set('key1', 'value1'); // No TTL
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await provider.get('key1');
      expect(result).toBe('value1');
    });

    test('should handle exists() with expired values', async () => {
      await provider.set('key1', 'value1', 0.1); // 100ms TTL
      
      expect(await provider.exists('key1')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await provider.exists('key1')).toBe(false);
    });
  });

  describe('Key Pattern Matching', () => {
    beforeEach(async () => {
      await provider.set('user:1', 'User 1');
      await provider.set('user:2', 'User 2');
      await provider.set('product:1', 'Product 1');
      await provider.set('order:1', 'Order 1');
    });

    test('should return all keys when no pattern provided', async () => {
      const keys = await provider.keys();
      expect(keys).toHaveLength(4);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).toContain('product:1');
      expect(keys).toContain('order:1');
    });

    test('should filter keys by wildcard pattern', async () => {
      const userKeys = await provider.keys('user:*');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });

    test('should filter keys by single character pattern', async () => {
      const keys = await provider.keys('user:?');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });
  });

  describe('Memory Management', () => {
    test('should enforce max keys limit', async () => {
      const config: MemoryConfig = { maxKeys: 2 };
      const limitedProvider = new MemoryCacheProvider(config);
      
      await limitedProvider.set('key1', 'value1');
      await limitedProvider.set('key2', 'value2');
      await limitedProvider.set('key3', 'value3'); // Should evict key1
      
      expect(await limitedProvider.get('key1')).toBeNull();
      expect(await limitedProvider.get('key2')).toBe('value2');
      expect(await limitedProvider.get('key3')).toBe('value3');
      
      await limitedProvider.disconnect();
    });

    test('should track access for LRU eviction', async () => {
      const config: MemoryConfig = { maxKeys: 2 };
      const limitedProvider = new MemoryCacheProvider(config);
      
      await limitedProvider.set('key1', 'value1');
      await limitedProvider.set('key2', 'value2');
      
      // Access key1 to make it more recently used
      await limitedProvider.get('key1');
      
      // Add key3, should evict key2 (least recently used)
      await limitedProvider.set('key3', 'value3');
      
      expect(await limitedProvider.get('key1')).toBe('value1');
      expect(await limitedProvider.get('key2')).toBeNull();
      expect(await limitedProvider.get('key3')).toBe('value3');
      
      await limitedProvider.disconnect();
    });
  });

  describe('Provider Info and Connection', () => {
    test('should provide correct provider info', () => {
      const info = provider.getInfo();
      
      expect(info.name).toBe('memory');
      expect(info.version).toBe('1.0.0');
      expect(info.connected).toBe(true);
      expect(typeof info.uptime).toBe('number');
      expect(info.memoryUsage).toBeDefined();
    });

    test('should handle connect/disconnect lifecycle', async () => {
      expect(provider.isConnected()).toBe(true);
      
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
      
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    test('should calculate memory usage', async () => {
      const info1 = provider.getInfo();
      const initialUsage = info1.memoryUsage?.used || 0;
      
      await provider.set('largeKey', 'x'.repeat(1000));
      
      const info2 = provider.getInfo();
      const newUsage = info2.memoryUsage?.used || 0;
      
      expect(newUsage).toBeGreaterThan(initialUsage);
    });
  });

  describe('Access Tracking', () => {
    test('should track access count and last accessed time', async () => {
      await provider.set('key1', 'value1');
      
      const beforeAccess = Date.now();
      await provider.get('key1');
      await provider.get('key1');
      const afterAccess = Date.now();
      
      // Since we can't directly access the entry metadata in the current implementation,
      // we'll test the behavior indirectly through LRU eviction
      const config: MemoryConfig = { maxKeys: 2 };
      const testProvider = new MemoryCacheProvider(config);
      
      await testProvider.set('key1', 'value1');
      await testProvider.set('key2', 'value2');
      
      // Access key1 multiple times
      await testProvider.get('key1');
      await testProvider.get('key1');
      
      // Add key3, should evict key2 (less accessed)
      await testProvider.set('key3', 'value3');
      
      expect(await testProvider.get('key1')).toBe('value1');
      expect(await testProvider.get('key2')).toBeNull();
      
      await testProvider.disconnect();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid operations gracefully', async () => {
      // These operations should not throw errors
      await expect(provider.get('')).resolves.toBeNull();
      await expect(provider.delete('')).resolves.toBe(false);
      await expect(provider.exists('')).resolves.toBe(false);
    });

    test('should handle complex object values', async () => {
      const complexValue = {
        id: 1,
        name: 'Test User',
        preferences: {
          theme: 'dark',
          notifications: true
        },
        tags: ['user', 'active']
      };
      
      await provider.set('complex', complexValue);
      const result = await provider.get('complex');
      
      expect(result).toEqual(complexValue);
    });
  });
});
