/**
 * @fileoverview Cache system interfaces for Fox Framework
 * @module tsfox/core/cache/interfaces
 */

/**
 * Core cache interface defining basic cache operations
 */
export interface ICache {
  /**
   * Retrieve a value from cache
   * @param key - The cache key
   * @returns Promise resolving to the cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a value in cache
   * @param key - The cache key
   * @param value - The value to store
   * @param ttl - Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key - The cache key
   * @returns Promise resolving to true if the key was deleted, false if not found
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cached values
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache
   * @param key - The cache key
   * @returns Promise resolving to true if key exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get cache metrics and statistics
   * @returns Current cache metrics
   */
  getMetrics(): CacheMetrics;

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match keys (supports wildcards)
   */
  invalidatePattern(pattern: string): Promise<number>;
}

/**
 * Cache provider interface for different storage backends
 */
export interface ICacheProvider {
  /**
   * The provider name/type
   */
  readonly name: string;

  /**
   * Connect to the cache backend
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the cache backend
   */
  disconnect(): Promise<void>;

  /**
   * Check if the provider is connected
   */
  isConnected(): boolean;

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo;

  /**
   * Get a value from the provider
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in the provider
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from the provider
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all values from the provider
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in the provider
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get all keys matching a pattern
   */
  keys(pattern?: string): Promise<string[]>;
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache metrics and statistics
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  totalRequests: number;
  averageResponseTime: number;
  totalKeys: number;
  memoryUsage?: number;
  evictions: number;
}

/**
 * Provider information
 */
export interface ProviderInfo {
  name: string;
  version: string;
  connected: boolean;
  uptime: number;
  memoryUsage?: {
    used: number;
    max: number;
    percentage: number;
  };
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  provider: CacheProvider;
  ttl?: number;
  maxSize?: number;
  maxKeys?: number;
  evictionPolicy?: EvictionPolicy;
  redis?: RedisConfig;
  file?: FileConfig;
  memory?: MemoryConfig;
}

/**
 * Redis cache configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

/**
 * File cache configuration
 */
export interface FileConfig {
  directory: string;
  compression?: boolean;
  serializer?: 'json' | 'binary';
  maxFileSize?: number;
  cleanupInterval?: number;
}

/**
 * Memory cache configuration
 */
export interface MemoryConfig {
  maxSize?: number;
  maxKeys?: number;
  checkPeriod?: number;
}

/**
 * Cache middleware options
 */
export interface CacheOptions {
  ttl?: number;
  key?: string | ((req: any) => string);
  condition?: (req: any, res: any) => boolean;
  vary?: string[];
  skipMethods?: string[];
  statusCodes?: number[];
}

/**
 * Cache provider types
 */
export type CacheProvider = 'memory' | 'redis' | 'file';

/**
 * Cache eviction policies
 */
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';

/**
 * Cache key generator function type
 */
export type CacheKeyGenerator = (req: any) => string;

/**
 * Cache condition function type
 */
export type CacheCondition = (req: any, res: any) => boolean;
