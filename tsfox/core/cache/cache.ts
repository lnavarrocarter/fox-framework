/**
 * @fileoverview Core cache implementation for Fox Framework
 * @module tsfox/core/cache/cache
 */

import { 
  ICache, 
  ICacheProvider, 
  CacheMetrics, 
  CacheConfig,
  EvictionPolicy 
} from './interfaces';

/**
 * Core cache implementation that wraps providers with common functionality
 */
export class Cache implements ICache {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    totalKeys: 0,
    evictions: 0
  };

  private startTimes = new Map<string, number>();

  constructor(
    private provider: ICacheProvider,
    private config: CacheConfig
  ) {}

  /**
   * Get a value from cache with metrics tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.startTimes.set(key, startTime);

    try {
      // Check if provider is connected
      if (!this.provider.isConnected()) {
        throw new Error('Cache provider is not connected');
      }

      const result = await this.provider.get<T>(key);
      
      this.updateMetrics(result !== null, startTime);
      
      return result;
    } catch (error) {
      this.updateMetrics(false, startTime);
      throw error;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check if provider is connected
    if (!this.provider.isConnected()) {
      throw new Error('Cache provider is not connected');
    }

    const finalTtl = ttl ?? this.config.ttl;
    
    // Check if we need to evict before setting
    if (this.config.maxKeys) {
      await this.enforceMaxKeys();
    }

    const startTime = Date.now();
    try {
      await this.provider.set(key, value, finalTtl);
      this.metrics.totalKeys++;
    } catch (error) {
      // Still update metrics even on errors
      const responseTime = Math.max(Date.now() - startTime, 1);
      this.metrics.totalRequests++;
      this.metrics.misses++;
      this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) 
        / this.metrics.totalRequests;
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    // Check if provider is connected
    if (!this.provider.isConnected()) {
      throw new Error('Cache provider is not connected');
    }

    const result = await this.provider.delete(key);
    if (result) {
      this.metrics.totalKeys = Math.max(0, this.metrics.totalKeys - 1);
    }
    return result;
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    await this.provider.clear();
    this.metrics.totalKeys = 0;
    this.resetMetrics();
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    return await this.provider.exists(key);
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.provider.keys(pattern);
    let deletedCount = 0;

    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Get the underlying provider
   */
  getProvider(): ICacheProvider {
    return this.provider;
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache metrics after an operation
   */
  private updateMetrics(isHit: boolean, startTime: number): void {
    const responseTime = Math.max(Date.now() - startTime, 1); // Ensure at least 1ms
    
    this.metrics.totalRequests++;
    
    if (isHit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    
    this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) 
      / this.metrics.totalRequests;
  }

  /**
   * Enforce maximum number of keys by evicting based on policy
   */
  private async enforceMaxKeys(): Promise<void> {
    if (!this.config.maxKeys) return;

    const currentKeys = await this.provider.keys();
    
    if (currentKeys.length >= this.config.maxKeys) {
      const keysToEvict = currentKeys.length - this.config.maxKeys + 1;
      await this.evictKeys(keysToEvict);
    }
  }

  /**
   * Evict keys based on the configured eviction policy
   */
  private async evictKeys(count: number): Promise<void> {
    const policy = this.config.evictionPolicy || 'lru';
    const keys = await this.provider.keys();
    
    // For now, implement simple FIFO eviction
    // In a real implementation, this would be more sophisticated
    const keysToEvict = keys.slice(0, count);
    
    for (const key of keysToEvict) {
      await this.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Reset metrics to initial values
   */
  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      totalKeys: 0,
      evictions: 0
    };
  }
}
