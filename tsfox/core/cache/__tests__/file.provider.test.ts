/**
 * @fileoverview File cache provider tests
 * @module tsfox/core/cache/__tests__/file.provider
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { FileCacheProvider } from '../providers/file.provider';
import { FileConfig } from '../interfaces';

describe('FileCacheProvider', () => {
  let provider: FileCacheProvider;
  let config: FileConfig;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(__dirname, '../../../temp/cache-test-' + Date.now());
    config = {
      directory: testDir,
      compression: false
    };
    provider = new FileCacheProvider(config);
  });

  afterEach(async () => {
    if (provider.isConnected()) {
      await provider.disconnect();
    }
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Connection Management', () => {
    it('should connect and create directory', async () => {
      expect(provider.isConnected()).toBe(false);
      
      await provider.connect();
      
      expect(provider.isConnected()).toBe(true);
      
      // Check if directory was created
      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
      
      await provider.disconnect();
      
      expect(provider.isConnected()).toBe(false);
    });

    it('should handle existing directory', async () => {
      // Create directory manually
      await fs.mkdir(testDir, { recursive: true });
      
      await provider.connect();
      
      expect(provider.isConnected()).toBe(true);
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

    it('should create nested directories for cache files', async () => {
      // Test with special characters that will be converted to underscores
      const key = 'user/profile/settings';
      const value = { theme: 'dark' };

      await provider.set(key, value);
      const result = await provider.get(key);

      expect(result).toEqual(value);
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

    it('should clean up expired files on get', async () => {
      const key = 'cleanup-test';
      const value = 'cleanup-value';
      const ttl = 1;

      await provider.set(key, value, ttl);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Getting expired key should return null and clean up file
      expect(await provider.get(key)).toBeNull();
      
      // File should no longer exist
      const files = await fs.readdir(testDir);
      const cacheFiles = files.filter(f => f.endsWith('.json'));
      expect(cacheFiles).toHaveLength(0);
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

      const allKeys = await provider.keys('*');
      expect(allKeys).toHaveLength(4);
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

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should clean up expired files', async () => {
      // Set some values with different TTLs
      await provider.set('keep1', 'value1'); // No TTL
      await provider.set('keep2', 'value2'); // No TTL
      await provider.set('expire1', 'value1', 1); // 1 second
      await provider.set('expire2', 'value2', 1); // 1 second

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Cleanup should remove expired files
      const deletedCount = await provider.cleanup();
      expect(deletedCount).toBe(2);

      // Only non-expired keys should remain
      const keys = await provider.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('keep1');
      expect(keys).toContain('keep2');
    });

    it('should handle cleanup with no expired files', async () => {
      await provider.set('key1', 'value1');
      await provider.set('key2', 'value2');

      const deletedCount = await provider.cleanup();
      expect(deletedCount).toBe(0);

      const keys = await provider.keys();
      expect(keys).toHaveLength(2);
    });
  });

  describe('File System Integration', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should create proper file names for different keys', async () => {
      const testKeys = [
        'simple-key',
        'key/with/slashes',
        'key:with:colons',
        'key with spaces',
        'key@with#special$chars'
      ];

      for (const key of testKeys) {
        await provider.set(key, `value-for-${key}`);
      }

      // Check that files were created
      const files = await fs.readdir(testDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      expect(jsonFiles).toHaveLength(testKeys.length);

      // Verify we can retrieve all values
      for (const key of testKeys) {
        const value = await provider.get(key);
        expect(value).toBe(`value-for-${key}`);
      }
    });

    it('should handle file system errors gracefully', async () => {
      // Try to get from a key when directory doesn't exist
      const badProvider = new FileCacheProvider({
        directory: '/non/existent/path',
        compression: false
      });

      await expect(badProvider.connect()).rejects.toThrow();
    });

    it('should persist data across provider instances', async () => {
      const key = 'persistence-test';
      const value = { persistent: true, data: 'test' };

      // Set with first provider
      await provider.set(key, value);
      await provider.disconnect();

      // Create new provider with same directory
      const newProvider = new FileCacheProvider(config);
      await newProvider.connect();

      // Should retrieve the same value
      const result = await newProvider.get(key);
      expect(result).toEqual(value);

      await newProvider.disconnect();
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
  });

  describe('Provider Info', () => {
    it('should return correct provider information', () => {
      const info = provider.getInfo();
      
      expect(info.name).toBe('file');
      expect(info.version).toBe('1.0.0');
      expect(info.connected).toBe(false);
      expect(info.memoryUsage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when operating without connection', async () => {
      expect(provider.isConnected()).toBe(false);
      
      await expect(provider.get('key')).rejects.toThrow('File cache provider not connected');
      await expect(provider.set('key', 'value')).rejects.toThrow('File cache provider not connected');
      await expect(provider.delete('key')).rejects.toThrow('File cache provider not connected');
      await expect(provider.clear()).rejects.toThrow('File cache provider not connected');
      await expect(provider.exists('key')).rejects.toThrow('File cache provider not connected');
      await expect(provider.keys()).rejects.toThrow('File cache provider not connected');
    });

    it('should handle malformed cache files', async () => {
      await provider.connect();
      
      // Create a malformed JSON file manually
      const malformedFile = join(testDir, 'malformed_hash.json');
      await fs.writeFile(malformedFile, 'invalid json content');
      
      // Getting keys should skip malformed files
      const keys = await provider.keys();
      expect(keys).toHaveLength(0);
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
  });
});
