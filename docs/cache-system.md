# Fox Framework Cache System

## Overview

The Fox Framework Cache System provides a comprehensive, multi-provider caching solution with support for Memory, Redis, and File-based storage. The system is designed with performance, flexibility, and ease of use in mind.

## Features

- **Multiple Providers**: Memory, Redis, and File-based caching
- **TTL Support**: Automatic expiration with cleanup mechanisms
- **Metrics Tracking**: Performance monitoring and hit/miss ratios
- **Type Safety**: Full TypeScript support with generic types
- **Factory Pattern**: Easy cache instantiation and configuration
- **Middleware Integration**: Response caching for web applications
- **Pattern Matching**: Key-based operations with wildcard support

## Quick Start

### Basic Usage

```typescript
import { CacheFactory } from '@tsfox/core/cache';

// Create a memory cache
const cache = CacheFactory.create({
  provider: 'memory',
  maxSize: 1000
});

// Store data
await cache.set('user:123', { name: 'John Doe' }, 3600); // 1 hour TTL

// Retrieve data
const user = await cache.get('user:123');

// Check metrics
const metrics = cache.getMetrics();
console.log(`Hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`);
```

### File Cache

```typescript
const cache = CacheFactory.create({
  provider: 'file',
  file: {
    directory: './cache',
    compression: false
  }
});

await cache.set('config', { theme: 'dark' });
const config = await cache.get('config');
```

### Redis Cache

```typescript
const cache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:'
  }
});

await cache.set('session:abc', { userId: 123 }, 1800); // 30 minutes
```

## Providers

### Memory Provider

- **Best for**: Hot data, frequently accessed information
- **Features**: LRU eviction, configurable size limits
- **Persistence**: No (in-memory only)

```typescript
const memoryCache = CacheFactory.create({
  provider: 'memory',
  maxSize: 500,
  memory: {
    maxKeys: 1000
  }
});
```

### File Provider

- **Best for**: Persistent data, large objects, development
- **Features**: Disk persistence, automatic cleanup, JSON storage
- **Persistence**: Yes (survives restarts)

```typescript
const fileCache = CacheFactory.create({
  provider: 'file',
  file: {
    directory: './cache',
    compression: false
  }
});
```

### Redis Provider

- **Best for**: Distributed caching, shared data across instances
- **Features**: Network storage, clustering support, pub/sub capabilities
- **Persistence**: Configurable (depends on Redis configuration)

```typescript
const redisCache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
    database: 0,
    keyPrefix: 'app:'
  }
});
```

## Middleware

### Response Cache Middleware

Automatically cache HTTP responses based on configurable rules:

```typescript
import { responseCache } from '@tsfox/core/cache/middleware';

// Basic response caching
app.use(responseCache({
  ttl: 300, // 5 minutes
  condition: (req, res) => req.method === 'GET'
}));

// Advanced configuration
app.use('/api', responseCache({
  ttl: 600,
  key: (req) => `api:${req.path}:${JSON.stringify(req.query)}`,
  condition: (req, res) => {
    return req.method === 'GET' && 
           !req.headers.authorization;
  },
  vary: ['accept-language']
}));
```

## Advanced Patterns

### Multi-layer Caching

Combine multiple cache providers for optimal performance:

```typescript
// L1: Memory (fastest)
const l1Cache = CacheFactory.create({ provider: 'memory' });

// L2: Redis (shared)
const l2Cache = CacheFactory.create({ provider: 'redis' });

// L3: File (persistent)
const l3Cache = CacheFactory.create({ provider: 'file' });

async function getCached<T>(key: string): Promise<T | null> {
  // Try L1 first
  let value = await l1Cache.get<T>(key);
  if (value) return value;

  // Try L2 next
  value = await l2Cache.get<T>(key);
  if (value) {
    await l1Cache.set(key, value, 60); // Promote to L1
    return value;
  }

  // Try L3 last
  value = await l3Cache.get<T>(key);
  if (value) {
    await l2Cache.set(key, value, 300); // Promote to L2
    await l1Cache.set(key, value, 60);  // Promote to L1
    return value;
  }

  return null;
}
```

### Cache-aside Pattern

```typescript
async function getUser(id: number) {
  const key = `user:${id}`;
  
  // Try cache first
  let user = await cache.get(key);
  if (user) return user;

  // Load from database
  user = await database.findUser(id);
  if (user) {
    await cache.set(key, user, 300);
  }

  return user;
}

async function updateUser(id: number, data: any) {
  const key = `user:${id}`;
  
  // Update database
  const user = await database.updateUser(id, data);
  
  // Invalidate cache
  await cache.delete(key);
  
  return user;
}
```

## Configuration

### Environment Variables

```bash
# Cache configuration
CACHE_PROVIDER=redis
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DATABASE=0

# File cache configuration
FILE_CACHE_DIRECTORY=./cache
FILE_CACHE_COMPRESSION=false
```

### Configuration Object

```typescript
interface CacheConfig {
  provider: 'memory' | 'redis' | 'file';
  maxSize?: number;
  defaultTtl?: number;
  
  memory?: {
    maxKeys?: number;
  };
  
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    database?: number;
    keyPrefix?: string;
  };
  
  file?: {
    directory?: string;
    compression?: boolean;
  };
}
```

## Performance Monitoring

### Metrics Collection

```typescript
const metrics = cache.getMetrics();

console.log({
  hits: metrics.hits,
  misses: metrics.misses,
  hitRatio: metrics.hitRatio,
  totalRequests: metrics.totalRequests,
  averageResponseTime: metrics.averageResponseTime,
  totalKeys: metrics.totalKeys
});
```

### Performance Testing

```typescript
// Run performance benchmark
const operations = 10000;
const start = Date.now();

for (let i = 0; i < operations; i++) {
  if (Math.random() < 0.7) {
    await cache.get(`key:${Math.floor(Math.random() * 100)}`);
  } else {
    await cache.set(`key:${i}`, { data: `value${i}` });
  }
}

const duration = Date.now() - start;
console.log(`${operations} operations in ${duration}ms`);
console.log(`${(operations / (duration / 1000)).toFixed(0)} ops/sec`);
```

## API Reference

### ICache Interface

```typescript
interface ICache {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  getMetrics(): CacheMetrics;
}
```

### CacheFactory

```typescript
class CacheFactory {
  static create(config: CacheConfig): ICache;
}
```

### Response Cache Middleware

```typescript
function responseCache(options: {
  ttl?: number;
  key?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  vary?: string[];
}): Middleware;
```

## Error Handling

The cache system provides comprehensive error handling:

```typescript
try {
  await cache.set('key', 'value');
} catch (error) {
  if (error instanceof CacheConnectionError) {
    console.log('Cache connection failed');
  } else if (error instanceof CacheOperationError) {
    console.log('Cache operation failed');
  } else {
    console.log('Unknown cache error');
  }
}
```

## Testing

### Unit Tests

```typescript
describe('Cache System', () => {
  let cache: ICache;

  beforeEach(() => {
    cache = CacheFactory.create({ provider: 'memory' });
  });

  it('should store and retrieve data', async () => {
    await cache.set('test', 'value');
    const result = await cache.get('test');
    expect(result).toBe('value');
  });

  it('should handle TTL expiration', async () => {
    await cache.set('test', 'value', 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cache.get('test');
    expect(result).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Cache Integration', () => {
  it('should work with Express middleware', async () => {
    const app = express();
    app.use(responseCache({ ttl: 60 }));
    
    const response1 = await request(app).get('/test');
    const response2 = await request(app).get('/test');
    
    expect(response2.headers['x-cache']).toBe('HIT');
  });
});
```

## Best Practices

1. **Choose the Right Provider**:
   - Memory: Hot data, small datasets
   - Redis: Shared data, distributed systems
   - File: Development, persistent data

2. **Set Appropriate TTLs**:
   - Short TTL for frequently changing data
   - Longer TTL for stable data
   - No TTL for configuration data

3. **Monitor Performance**:
   - Track hit ratios
   - Monitor response times
   - Set up alerting for cache failures

4. **Handle Cache Failures Gracefully**:
   - Always have fallback to data source
   - Log cache errors but don't fail requests
   - Consider circuit breaker patterns

5. **Use Consistent Key Naming**:
   - Use prefixes to group related data
   - Include version information when needed
   - Avoid special characters in keys

6. **Implement Cache Warming**:
   - Pre-populate cache with critical data
   - Use background jobs for cache updates
   - Consider cache refresh strategies

## Troubleshooting

### Common Issues

1. **High Cache Miss Rate**:
   - Check TTL settings
   - Verify key naming consistency
   - Monitor cache size limits

2. **Memory Usage Issues**:
   - Set appropriate maxSize limits
   - Monitor cache metrics
   - Consider using File or Redis provider

3. **Redis Connection Errors**:
   - Verify Redis server is running
   - Check network connectivity
   - Validate Redis configuration

4. **File Cache Performance**:
   - Ensure sufficient disk space
   - Check file system permissions
   - Consider SSD storage for better performance

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const cache = CacheFactory.create({
  provider: 'memory',
  debug: true // Enable debug logging
});
```

## Migration Guide

### From Memory to Redis

```typescript
// Before
const cache = CacheFactory.create({ provider: 'memory' });

// After
const cache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});
```

### From Redis to File

```typescript
// Before
const cache = CacheFactory.create({ provider: 'redis' });

// After
const cache = CacheFactory.create({
  provider: 'file',
  file: {
    directory: './cache'
  }
});
```

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backwards compatibility
5. Include performance benchmarks

## License

MIT License - see LICENSE file for details.
