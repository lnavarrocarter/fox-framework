/**
 * @fileoverview Performance optimization middleware
 * @module tsfox/core/performance/middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createGzip, createDeflate, createBrotliCompress } from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createHash } from 'crypto';

/**
 * Compression middleware options
 */
export interface CompressionOptions {
  /** Enable gzip compression */
  gzip?: boolean;
  
  /** Enable deflate compression */
  deflate?: boolean;
  
  /** Enable brotli compression */
  brotli?: boolean;
  
  /** Minimum response size to compress (bytes) */
  threshold?: number;
  
  /** Compression level (1-9) */
  level?: number;
  
  /** Content types to compress */
  contentTypes?: string[];
  
  /** Skip compression for these paths */
  excludePaths?: string[];
}

/**
 * ETag middleware options
 */
export interface ETagOptions {
  /** Use weak ETags */
  weak?: boolean;
  
  /** Custom ETag generator function */
  generator?: (content: string) => string;
  
  /** Skip ETag for these paths */
  excludePaths?: string[];
}

/**
 * Caching middleware options
 */
export interface CachingOptions {
  /** Default cache control max-age (seconds) */
  maxAge?: number;
  
  /** Enable static file caching */
  staticFiles?: boolean;
  
  /** Static file max-age (seconds) */
  staticMaxAge?: number;
  
  /** API response max-age (seconds) */
  apiMaxAge?: number;
  
  /** Path-specific cache rules */
  rules?: Array<{
    pattern: RegExp | string;
    maxAge: number;
    public?: boolean;
    immutable?: boolean;
  }>;
}

/**
 * Content optimization middleware options
 */
export interface ContentOptimizationOptions {
  /** Minify HTML responses */
  minifyHtml?: boolean;
  
  /** Minify CSS responses */
  minifyCss?: boolean;
  
  /** Minify JavaScript responses */
  minifyJs?: boolean;
  
  /** Remove unnecessary whitespace */
  trimWhitespace?: boolean;
  
  /** Content types to optimize */
  contentTypes?: string[];
}

/**
 * Smart compression middleware with multiple algorithms
 */
export function compressionMiddleware(options: CompressionOptions = {}) {
  const {
    gzip = true,
    deflate = true,
    brotli = true,
    threshold = 1024,
    level = 6,
    contentTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'text/xml',
      'application/xml',
      'text/plain'
    ],
    excludePaths = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if path should be excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Store original write and end methods
    const originalWrite = res.write;
    const originalEnd = res.end;
    const chunks: Buffer[] = [];
    let isCompressed = false;

    // Override write method to collect response data
    res.write = function(chunk: any, encoding?: any): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return true;
    };

    // Override end method to apply compression
    (res as any).end = async function(chunk?: any, encoding?: any): Promise<any> {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const buffer = Buffer.concat(chunks);
      const contentType = res.getHeader('Content-Type') as string || '';
      
      // Check if we should compress
      const shouldCompress = 
        buffer.length >= threshold &&
        contentTypes.some(type => contentType.includes(type)) &&
        !res.getHeader('Content-Encoding');

      if (shouldCompress) {
        const acceptEncoding = req.headers['accept-encoding'] || '';
        let compressedBuffer: Buffer | null = null;
        let encoding: string | null = null;

        try {
          // Try brotli first (best compression)
          if (brotli && acceptEncoding.includes('br')) {
            compressedBuffer = await compressBuffer(buffer, 'brotli', level);
            encoding = 'br';
          }
          // Try gzip next
          else if (gzip && acceptEncoding.includes('gzip')) {
            compressedBuffer = await compressBuffer(buffer, 'gzip', level);
            encoding = 'gzip';
          }
          // Try deflate last
          else if (deflate && acceptEncoding.includes('deflate')) {
            compressedBuffer = await compressBuffer(buffer, 'deflate', level);
            encoding = 'deflate';
          }

          if (compressedBuffer && encoding) {
            res.setHeader('Content-Encoding', encoding);
            res.setHeader('Content-Length', compressedBuffer.length);
            res.setHeader('Vary', 'Accept-Encoding');
            isCompressed = true;
            
            // Use compressed buffer
            originalWrite.call(res, compressedBuffer);
            return originalEnd.call(res) as any;
          }
        } catch (error) {
          // Compression failed, send uncompressed
          console.warn('Compression failed:', error);
        }
      }

      // Send uncompressed
      res.setHeader('Content-Length', buffer.length);
      originalWrite.call(res, buffer);
      return originalEnd.call(res) as any;
    };

    next();
  };
}

/**
 * Smart ETag middleware with caching support
 */
export function etagMiddleware(options: ETagOptions = {}) {
  const {
    weak = true,
    generator,
    excludePaths = []
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path should be excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Only process GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const originalEnd = res.end;
    const chunks: Buffer[] = [];

    // Collect response data
    const originalWrite = res.write;
    res.write = function(chunk: any, encoding?: any): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return originalWrite.call(this, chunk, encoding);
    };

    res.end = function(chunk?: any, encoding?: any): void {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const buffer = Buffer.concat(chunks);
      let etag: string;

      if (generator) {
        etag = generator(buffer.toString());
      } else {
        const hash = createHash('md5').update(buffer).digest('hex');
        etag = weak ? `W/"${hash}"` : `"${hash}"`;
      }

      res.setHeader('ETag', etag);

      // Check if client has matching ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag && clientETag === etag) {
        res.statusCode = 304;
        res.removeHeader('Content-Length');
        return originalEnd.call(res);
      }

      return originalEnd.call(res, chunk, encoding);
    };

    next();
  };
}

/**
 * Smart caching middleware with different strategies
 */
export function cachingMiddleware(options: CachingOptions = {}) {
  const {
    maxAge = 3600, // 1 hour default
    staticFiles = true,
    staticMaxAge = 86400, // 24 hours for static files
    apiMaxAge = 300, // 5 minutes for API responses
    rules = []
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Apply custom rules first
    for (const rule of rules) {
      const matches = typeof rule.pattern === 'string' 
        ? req.path.startsWith(rule.pattern)
        : rule.pattern.test(req.path);

      if (matches) {
        setCacheHeaders(res, rule.maxAge, rule.public, rule.immutable);
        return next();
      }
    }

    // Static file handling
    if (staticFiles && isStaticFile(req.path)) {
      setCacheHeaders(res, staticMaxAge, true, true);
      return next();
    }

    // API endpoint handling
    if (req.path.startsWith('/api/')) {
      setCacheHeaders(res, apiMaxAge, false, false);
      return next();
    }

    // Default caching
    setCacheHeaders(res, maxAge, true, false);
    next();
  };
}

/**
 * Content optimization middleware
 */
export function contentOptimizationMiddleware(options: ContentOptimizationOptions = {}) {
  const {
    minifyHtml = true,
    minifyCss = true,
    minifyJs = true,
    trimWhitespace = true,
    contentTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript'
    ]
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const originalEnd = res.end;
    const chunks: Buffer[] = [];

    const originalWrite = res.write;
    res.write = function(chunk: any, encoding?: any): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return true;
    };

    res.end = function(chunk?: any, encoding?: any): void {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const buffer = Buffer.concat(chunks);
      const contentType = res.getHeader('Content-Type') as string || '';
      
      // Check if we should optimize this content type
      const shouldOptimize = contentTypes.some(type => contentType.includes(type));

      if (shouldOptimize && buffer.length > 0) {
        let content = buffer.toString();

        try {
          if (minifyHtml && contentType.includes('text/html')) {
            content = optimizeHtml(content, trimWhitespace);
          } else if (minifyCss && contentType.includes('text/css')) {
            content = optimizeCss(content, trimWhitespace);
          } else if (minifyJs && (contentType.includes('javascript'))) {
            content = optimizeJs(content, trimWhitespace);
          } else if (trimWhitespace) {
            content = content.replace(/\s+/g, ' ').trim();
          }

          const optimizedBuffer = Buffer.from(content);
          res.setHeader('Content-Length', optimizedBuffer.length);
          
          originalWrite.call(res, optimizedBuffer);
          return originalEnd.call(res);
        } catch (error) {
          console.warn('Content optimization failed:', error);
        }
      }

      // Send original content if optimization failed or not applicable
      originalWrite.call(res, buffer);
      return originalEnd.call(res);
    };

    next();
  };
}

/**
 * Request deduplication middleware
 */
export function requestDeduplicationMiddleware() {
  const activeRequests = new Map<string, Promise<any>>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only deduplicate GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const requestKey = `${req.method}:${req.originalUrl}`;
    
    // Check if this request is already in progress
    if (activeRequests.has(requestKey)) {
      try {
        // Wait for the ongoing request
        await activeRequests.get(requestKey);
        
        // If we have a cached response, send it
        const cached = getCachedResponse(requestKey);
        if (cached) {
          res.set(cached.headers);
          res.status(cached.status).send(cached.body);
          return;
        }
      } catch (error) {
        // Continue with normal processing if deduplication fails
      }
    }

    // Create promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): void {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheResponse(requestKey, {
            status: res.statusCode,
            headers: res.getHeaders(),
            body: chunk
          });
        }
        
        activeRequests.delete(requestKey);
        resolve(chunk);
        return originalEnd.call(this, chunk, encoding);
      };

      res.on('error', (error) => {
        activeRequests.delete(requestKey);
        reject(error);
      });
    });

    activeRequests.set(requestKey, requestPromise);
    next();
  };
}

/**
 * Performance monitoring integration middleware
 */
export function performanceOptimizationMiddleware(options: {
  enableCompression?: boolean;
  enableETag?: boolean;
  enableCaching?: boolean;
  enableContentOptimization?: boolean;
  enableDeduplication?: boolean;
} = {}) {
  const {
    enableCompression = true,
    enableETag = true,
    enableCaching = true,
    enableContentOptimization = true,
    enableDeduplication = true
  } = options;

  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  if (enableDeduplication) {
    middlewares.push(requestDeduplicationMiddleware());
  }

  if (enableCaching) {
    middlewares.push(cachingMiddleware());
  }

  if (enableETag) {
    middlewares.push(etagMiddleware());
  }

  if (enableContentOptimization) {
    middlewares.push(contentOptimizationMiddleware());
  }

  if (enableCompression) {
    middlewares.push(compressionMiddleware());
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    function runNext(): void {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const pipelineAsync = promisify(pipeline);

async function compressBuffer(buffer: Buffer, algorithm: 'gzip' | 'deflate' | 'brotli', level: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let stream;
    
    switch (algorithm) {
      case 'gzip':
        stream = createGzip({ level });
        break;
      case 'deflate':
        stream = createDeflate({ level });
        break;
      case 'brotli':
        stream = createBrotliCompress({
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: level
          }
        });
        break;
      default:
        return reject(new Error(`Unsupported compression algorithm: ${algorithm}`));
    }

    const chunks: Buffer[] = [];
    
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    
    stream.end(buffer);
  });
}

function setCacheHeaders(res: Response, maxAge: number, isPublic = true, immutable = false): void {
  const cacheControl = [
    isPublic ? 'public' : 'private',
    `max-age=${maxAge}`
  ];

  if (immutable) {
    cacheControl.push('immutable');
  }

  res.setHeader('Cache-Control', cacheControl.join(', '));
  
  // Set Expires header
  const expires = new Date(Date.now() + maxAge * 1000);
  res.setHeader('Expires', expires.toUTCString());
}

function isStaticFile(path: string): boolean {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => path.endsWith(ext));
}

function optimizeHtml(content: string, trimWhitespace: boolean): string {
  let optimized = content;

  if (trimWhitespace) {
    // Remove extra whitespace between tags
    optimized = optimized.replace(/>\s+</g, '><');
    // Remove leading/trailing whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
  }

  // Remove HTML comments (but preserve IE conditional comments)
  optimized = optimized.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  return optimized;
}

function optimizeCss(content: string, trimWhitespace: boolean): string {
  let optimized = content;

  if (trimWhitespace) {
    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ');
    // Remove whitespace around specific characters
    optimized = optimized.replace(/\s*([{}:;,>+~])\s*/g, '$1');
  }

  // Remove CSS comments
  optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

  return optimized.trim();
}

function optimizeJs(content: string, trimWhitespace: boolean): string {
  let optimized = content;

  if (trimWhitespace) {
    // Basic whitespace optimization (for simple cases)
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/\s*([{}();,])\s*/g, '$1');
  }

  // Remove single-line comments (but be careful with URLs)
  optimized = optimized.replace(/\/\/[^\r\n]*/g, '');
  
  // Remove multi-line comments
  optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

  return optimized.trim();
}

// Simple in-memory cache for request deduplication
const responseCache = new Map<string, {
  status: number;
  headers: Record<string, any>;
  body: any;
  timestamp: number;
}>();

const CACHE_TTL = 30000; // 30 seconds

function cacheResponse(key: string, response: { status: number; headers: Record<string, any>; body: any }): void {
  responseCache.set(key, {
    ...response,
    timestamp: Date.now()
  });

  // Clean up expired entries
  setTimeout(() => {
    const entry = responseCache.get(key);
    if (entry && Date.now() - entry.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }, CACHE_TTL);
}

function getCachedResponse(key: string): { status: number; headers: Record<string, any>; body: any } | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.timestamp <= CACHE_TTL) {
    return {
      status: entry.status,
      headers: entry.headers,
      body: entry.body
    };
  }
  return null;
}
