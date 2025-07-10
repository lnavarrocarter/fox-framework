/**
 * @fileoverview Memory cache provider implementation
 * @module tsfox/core/cache/providers/memory
 */

import { 
  ICacheProvider, 
  CacheEntry, 
  ProviderInfo, 
  MemoryConfig 
} from '../interfaces';

/**
 * In-memory cache provider with TTL support and LRU eviction
 */
export class MemoryCacheProvider implements ICacheProvider {
  readonly name = 'memory';
  
  private cache = new Map<string, CacheEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  private accessOrder: string[] = [];
  private connected = true;
  private createdAt = Date.now();

  constructor(private config: MemoryConfig = {}) {
    // Start cleanup interval if configured
    if (config.checkPeriod) {
      setInterval(() => this.cleanup(), config.checkPeriod * 1000);
    }
  }

  /**
   * Connect to the memory provider (always successful)
   */
  async connect(): Promise<void> {
    this.connected = true;
  }

  /**
   * Disconnect from the memory provider
   */
  async disconnect(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
    this.accessOrder = [];
    this.connected = false;
  }

  /**
   * Check if the provider is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo {
    const memoryUsage = this.calculateMemoryUsage();
    
    return {
      name: this.name,
      version: '1.0.0',
      connected: this.connected,
      uptime: Date.now() - this.createdAt,
      memoryUsage: {
        used: memoryUsage,
        max: this.config.maxSize || Infinity,
        percentage: this.config.maxSize ? (memoryUsage / this.config.maxSize) * 100 : 0
      }
    };
  }

  /**
   * Get a value from memory cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update LRU order
    this.updateAccessOrder(key);

    return entry.value as T;
  }

  /**
   * Set a value in memory cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check memory limits before setting
    if (this.config.maxKeys && this.cache.size >= this.config.maxKeys) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: ttl ? now + (ttl * 1000) : undefined,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new value
    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    // Schedule expiration if TTL is set
    if (ttl) {
      this.scheduleExpiration(key, ttl);
    }

    // Check memory usage
    if (this.config.maxSize) {
      this.enforceMemoryLimit();
    }
  }

  /**
   * Delete a value from memory cache
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    
    if (existed) {
      this.cache.delete(key);
      
      // Clear timer
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      
      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    return existed;
  }

  /**
   * Clear all values from memory cache
   */
  async clear(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    this.accessOrder = [];
  }

  /**
   * Check if a key exists in memory cache
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Convert glob pattern to regex
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );

    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.expiresAt) {
      return false;
    }
    return Date.now() > entry.expiresAt;
  }

  /**
   * Schedule expiration for a key
   */
  private scheduleExpiration(key: string, ttl: number): void {
    const timer = setTimeout(async () => {
      await this.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }

  /**
   * Update the access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
  }

  /**
   * Enforce memory size limit by evicting LRU items
   */
  private enforceMemoryLimit(): void {
    if (!this.config.maxSize) return;
    
    while (this.calculateMemoryUsage() > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Calculate approximate memory usage in bytes
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // string characters are 2 bytes
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 100; // overhead for entry metadata
    }
    
    return totalSize;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
  }
}
