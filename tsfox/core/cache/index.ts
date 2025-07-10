/**
 * @fileoverview Cache system exports for Fox Framework
 * @module tsfox/core/cache
 */

// Core cache classes
export { Cache } from './cache';
export { CacheFactory } from './cache.factory';

// Providers
export { MemoryCacheProvider } from './providers/memory.provider';

// Middleware
export { 
  responseCache, 
  apiCache, 
  templateCache, 
  invalidateCache,
  cacheMetrics 
} from './middleware/response.middleware';

// Types and interfaces
export type {
  ICache,
  ICacheProvider,
  CacheEntry,
  CacheMetrics,
  ProviderInfo,
  CacheConfig,
  RedisConfig,
  FileConfig,
  MemoryConfig,
  CacheOptions,
  CacheProvider,
  EvictionPolicy,
  CacheKeyGenerator,
  CacheCondition
} from './interfaces';
