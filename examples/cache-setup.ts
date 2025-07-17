// Cache Setup Example - Fox Framework
import { FoxFactory } from '@foxframework/core';
import { CacheFactory, responseCache, apiCache } from '@foxframework/core/cache';
import { cacheConfig } from '../config/cache.config';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Initialize cache instance
const cache = CacheFactory.create(cacheConfig);

// Cache middleware for general responses
app.use(responseCache({
  ttl: cacheConfig.middleware.responseCache.ttl,
  varyHeaders: cacheConfig.middleware.responseCache.varyHeaders
}));

// API-specific cache middleware
app.use('/api', apiCache({
  ttl: cacheConfig.middleware.apiCache.ttl,
  excludePaths: cacheConfig.middleware.apiCache.excludePaths
}));

// Example routes with manual caching
app.get('/api/users', async (req, res) => {
  const cacheKey = 'users:list';
  
  // Try to get from cache first
  let users = await cache.get(cacheKey);
  
  if (!users) {
    // Simulate database fetch
    users = { data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] };
    
    // Store in cache
    await cache.set(cacheKey, users, 3600);
    console.log('✅ Users fetched from database and cached');
  } else {
    console.log('✅ Users served from cache');
  }
  
  res.json(users);
});

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  const metrics = cache.getMetrics();
  res.json({
    provider: 'redis',
    metrics: metrics,
    timestamp: new Date().toISOString()
  });
});

// Cache management endpoints
app.delete('/api/cache/flush', async (req, res) => {
  await cache.clear();
  res.json({ message: 'Cache flushed successfully' });
});

app.delete('/api/cache/key/:key', async (req, res) => {
  const { key } = req.params;
  await cache.delete(key);
  res.json({ message: `Cache key '${key}' deleted` });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦊 Fox Framework server with redis cache running on port ${PORT}`);
  console.log(`🗄️  Cache provider: redis`);
  console.log(`⏱️  Default TTL: 3600s`);
  console.log(`📊 Cache stats: http://localhost:${PORT}/api/cache/stats`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🗄️  Closing cache connections...');
  if (cache.disconnect) {
    await cache.disconnect();
  }
  process.exit(0);
});

export { app, cache };
