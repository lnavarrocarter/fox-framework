/**
 * @fileoverview HTTP layer optimization system
 * @module tsfox/core/performance/optimization
 */

import { OptimizationArea, OptimizationReport, Bottleneck, OptimizationOpportunity } from '../interfaces';

/**
 * HTTP optimization options
 */
export interface HttpOptimizationOptions {
  /** Enable keep-alive connections */
  keepAlive: boolean;
  
  /** Keep-alive timeout in milliseconds */
  keepAliveTimeout: number;
  
  /** Headers timeout in milliseconds */
  headersTimeout: number;
  
  /** Maximum number of connections */
  maxConnections: number;
  
  /** Enable compression */
  compression: boolean;
  
  /** Compression level (0-9) */
  compressionLevel: number;
  
  /** Enable response caching */
  enableCaching: boolean;
  
  /** Enable request/response pooling */
  enablePooling: boolean;
  
  /** Buffer size for responses */
  bufferSize: number;
}

/**
 * HTTP response cache
 */
export class HttpResponseCache {
  private cache = new Map<string, CachedResponse>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from request
   */
  private generateKey(method: string, url: string, headers?: Record<string, string>): string {
    const acceptEncoding = headers?.['accept-encoding'] || '';
    return `${method}:${url}:${acceptEncoding}`;
  }

  /**
   * Get cached response
   */
  get(method: string, url: string, headers?: Record<string, string>): CachedResponse | null {
    const key = this.generateKey(method, url, headers);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    cached.hits++;
    return cached;
  }

  /**
   * Set cached response
   */
  set(
    method: string, 
    url: string, 
    statusCode: number, 
    headers: Record<string, string>, 
    body: Buffer | string,
    ttl?: number
  ): void {
    // Only cache GET requests and successful responses
    if (method !== 'GET' || statusCode < 200 || statusCode >= 300) {
      return;
    }

    // Don't cache if cache-control says not to
    const cacheControl = headers['cache-control'];
    if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
      return;
    }

    const key = this.generateKey(method, url, headers);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      statusCode,
      headers: { ...headers },
      body: Buffer.isBuffer(body) ? body : Buffer.from(body),
      createdAt: Date.now(),
      expiresAt,
      hits: 0,
      size: Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    totalHits: number;
    totalSize: number;
    hitRatio: number;
  } {
    let totalHits = 0;
    let totalSize = 0;
    let totalRequests = 0;

    for (const cached of this.cache.values()) {
      totalHits += cached.hits;
      totalSize += cached.size;
      totalRequests += cached.hits + 1; // +1 for the initial cache set
    }

    return {
      size: this.cache.size,
      totalHits,
      totalSize,
      hitRatio: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    };
  }
}

/**
 * Cached response structure
 */
interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
}

/**
 * HTTP connection pool
 */
export class HttpConnectionPool {
  private connections = new Map<string, PooledConnection[]>();
  private maxConnectionsPerHost: number;
  private keepAliveTimeout: number;

  constructor(maxConnectionsPerHost: number = 10, keepAliveTimeout: number = 60000) {
    this.maxConnectionsPerHost = maxConnectionsPerHost;
    this.keepAliveTimeout = keepAliveTimeout;
  }

  /**
   * Get connection from pool
   */
  getConnection(host: string): PooledConnection | null {
    const connections = this.connections.get(host) || [];
    
    // Find available connection
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      if (!conn.inUse && Date.now() < conn.expiresAt) {
        conn.inUse = true;
        conn.lastUsed = Date.now();
        return conn;
      }
    }

    return null;
  }

  /**
   * Return connection to pool
   */
  returnConnection(host: string, connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    connection.expiresAt = Date.now() + this.keepAliveTimeout;

    const connections = this.connections.get(host) || [];
    
    // Remove expired connections
    const validConnections = connections.filter(conn => Date.now() < conn.expiresAt);
    
    // Add current connection if under limit
    if (validConnections.length < this.maxConnectionsPerHost) {
      validConnections.push(connection);
    }

    this.connections.set(host, validConnections);
  }

  /**
   * Clean up expired connections
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [host, connections] of this.connections) {
      const validConnections = connections.filter(conn => now < conn.expiresAt);
      
      if (validConnections.length === 0) {
        this.connections.delete(host);
      } else {
        this.connections.set(host, validConnections);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    hostsWithConnections: number;
  } {
    let totalConnections = 0;
    let activeConnections = 0;

    for (const connections of this.connections.values()) {
      totalConnections += connections.length;
      activeConnections += connections.filter(conn => conn.inUse).length;
    }

    return {
      totalConnections,
      activeConnections,
      hostsWithConnections: this.connections.size
    };
  }
}

/**
 * Pooled connection structure
 */
interface PooledConnection {
  id: string;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
  // In a real implementation, this would contain the actual connection object
  socket?: any;
}

/**
 * HTTP layer optimizer for high-performance HTTP handling
 */
export class HttpOptimizer {
  private static options: HttpOptimizationOptions;
  private static responseCache?: HttpResponseCache;
  private static connectionPool?: HttpConnectionPool;
  private static compressionEnabled = false;

  /**
   * Initialize HTTP optimizer
   */
  static initialize(options: HttpOptimizationOptions): void {
    const defaultOptions: HttpOptimizationOptions = {
      keepAlive: true,
      keepAliveTimeout: 65000,
      headersTimeout: 66000,
      maxConnections: 1000,
      compression: true,
      compressionLevel: 6,
      enableCaching: true,
      enablePooling: true,
      bufferSize: 64 * 1024 // 64KB
    };

    this.options = { ...defaultOptions, ...options };

    if (this.options.enableCaching) {
      this.responseCache = new HttpResponseCache();
    }

    if (this.options.enablePooling) {
      this.connectionPool = new HttpConnectionPool(
        this.options.maxConnections,
        this.options.keepAliveTimeout
      );
    }

    this.compressionEnabled = this.options.compression;

    // Schedule periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Optimize HTTP server configuration
   */
  static optimizeServer(server: any): void {
    if (!server) return;

    // Configure timeouts
    if (this.options.keepAliveTimeout) {
      server.keepAliveTimeout = this.options.keepAliveTimeout;
    }

    if (this.options.headersTimeout) {
      server.headersTimeout = this.options.headersTimeout;
    }

    // Configure connection limits
    if (this.options.maxConnections) {
      server.maxConnections = this.options.maxConnections;
    }

    // Enable keep-alive
    if (this.options.keepAlive) {
      server.keepAliveTimeout = this.options.keepAliveTimeout;
    }
  }

  /**
   * Create optimized response handler
   */
  static createResponseHandler() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();

      // Check cache first
      if (this.options.enableCaching && this.responseCache && req.method === 'GET') {
        const cached = this.responseCache.get(req.method, req.url, req.headers);
        if (cached) {
          res.statusCode = cached.statusCode;
          Object.entries(cached.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.setHeader('X-Cache', 'HIT');
          res.end(cached.body);
          return;
        }
      }

      // Override res.end to implement caching and optimization
      const originalEnd = res.end;
      let responseBody: Buffer | undefined;

      res.end = function(chunk?: any, encoding?: any) {
        const duration = Date.now() - start;

        // Capture response body for caching
        if (chunk && HttpOptimizer.options.enableCaching) {
          responseBody = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        }

        // Cache response if applicable
        if (HttpOptimizer.responseCache && req.method === 'GET' && responseBody) {
          HttpOptimizer.responseCache.set(
            req.method,
            req.url,
            res.statusCode,
            res.getHeaders(),
            responseBody
          );
          res.setHeader('X-Cache', 'MISS');
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Powered-By', 'Fox-Framework');

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Create compression middleware
   */
  static createCompressionMiddleware() {
    if (!this.compressionEnabled) {
      return (req: any, res: any, next: any) => next();
    }

    return (req: any, res: any, next: any) => {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      // Check if client accepts compression
      if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
        return next();
      }

      const originalWrite = res.write;
      const originalEnd = res.end;
      let buffer = Buffer.alloc(0);

      res.write = function(chunk: any, encoding?: any) {
        if (chunk) {
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
          buffer = Buffer.concat([buffer, data]);
        }
        return true;
      };

      res.end = function(chunk?: any, encoding?: any) {
        if (chunk) {
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
          buffer = Buffer.concat([buffer, data]);
        }

        // Only compress if buffer is large enough and content type is compressible
        const contentType = res.getHeader('content-type') || '';
        const shouldCompress = buffer.length > 1024 && HttpOptimizer.isCompressible(contentType);

        if (shouldCompress) {
          try {
            const compressed = HttpOptimizer.compress(buffer, acceptEncoding);
            if (compressed) {
              res.setHeader('Content-Encoding', compressed.encoding);
              res.setHeader('Content-Length', compressed.data.length);
              res.removeHeader('content-length'); // Remove original length
              return originalEnd.call(this, compressed.data);
            }
          } catch (error) {
            // Fall back to uncompressed if compression fails
          }
        }

        return originalEnd.call(this, buffer);
      };

      next();
    };
  }

  /**
   * Check if content type is compressible
   */
  private static isCompressible(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml'
    ];

    return compressibleTypes.some(type => contentType.startsWith(type));
  }

  /**
   * Compress data using gzip or deflate
   */
  private static compress(data: Buffer, acceptEncoding: string): { data: Buffer; encoding: string } | null {
    const zlib = require('zlib');

    try {
      if (acceptEncoding.includes('gzip')) {
        return {
          data: zlib.gzipSync(data, { level: this.options.compressionLevel }),
          encoding: 'gzip'
        };
      } else if (acceptEncoding.includes('deflate')) {
        return {
          data: zlib.deflateSync(data, { level: this.options.compressionLevel }),
          encoding: 'deflate'
        };
      }
    } catch (error) {
      // Compression failed
    }

    return null;
  }

  /**
   * Analyze HTTP performance
   */
  static analyze(): OptimizationReport {
    const bottlenecks: Bottleneck[] = [];
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze cache performance
    if (this.responseCache) {
      const cacheStats = this.responseCache.getStats();
      
      if (cacheStats.hitRatio < 30) {
        bottlenecks.push({
          area: 'http',
          severity: 'medium',
          description: 'Low cache hit ratio affecting performance',
          impact: 40,
          solutions: [
            'Review cache TTL settings',
            'Optimize cacheable endpoints',
            'Implement cache warming strategies',
            'Add cache headers to responses'
          ]
        });
      }

      if (cacheStats.totalSize > 50 * 1024 * 1024) { // 50MB
        opportunities.push({
          area: 'http',
          potentialGain: 20,
          difficulty: 'medium',
          description: 'Large cache size may impact memory',
          steps: [
            'Implement cache size limits',
            'Add LRU eviction policy',
            'Monitor cache memory usage'
          ]
        });
      }
    } else {
      opportunities.push({
        area: 'http',
        potentialGain: 35,
        difficulty: 'easy',
        description: 'HTTP response caching not enabled',
        steps: [
          'Enable response caching',
          'Configure cache TTL',
          'Add cache headers'
        ]
      });
    }

    // Analyze compression
    if (!this.compressionEnabled) {
      opportunities.push({
        area: 'http',
        potentialGain: 60,
        difficulty: 'easy',
        description: 'HTTP compression not enabled',
        steps: [
          'Enable gzip/deflate compression',
          'Configure compression level',
          'Add compression for static assets'
        ]
      });
    }

    // Analyze connection pooling
    if (this.connectionPool) {
      const poolStats = this.connectionPool.getStats();
      
      if (poolStats.activeConnections > poolStats.totalConnections * 0.8) {
        bottlenecks.push({
          area: 'http',
          severity: 'high',
          description: 'High connection pool utilization',
          impact: 50,
          solutions: [
            'Increase connection pool size',
            'Optimize connection reuse',
            'Implement connection throttling'
          ]
        });
      }
    }

    return {
      score: Math.max(0, 100 - (bottlenecks.length * 20) - (opportunities.length * 10)),
      bottlenecks,
      opportunities,
      currentMetrics: {
        http: {
          requestsPerSecond: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          errorRate: 0,
          totalRequests: 0,
          activeConnections: this.connectionPool?.getStats().activeConnections || 0,
          throughput: 0
        },
        system: {
          cpuUsage: 0,
          memoryUsage: 0,
          heapUsed: 0,
          heapTotal: 0,
          eventLoopLag: 0,
          gc: {
            totalTime: 0,
            frequency: 0,
            averagePause: 0,
            memoryFreed: 0
          },
          uptime: process.uptime()
        },
        application: {
          cacheHitRatio: this.responseCache?.getStats().hitRatio || 0,
          templateRenderTime: 0,
          databaseQueryTime: 0,
          middlewareExecutionTime: 0,
          routeResolutionTime: 0,
          activeSessions: 0
        },
        custom: {
          cacheStats: this.responseCache?.getStats(),
          poolStats: this.connectionPool?.getStats(),
          compressionEnabled: this.compressionEnabled
        },
        timestamp: Date.now()
      },
      estimatedImprovements: {
        'response_time': this.responseCache ? 30 : 0,
        'bandwidth_usage': this.compressionEnabled ? 60 : 0,
        'connection_efficiency': this.connectionPool ? 25 : 0
      }
    };
  }

  /**
   * Get HTTP performance statistics
   */
  static getStats(): {
    cache?: any;
    pool?: any;
    compression: boolean;
    options: HttpOptimizationOptions;
  } {
    return {
      cache: this.responseCache?.getStats(),
      pool: this.connectionPool?.getStats(),
      compression: this.compressionEnabled,
      options: this.options
    };
  }

  /**
   * Clean up resources
   */
  private static cleanup(): void {
    if (this.responseCache) {
      // Cache cleanup is handled internally
    }

    if (this.connectionPool) {
      this.connectionPool.cleanup();
    }
  }

  /**
   * Clear all caches
   */
  static clearCaches(): void {
    if (this.responseCache) {
      this.responseCache.clear();
    }
  }
}
