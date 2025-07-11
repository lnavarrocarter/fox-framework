/**
 * @fileoverview Cache system usage examples for Fox Framework
 * @module tsfox/core/cache/examples
 */

import { CacheFactory } from './cache.factory';
import { responseCache } from './middleware/response.middleware';

// ============================================================================
// BASIC CACHE USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic Memory Cache
 */
export async function basicMemoryCacheExample() {
  console.log('\n=== Basic Memory Cache Example ===');
  
  const cache = CacheFactory.create({
    provider: 'memory',
    maxSize: 1000,
    memory: {
      maxKeys: 100
    }
  });

  // Store some data
  await cache.set('user:123', { 
    id: 123, 
    name: 'John Doe', 
    email: 'john@example.com' 
  });
  
  await cache.set('session:abc', { 
    userId: 123, 
    token: 'abc123xyz',
    expires: Date.now() + 3600000 
  }, 3600); // 1 hour TTL

  // Retrieve data
  const user = await cache.get('user:123');
  const session = await cache.get('session:abc');
  
  console.log('User:', user);
  console.log('Session:', session);

  // Check metrics
  const metrics = cache.getMetrics();
  console.log('Cache metrics:', {
    hits: metrics.hits,
    misses: metrics.misses,
    hitRatio: metrics.hitRatio
  });
}

/**
 * Example 2: Redis Cache (Mock Implementation)
 */
export async function redisCacheExample() {
  console.log('\n=== Redis Cache Example ===');
  
  const cache = CacheFactory.create({
    provider: 'redis',
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
      database: 0,
      keyPrefix: 'myapp:'
    }
  });

  // Store data with different TTLs
  await cache.set('product:1', { 
    id: 1, 
    name: 'Laptop', 
    price: 999.99 
  }, 300); // 5 minutes

  await cache.set('config:theme', { 
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    darkMode: false 
  }); // No TTL - permanent

  // Get pattern keys (Redis provider specific)
  const redisProvider = cache as any;
  if (redisProvider.keys) {
    const keys = await redisProvider.keys('product:*');
    console.log('Product keys:', keys);
  }

  console.log('Redis cache operations completed');
}

/**
 * Example 3: File Cache
 */
export async function fileCacheExample() {
  console.log('\n=== File Cache Example ===');
  
  const cache = CacheFactory.create({
    provider: 'file',
    file: {
      directory: './cache',
      compression: false
    }
  });

  console.log('File cache initialized');

  // Store large data that would benefit from persistence
  const largeData = {
    reports: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      title: `Report ${i}`,
      data: Math.random().toString(36),
      timestamp: Date.now()
    }))
  };

  await cache.set('reports:monthly', largeData, 86400); // 24 hours

  // Store configuration
  await cache.set('app:config', {
    version: '1.0.0',
    features: ['auth', 'cache', 'logging'],
    environment: 'production'
  });

  // Retrieve and verify
  const reports = await cache.get('reports:monthly') as any;
  console.log(`Retrieved ${reports?.reports?.length || 0} reports from cache`);

  // Cleanup expired entries using provider-specific method
  const fileProvider = cache as any;
  if (fileProvider.cleanup) {
    const deletedCount = await fileProvider.cleanup();
    console.log(`Cleaned up ${deletedCount} expired entries`);
  }

  console.log('File cache operations completed');
}

// ============================================================================
// MIDDLEWARE EXAMPLES
// ============================================================================

/**
 * Example 4: Response Cache Middleware
 */
export function responseCacheMiddlewareExample() {
  console.log('\n=== Response Cache Middleware Example ===');
  
  // Basic response caching
  const basicCache = responseCache({
    ttl: 300, // 5 minutes
    condition: (req, res) => req.method === 'GET'
  });

  // API-specific caching with custom key
  const apiCache = responseCache({
    ttl: 600, // 10 minutes
    key: (req) => `api:${req.path}:${JSON.stringify(req.query)}`,
    condition: (req, res) => {
      return req.method === 'GET' && 
             req.path.startsWith('/api/') &&
             !req.headers.authorization; // Don't cache authenticated requests
    },
    vary: ['accept-language', 'user-agent']
  });

  // Template caching
  const templateCache = responseCache({
    ttl: 3600, // 1 hour
    key: (req) => `template:${req.path}:${req.query.lang || 'en'}`,
    condition: (req, res) => {
      return req.path.endsWith('.html') || req.path.includes('/templates/');
    }
  });

  console.log('Cache middleware examples created');
  return { basicCache, apiCache, templateCache };
}

// ============================================================================
// ADVANCED PATTERNS
// ============================================================================

/**
 * Example 5: Multi-layer Cache Strategy
 */
export async function multiLayerCacheExample() {
  console.log('\n=== Multi-layer Cache Strategy ===');
  
  // Layer 1: Fast memory cache for hot data
  const l1Cache = CacheFactory.create({
    provider: 'memory',
    maxSize: 50, // Small, fast cache
    memory: {
      maxKeys: 50
    }
  });

  // Layer 2: Redis cache for shared data
  const l2Cache = CacheFactory.create({
    provider: 'redis',
    redis: {
      host: 'localhost',
      port: 6379,
      database: 1
    }
  });

  // Layer 3: File cache for persistent data
  const l3Cache = CacheFactory.create({
    provider: 'file',
    file: {
      directory: './cache/persistent'
    }
  });

  console.log('Multi-layer cache system initialized');

  // Multi-layer get function
  async function getCached<T>(key: string): Promise<T | null> {
    // Try L1 (memory) first
    let value = await l1Cache.get<T>(key);
    if (value) {
      console.log(`Cache hit on L1 for ${key}`);
      return value;
    }

    // Try L2 (Redis) next
    value = await l2Cache.get<T>(key);
    if (value) {
      console.log(`Cache hit on L2 for ${key}, promoting to L1`);
      await l1Cache.set(key, value, 60); // Short TTL in L1
      return value;
    }

    // Try L3 (File) last
    value = await l3Cache.get<T>(key);
    if (value) {
      console.log(`Cache hit on L3 for ${key}, promoting to L2 and L1`);
      await l2Cache.set(key, value, 300); // Medium TTL in L2
      await l1Cache.set(key, value, 60);  // Short TTL in L1
      return value;
    }

    console.log(`Cache miss for ${key}`);
    return null;
  }

  // Multi-layer set function
  async function setCached<T>(key: string, value: T, ttl?: number): Promise<void> {
    await Promise.all([
      l1Cache.set(key, value, Math.min(ttl || 300, 60)),    // Max 1 min in L1
      l2Cache.set(key, value, Math.min(ttl || 300, 300)),   // Max 5 min in L2
      l3Cache.set(key, value, ttl) // Full TTL in L3
    ]);
  }

  // Example usage
  await setCached('user:456', { id: 456, name: 'Jane Doe' }, 3600);
  
  const cachedUser = await getCached('user:456');
  console.log('Retrieved user:', cachedUser);

  console.log('Multi-layer cache example completed');
}

/**
 * Example 6: Cache-aside Pattern
 */
export async function cacheAsidePatternExample() {
  console.log('\n=== Cache-aside Pattern Example ===');
  
  const cache = CacheFactory.create({
    provider: 'memory'
  });

  // Simulate database
  const database = new Map([
    ['user:1', { id: 1, name: 'Alice', email: 'alice@example.com' }],
    ['user:2', { id: 2, name: 'Bob', email: 'bob@example.com' }],
    ['user:3', { id: 3, name: 'Charlie', email: 'charlie@example.com' }]
  ]);

  async function getUser(id: number) {
    const key = `user:${id}`;
    
    // Try cache first
    let user = await cache.get(key);
    if (user) {
      console.log(`Cache hit for ${key}`);
      return user;
    }

    console.log(`Cache miss for ${key}, fetching from database`);
    
    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get from database
    user = database.get(key);
    if (user) {
      // Store in cache for future requests
      await cache.set(key, user, 300); // 5 minutes
      console.log(`Stored ${key} in cache`);
    }

    return user;
  }

  async function updateUser(id: number, updates: any) {
    const key = `user:${id}`;
    
    // Update database
    const current = database.get(key);
    if (current) {
      const updated = { ...current, ...updates };
      database.set(key, updated);
      
      // Invalidate cache
      await cache.delete(key);
      console.log(`Updated user ${id} and invalidated cache`);
      
      return updated;
    }
    return null;
  }

  // Example usage
  console.log('First request (cache miss):');
  await getUser(1);

  console.log('\nSecond request (cache hit):');
  await getUser(1);

  console.log('\nUpdate user:');
  await updateUser(1, { name: 'Alice Smith' });

  console.log('\nRequest after update (cache miss):');
  await getUser(1);
}

/**
 * Example 7: Cache Performance Monitoring
 */
export async function cachePerformanceMonitoringExample() {
  console.log('\n=== Cache Performance Monitoring ===');
  
  const cache = CacheFactory.create({
    provider: 'memory'
  });

  // Simulate various cache operations
  const operations = 1000;
  const keys = Array.from({ length: 100 }, (_, i) => `key:${i}`);
  const values = Array.from({ length: 100 }, (_, i) => ({ data: `value${i}` }));

  console.log(`Running ${operations} cache operations...`);
  const start = process.hrtime.bigint();

  for (let i = 0; i < operations; i++) {
    const keyIndex = Math.floor(Math.random() * keys.length);
    const key = keys[keyIndex];
    
    if (Math.random() < 0.7) { // 70% reads
      await cache.get(key);
    } else { // 30% writes
      await cache.set(key, values[keyIndex], 60);
    }
  }

  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convert to milliseconds

  const metrics = cache.getMetrics();
  
  console.log('\nPerformance Results:');
  console.log(`Total operations: ${operations}`);
  console.log(`Total duration: ${duration.toFixed(2)}ms`);
  console.log(`Average operation time: ${(duration / operations).toFixed(3)}ms`);
  console.log(`Operations per second: ${(operations / (duration / 1000)).toFixed(0)}`);
  
  console.log('\nCache Metrics:');
  console.log(`Hits: ${metrics.hits}`);
  console.log(`Misses: ${metrics.misses}`);
  console.log(`Hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`);
  console.log(`Total requests: ${metrics.totalRequests}`);
  console.log(`Average response time: ${metrics.averageResponseTime.toFixed(3)}ms`);
  console.log(`Total keys: ${metrics.totalKeys}`);
}

// ============================================================================
// MAIN DEMO FUNCTION
// ============================================================================

/**
 * Run all cache examples
 */
export async function runAllCacheExamples() {
  console.log('🚀 Fox Framework Cache System Examples');
  console.log('=====================================');

  try {
    await basicMemoryCacheExample();
    await redisCacheExample();
    await fileCacheExample();
    responseCacheMiddlewareExample();
    await multiLayerCacheExample();
    await cacheAsidePatternExample();
    await cachePerformanceMonitoringExample();
    
    console.log('\n✅ All cache examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running cache examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllCacheExamples();
}
