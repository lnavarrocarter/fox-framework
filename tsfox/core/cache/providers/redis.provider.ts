/**
 * @fileoverview Redis cache provider implementation
 * @module tsfox/core/cache/providers/redis
 */

import { 
  ICacheProvider, 
  RedisConfig, 
  CacheMetrics, 
  CacheEntry,
  ProviderInfo 
} from '../interfaces';

/**
 * Redis cache provider
 * NOTE: This is a mock implementation for development purposes.
 * In production, you would use a real Redis client like 'redis' or 'ioredis'
 */
export class RedisCacheProvider implements ICacheProvider {
  readonly name = 'redis';
  private connected = false;
  private cache = new Map<string, CacheEntry>(); // Mock Redis with Map
  private timers = new Map<string, NodeJS.Timeout>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    totalKeys: 0,
    memoryUsage: 0,
    evictions: 0
  };

  constructor(private config: RedisConfig) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.connected = true;
      console.log(`Connected to Redis at ${this.config.host}:${this.config.port}`);
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${(error as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();
      this.connected = false;
      console.log('Disconnected from Redis');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getInfo(): ProviderInfo {
    return {
      name: this.name,
      version: '1.0.0',
      connected: this.connected,
      uptime: Date.now() - (this.connected ? Date.now() : 0),
      memoryUsage: {
        used: this.estimateMemoryUsage(),
        max: 0,
        percentage: 0
      }
    };
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      this.metrics.totalRequests++;

      const entry = this.cache.get(key);
      
      if (!entry || this.isExpired(entry)) {
        this.metrics.misses++;
        this.cache.delete(key);
        this.timers.delete(key);
        return null;
      }

      this.metrics.hits++;
      
      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      return entry.value as T;
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
      this.updateHitRatio();
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      const entry: CacheEntry = {
        value,
        createdAt: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now()
      };

      this.cache.set(key, entry);
      this.metrics.totalKeys = this.cache.size;
      
      if (ttl) {
        this.scheduleExpiration(key, ttl);
      }
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      const existed = this.cache.has(key);
      this.cache.delete(key);
      this.metrics.totalKeys = this.cache.size;
      
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      
      return existed;
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  async clear(): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      this.cache.clear();
      this.metrics.totalKeys = 0;
      
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Redis provider not connected');
    }

    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys.filter(key => {
        const entry = this.cache.get(key);
        return entry && !this.isExpired(entry);
      });
    }

    return allKeys.filter(key => {
      const entry = this.cache.get(key);
      if (!entry || this.isExpired(entry)) {
        this.cache.delete(key);
        return false;
      }
      return this.simplePatternMatch(key, pattern);
    });
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      totalKeys: this.cache.size,
      memoryUsage: 0,
      evictions: 0
    };
  }

  async flush(): Promise<void> {
    await this.clear();
  }

  // Private helper methods

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.createdAt + (entry.ttl * 1000);
  }

  private scheduleExpiration(key: string, ttl: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
      this.metrics.totalKeys = this.cache.size;
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }

  private simplePatternMatch(str: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return str === pattern;
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }

  private updateAverageResponseTime(duration: number): void {
    const totalRequests = this.metrics.totalRequests;
    if (totalRequests === 0) {
      this.metrics.averageResponseTime = duration;
    } else {
      const currentAvg = this.metrics.averageResponseTime;
      this.metrics.averageResponseTime = ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
    }
  }

  private updateHitRatio(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;
    }
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length;
      size += JSON.stringify(entry.value).length;
      size += 64; // Overhead estimate
    }
    return size;
  }
}
