/**
 * @fileoverview Cache factory for creating and managing cache instances
 * @module tsfox/core/cache/cache.factory
 */

import { Cache } from './cache';
import { MemoryCacheProvider } from './providers/memory.provider';
import { RedisCacheProvider } from './providers/redis.provider';
import { FileCacheProvider } from './providers/file.provider';
import { 
  ICache, 
  ICacheProvider, 
  CacheConfig, 
  CacheProvider,
  MemoryConfig 
} from './interfaces';

/**
 * Factory for creating and managing cache instances
 */
export class CacheFactory {
  private static instances = new Map<string, ICache>();
  private static providers = new Map<string, ICacheProvider>();

  /**
   * Create or retrieve a cache instance
   * @param config - Cache configuration
   * @returns Cache instance
   */
  static create(config: CacheConfig): ICache {
    const key = this.generateKey(config);
    
    if (!this.instances.has(key)) {
      const provider = this.createProvider(config);
      const cache = new Cache(provider, config);
      this.instances.set(key, cache);
    }
    
    return this.instances.get(key)!;
  }

  /**
   * Create a cache with specific name (singleton per name)
   * @param name - Cache instance name
   * @param config - Cache configuration
   * @returns Cache instance
   */
  static createNamed(name: string, config: CacheConfig): ICache {
    if (!this.instances.has(name)) {
      // For named instances, always create a new provider to ensure data isolation
      const provider = this.createUniqueProvider(config);
      const cache = new Cache(provider, config);
      this.instances.set(name, cache);
    }
    
    return this.instances.get(name)!;
  }

  /**
   * Get an existing cache instance by name
   * @param name - Cache instance name
   * @returns Cache instance or undefined if not found
   */
  static get(name: string): ICache | undefined {
    return this.instances.get(name);
  }

  /**
   * Check if a cache instance exists
   * @param name - Cache instance name
   * @returns True if cache exists, false otherwise
   */
  static has(name: string): boolean {
    return this.instances.has(name);
  }

  /**
   * Remove a cache instance
   * @param name - Cache instance name
   * @returns True if cache was removed, false if not found
   */
  static async remove(name: string): Promise<boolean> {
    const cache = this.instances.get(name);
    if (!cache) return false;

    // Disconnect provider if it exists
    const provider = (cache as Cache).getProvider();
    if (provider && typeof provider.disconnect === 'function') {
      await provider.disconnect();
    }

    this.instances.delete(name);
    return true;
  }

  /**
   * Clear all cache instances
   */
  static async clear(): Promise<void> {
    for (const [name, cache] of this.instances) {
      const provider = (cache as Cache).getProvider();
      if (provider && typeof provider.disconnect === 'function') {
        await provider.disconnect();
      }
    }
    
    this.instances.clear();
    this.providers.clear();
  }

  /**
   * Get all cache instance names
   * @returns Array of cache names
   */
  static getInstanceNames(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Get cache instance metrics for all instances
   * @returns Map of cache names to their metrics
   */
  static getAllMetrics(): Map<string, any> {
    const metrics = new Map();
    
    for (const [name, cache] of this.instances) {
      metrics.set(name, cache.getMetrics());
    }
    
    return metrics;
  }

  /**
   * Create a provider based on configuration
   * @param config - Cache configuration
   * @returns Cache provider instance
   */
  private static createProvider(config: CacheConfig): ICacheProvider {
    const providerKey = this.generateProviderKey(config);
    
    // Reuse existing provider if possible
    if (this.providers.has(providerKey)) {
      return this.providers.get(providerKey)!;
    }

    let provider: ICacheProvider;

    switch (config.provider) {
      case 'memory':
        provider = new MemoryCacheProvider(config.memory);
        break;
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration is required for Redis provider');
        }
        provider = new RedisCacheProvider(config.redis);
        break;
      case 'file':
        if (!config.file) {
          throw new Error('File configuration is required for File provider');
        }
        provider = new FileCacheProvider(config.file);
        break;
      default:
        throw new Error(`Unsupported cache provider: ${config.provider}`);
    }

    this.providers.set(providerKey, provider);
    return provider;
  }

  /**
   * Create a unique provider that won't be shared (for named instances)
   * @param config - Cache configuration
   * @returns Cache provider instance
   */
  private static createUniqueProvider(config: CacheConfig): ICacheProvider {
    let provider: ICacheProvider;

    switch (config.provider) {
      case 'memory':
        provider = new MemoryCacheProvider(config.memory);
        break;
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration is required for Redis provider');
        }
        provider = new RedisCacheProvider(config.redis);
        break;
      case 'file':
        if (!config.file) {
          throw new Error('File configuration is required for File provider');
        }
        provider = new FileCacheProvider(config.file);
        break;
      default:
        throw new Error(`Unsupported cache provider: ${config.provider}`);
    }

    return provider;
  }

  /**
   * Generate a unique key for cache configuration
   * @param config - Cache configuration
   * @returns Unique key string
   */
  private static generateKey(config: CacheConfig): string {
    const keyParts = [
      config.provider,
      config.ttl?.toString() || 'no-ttl',
      config.maxSize?.toString() || 'no-max-size',
      config.maxKeys?.toString() || 'no-max-keys',
      config.evictionPolicy || 'default'
    ];

    // Add provider-specific parts
    if (config.provider === 'memory' && config.memory) {
      keyParts.push(
        'memory',
        config.memory.maxKeys?.toString() || 'no-max-keys',
        config.memory.maxSize?.toString() || 'no-max-size',
        config.memory.checkPeriod?.toString() || 'default-check'
      );
    }

    if (config.redis) {
      keyParts.push(
        config.redis.host,
        config.redis.port.toString(),
        config.redis.database?.toString() || '0'
      );
    }

    if (config.file) {
      keyParts.push(
        config.file.directory,
        config.file.compression?.toString() || 'false'
      );
    }

    return keyParts.join(':');
  }

  /**
   * Generate a unique key for provider configuration
   * @param config - Cache configuration
   * @returns Unique provider key string
   */
  private static generateProviderKey(config: CacheConfig): string {
    const keyParts: string[] = [config.provider];

    // Include memory-specific configuration
    if (config.provider === 'memory' && config.memory) {
      keyParts.push(
        config.memory.maxKeys?.toString() || 'no-max-keys',
        config.memory.maxSize?.toString() || 'no-max-size',
        config.memory.checkPeriod?.toString() || 'default-check'
      );
    }

    if (config.redis) {
      keyParts.push(
        config.redis.host,
        config.redis.port.toString(),
        config.redis.database?.toString() || '0'
      );
    }

    if (config.file) {
      keyParts.push(config.file.directory);
    }

    return keyParts.join(':');
  }

  /**
   * Create a default memory cache
   * @param ttl - Optional default TTL in seconds
   * @returns Memory cache instance
   */
  static createMemoryCache(ttl?: number): ICache {
    return this.create({
      provider: 'memory',
      ttl,
      memory: {
        maxKeys: 1000,
        checkPeriod: 60 // Check for expired keys every minute
      }
    });
  }

  /**
   * Create a high-performance memory cache with specific settings
   * @param maxKeys - Maximum number of keys to store
   * @param maxSize - Maximum memory size in bytes
   * @returns High-performance memory cache instance
   */
  static createHighPerformanceCache(maxKeys = 10000, maxSize = 100 * 1024 * 1024): ICache {
    return this.create({
      provider: 'memory',
      evictionPolicy: 'lru',
      maxKeys,
      memory: {
        maxKeys,
        maxSize,
        checkPeriod: 30
      }
    });
  }
}
