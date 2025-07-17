// Cache Configuration - Fox Framework
import { CacheConfig } from '@foxframework/core';

export const cacheConfig: CacheConfig = {
  provider: 'redis' as const,
  
  // Provider-specific configuration
  redis: {
    url: 'redis://localhost:6379',
    defaultTTL: 3600,         // Default TTL in seconds
    keyPrefix: 'fox:',          // Prefix for all cache keys
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Global cache settings
  global: {
    defaultTTL: 3600,         // Default TTL for all cache operations
    enableMetrics: true,        // Enable cache performance metrics
    enableDebug: process.env.NODE_ENV === 'development'
  },
  
  // Cache middleware settings
  middleware: {
    responseCache: {
      enabled: true,
      ttl: 3600,
      varyHeaders: ['Accept-Encoding', 'Authorization'],
      skipOnError: true
    },
    apiCache: {
      enabled: true,
      ttl: 1800,  // Shorter TTL for API responses
      excludePaths: ['/auth', '/admin'],
      includeHeaders: ['Cache-Control', 'ETag']
    }
  }
};

export default cacheConfig;
