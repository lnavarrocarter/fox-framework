/**
 * @fileoverview Response cache middleware for Fox Framework
 * @module tsfox/core/cache/middleware/response
 */

import { CacheFactory } from '../cache.factory';
import { ICache, CacheOptions, CacheKeyGenerator } from '../interfaces';

/**
 * Response cache middleware that caches HTTP responses
 * @param options - Cache options and configuration
 * @returns Express middleware function
 */
export function responseCache(options: CacheOptions = {}) {
  const cache = CacheFactory.createMemoryCache(options.ttl);
  
  return async (req: any, res: any, next: any) => {
    try {
      // Check if caching should be skipped for this request
      if (shouldSkipCache(req, options)) {
        return next();
      }

      const key = generateCacheKey(req, options.key);
      
      // Check condition if provided
      if (options.condition && !options.condition(req, res)) {
        return next();
      }
      
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached) {
        // Handle Vary headers
        if (options.vary) {
          res.set('Vary', options.vary.join(', '));
        }
        
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Set initial cache miss header
      res.set('X-Cache', 'MISS');
      
      // Intercept response to cache it
      const originalJson = res.json;
      const originalSend = res.send;
      
      res.json = function(data: any) {
        // Only cache successful responses
        if (shouldCacheResponse(res, options)) {
          cache.set(key, data, options.ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        return originalJson.call(this, data);
      };
      
      res.send = function(data: any) {
        // Only cache successful responses
        if (shouldCacheResponse(res, options)) {
          cache.set(key, data, options.ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * API cache middleware specifically for API endpoints
 * @param options - Cache options
 * @returns Express middleware function
 */
export function apiCache(options: CacheOptions = {}) {
  const defaultOptions: CacheOptions = {
    ttl: 300, // 5 minutes default
    skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    statusCodes: [200],
    ...options
  };
  
  return responseCache(defaultOptions);
}

/**
 * Template cache middleware for caching rendered templates
 * @param options - Cache options
 * @returns Express middleware function
 */
export function templateCache(options: CacheOptions = {}) {
  const defaultOptions: CacheOptions = {
    ttl: 3600, // 1 hour default for templates
    key: (req: any) => `template:${req.path}:${JSON.stringify(req.query)}`,
    condition: (req: any, res: any) => req.method === 'GET',
    ...options
  };
  
  return responseCache(defaultOptions);
}

/**
 * Cache invalidation middleware
 * @param patterns - Array of cache key patterns to invalidate
 * @returns Express middleware function
 */
export function invalidateCache(patterns: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const cache = CacheFactory.get('default') || CacheFactory.createMemoryCache();
      
      for (const pattern of patterns) {
        await cache.invalidatePattern(pattern);
      }
      
      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
}

/**
 * Generate cache key from request
 * @param req - Express request object
 * @param keyOption - Custom key or key generator function
 * @returns Cache key string
 */
function generateCacheKey(req: any, keyOption?: string | CacheKeyGenerator): string {
  if (typeof keyOption === 'function') {
    return keyOption(req);
  }
  
  if (typeof keyOption === 'string') {
    return keyOption;
  }
  
  // Default key generation
  const baseKey = `${req.method}:${req.path}`;
  const queryString = Object.keys(req.query).length > 0 
    ? `:${JSON.stringify(req.query)}` 
    : '';
  
  return `${baseKey}${queryString}`;
}

/**
 * Check if request should skip caching
 * @param req - Express request object
 * @param options - Cache options
 * @returns True if should skip cache
 */
function shouldSkipCache(req: any, options: CacheOptions): boolean {
  // Skip if method is in skipMethods list
  if (options.skipMethods && options.skipMethods.includes(req.method)) {
    return true;
  }
  
  // Skip if Cache-Control header says no-cache
  const cacheControl = req.get('Cache-Control');
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return true;
  }
  
  return false;
}

/**
 * Check if response should be cached
 * @param res - Express response object
 * @param options - Cache options
 * @returns True if should cache response
 */
function shouldCacheResponse(res: any, options: CacheOptions): boolean {
  // Only cache specified status codes
  if (options.statusCodes && !options.statusCodes.includes(res.statusCode)) {
    return false;
  }
  
  // Don't cache if response has Cache-Control: no-cache
  const cacheControl = res.get('Cache-Control');
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return false;
  }
  
  return true;
}

/**
 * Get cache metrics middleware
 * @returns Express middleware function that adds cache metrics to response
 */
export function cacheMetrics() {
  return (req: any, res: any, next: any) => {
    const cache = CacheFactory.get('default') || CacheFactory.createMemoryCache();
    const metrics = cache.getMetrics();
    
    res.set('X-Cache-Hits', metrics.hits.toString());
    res.set('X-Cache-Misses', metrics.misses.toString());
    res.set('X-Cache-Hit-Ratio', metrics.hitRatio.toFixed(2));
    
    next();
  };
}
