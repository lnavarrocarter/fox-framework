/**
 * @fileoverview Template rendering optimization system
 * @module tsfox/core/performance/optimization
 */

import { OptimizationArea, OptimizationReport, Bottleneck, OptimizationOpportunity } from '../interfaces';

/**
 * Template optimization options
 */
export interface TemplateOptimizationOptions {
  /** Enable template caching */
  enableCaching: boolean;
  
  /** Maximum cache size */
  maxCacheSize: number;
  
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  
  /** Enable template precompilation */
  precompile: boolean;
  
  /** Enable partial caching */
  enablePartialCaching: boolean;
  
  /** Enable template minification */
  minify: boolean;
  
  /** Enable async rendering */
  asyncRendering: boolean;
}

/**
 * Compiled template structure
 */
export interface CompiledTemplate {
  /** Template identifier */
  id: string;
  
  /** Compiled render function */
  render: (data: any) => string | Promise<string>;
  
  /** Template metadata */
  metadata: {
    path: string;
    compiledAt: number;
    size: number;
    dependencies: string[];
    isAsync: boolean;
  };
  
  /** Performance statistics */
  stats: {
    renderCount: number;
    totalRenderTime: number;
    averageRenderTime: number;
    lastRendered: number;
  };
}

/**
 * Template cache for high-performance template storage
 */
export class TemplateCache {
  private cache = new Map<string, CachedTemplate>();
  private partialCache = new Map<string, CachedPartial>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 300000) { // 5 minutes
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get compiled template from cache
   */
  getTemplate(path: string): CompiledTemplate | null {
    const cached = this.cache.get(path);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(path);
      return null;
    }

    cached.hits++;
    cached.lastAccessed = Date.now();
    return cached.template;
  }

  /**
   * Set compiled template in cache
   */
  setTemplate(path: string, template: CompiledTemplate, customTTL?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + (customTTL || this.ttl);
    
    this.cache.set(path, {
      template,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      hits: 0,
      size: template.metadata.size
    });
  }

  /**
   * Get cached partial
   */
  getPartial(key: string): string | null {
    const cached = this.partialCache.get(key);
    
    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) this.partialCache.delete(key);
      return null;
    }

    cached.hits++;
    return cached.content;
  }

  /**
   * Set cached partial
   */
  setPartial(key: string, content: string, customTTL?: number): void {
    const expiresAt = Date.now() + (customTTL || this.ttl);
    
    this.partialCache.set(key, {
      content,
      createdAt: Date.now(),
      expiresAt,
      hits: 0,
      size: Buffer.byteLength(content)
    });
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache) {
      if (cached.lastAccessed < oldestTime) {
        oldestTime = cached.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    templateCount: number;
    partialCount: number;
    totalHits: number;
    totalSize: number;
    hitRatio: number;
  } {
    let templateHits = 0;
    let templateSize = 0;
    let templateRequests = 0;

    for (const cached of this.cache.values()) {
      templateHits += cached.hits;
      templateSize += cached.size;
      templateRequests += cached.hits + 1; // +1 for initial cache
    }

    let partialHits = 0;
    let partialSize = 0;
    let partialRequests = 0;

    for (const cached of this.partialCache.values()) {
      partialHits += cached.hits;
      partialSize += cached.size;
      partialRequests += cached.hits + 1;
    }

    const totalHits = templateHits + partialHits;
    const totalRequests = templateRequests + partialRequests;

    return {
      templateCount: this.cache.size,
      partialCount: this.partialCache.size,
      totalHits,
      totalSize: templateSize + partialSize,
      hitRatio: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.partialCache.clear();
  }
}

/**
 * Cached template structure
 */
interface CachedTemplate {
  template: CompiledTemplate;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  hits: number;
  size: number;
}

/**
 * Cached partial structure
 */
interface CachedPartial {
  content: string;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
}

/**
 * Template compiler for optimized rendering
 */
export class TemplateCompiler {
  private static compileCache = new Map<string, string>();

  /**
   * Compile template source to optimized function
   */
  static compile(source: string, path: string, options: TemplateOptimizationOptions): CompiledTemplate {
    let compiled = source;

    // Minify template if enabled
    if (options.minify) {
      compiled = this.minifyTemplate(compiled);
    }

    // Preprocess template for optimization
    compiled = this.preprocessTemplate(compiled);

    // Create render function
    const renderFunction = this.createRenderFunction(compiled, options.asyncRendering);

    // Analyze dependencies
    const dependencies = this.analyzeDependencies(compiled);

    return {
      id: this.generateTemplateId(path),
      render: renderFunction,
      metadata: {
        path,
        compiledAt: Date.now(),
        size: Buffer.byteLength(compiled),
        dependencies,
        isAsync: options.asyncRendering
      },
      stats: {
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRendered: 0
      }
    };
  }

  /**
   * Minify template by removing unnecessary whitespace and comments
   */
  private static minifyTemplate(source: string): string {
    return source
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/>\s+</g, '><') // Remove space between tags
      .trim();
  }

  /**
   * Preprocess template for performance optimizations
   */
  private static preprocessTemplate(source: string): string {
    // Replace common patterns with optimized versions
    let processed = source;

    // Optimize loop constructs
    processed = processed.replace(
      /\{\{\s*#each\s+(\w+)\s*\}\}/g,
      '{{#each $1}}{{!-- optimized loop --}}'
    );

    // Optimize conditional statements
    processed = processed.replace(
      /\{\{\s*#if\s+(\w+)\s*\}\}/g,
      '{{#if $1}}{{!-- optimized condition --}}'
    );

    return processed;
  }

  /**
   * Create optimized render function
   */
  private static createRenderFunction(template: string, isAsync: boolean): (data: any) => string | Promise<string> {
    if (isAsync) {
      return async (data: any) => {
        const start = process.hrtime.bigint();
        
        try {
          // Simulate template rendering (in real implementation, this would use a template engine)
          const rendered = this.renderTemplate(template, data);
          
          const end = process.hrtime.bigint();
          const duration = Number(end - start) / 1e6;
          
          // Track performance
          this.trackRenderPerformance(template, duration);
          
          return rendered;
        } catch (error) {
          throw new Error(`Template rendering failed: ${error}`);
        }
      };
    } else {
      return (data: any) => {
        const start = process.hrtime.bigint();
        
        try {
          const rendered = this.renderTemplate(template, data);
          
          const end = process.hrtime.bigint();
          const duration = Number(end - start) / 1e6;
          
          this.trackRenderPerformance(template, duration);
          
          return rendered;
        } catch (error) {
          throw new Error(`Template rendering failed: ${error}`);
        }
      };
    }
  }

  /**
   * Simple template renderer (placeholder implementation)
   */
  private static renderTemplate(template: string, data: any): string {
    let rendered = template;

    // Replace variables
    rendered = rendered.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : '';
    });

    // Handle conditionals
    rendered = rendered.replace(/\{\{\s*#if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g, (match, key, content) => {
      return data[key] ? content : '';
    });

    // Handle loops
    rendered = rendered.replace(/\{\{\s*#each\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g, (match, key, content) => {
      const array = data[key];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        return content.replace(/\{\{\s*this\s*\}\}/g, String(item));
      }).join('');
    });

    return rendered;
  }

  /**
   * Analyze template dependencies
   */
  private static analyzeDependencies(template: string): string[] {
    const dependencies: string[] = [];
    
    // Find variable references
    const variableMatches = template.match(/\{\{\s*(\w+)\s*\}\}/g);
    if (variableMatches) {
      variableMatches.forEach(match => {
        const variable = match.replace(/[{}]/g, '').trim();
        if (!dependencies.includes(variable)) {
          dependencies.push(variable);
        }
      });
    }

    // Find partial references
    const partialMatches = template.match(/\{\{\s*>\s*(\w+)\s*\}\}/g);
    if (partialMatches) {
      partialMatches.forEach(match => {
        const partial = match.replace(/[{}}>]/g, '').trim();
        if (!dependencies.includes(partial)) {
          dependencies.push(partial);
        }
      });
    }

    return dependencies;
  }

  /**
   * Generate unique template ID
   */
  private static generateTemplateId(path: string): string {
    return `template_${Buffer.from(path).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Track render performance
   */
  private static trackRenderPerformance(template: string, duration: number): void {
    // In a real implementation, this would update template stats
    if (typeof (global as any).__fox_template_tracker !== 'undefined') {
      (global as any).__fox_template_tracker.track(template, duration);
    }
  }
}

/**
 * Template optimizer for high-performance template rendering
 */
export class TemplateOptimizer {
  private static cache?: TemplateCache;
  private static options: TemplateOptimizationOptions;
  private static templates = new Map<string, CompiledTemplate>();

  /**
   * Initialize template optimizer
   */
  static initialize(options: TemplateOptimizationOptions): void {
    const defaultOptions: TemplateOptimizationOptions = {
      enableCaching: true,
      maxCacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      precompile: true,
      enablePartialCaching: true,
      minify: true,
      asyncRendering: false
    };

    this.options = { ...defaultOptions, ...options };

    if (this.options.enableCaching) {
      this.cache = new TemplateCache(
        this.options.maxCacheSize,
        this.options.cacheTTL
      );
    }
  }

  /**
   * Compile and cache template
   */
  static compileTemplate(path: string, source: string): CompiledTemplate {
    // Check cache first
    if (this.cache) {
      const cached = this.cache.getTemplate(path);
      if (cached) {
        return cached;
      }
    }

    // Compile template
    const compiled = TemplateCompiler.compile(source, path, this.options);
    
    // Cache compiled template
    if (this.cache) {
      this.cache.setTemplate(path, compiled);
    }

    this.templates.set(path, compiled);
    return compiled;
  }

  /**
   * Render template with optimization
   */
  static async renderTemplate(path: string, data: any): Promise<string> {
    const template = this.templates.get(path);
    
    if (!template) {
      throw new Error(`Template not found: ${path}`);
    }

    const start = process.hrtime.bigint();

    try {
      let result: string;
      
      if (template.metadata.isAsync) {
        result = await template.render(data);
      } else {
        result = template.render(data) as string;
      }

      // Update stats
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      
      template.stats.renderCount++;
      template.stats.totalRenderTime += duration;
      template.stats.averageRenderTime = template.stats.totalRenderTime / template.stats.renderCount;
      template.stats.lastRendered = Date.now();

      return result;
    } catch (error) {
      throw new Error(`Template rendering failed for ${path}: ${error}`);
    }
  }

  /**
   * Cache partial template content
   */
  static cachePartial(key: string, content: string, ttl?: number): void {
    if (this.cache && this.options.enablePartialCaching) {
      this.cache.setPartial(key, content, ttl);
    }
  }

  /**
   * Get cached partial content
   */
  static getPartial(key: string): string | null {
    if (this.cache && this.options.enablePartialCaching) {
      return this.cache.getPartial(key);
    }
    return null;
  }

  /**
   * Analyze template performance
   */
  static analyze(): OptimizationReport {
    const bottlenecks: Bottleneck[] = [];
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze cache performance
    if (this.cache) {
      const cacheStats = this.cache.getStats();
      
      if (cacheStats.hitRatio < 70) {
        bottlenecks.push({
          area: 'templates',
          severity: 'medium',
          description: 'Low template cache hit ratio',
          impact: 30,
          solutions: [
            'Increase cache TTL',
            'Optimize template reusability',
            'Implement template preloading',
            'Review cache size limits'
          ]
        });
      }

      if (cacheStats.totalSize > 100 * 1024 * 1024) { // 100MB
        opportunities.push({
          area: 'templates',
          potentialGain: 25,
          difficulty: 'medium',
          description: 'Large template cache consuming memory',
          steps: [
            'Implement cache size limits',
            'Add LRU eviction policy',
            'Optimize template size'
          ]
        });
      }
    } else {
      opportunities.push({
        area: 'templates',
        potentialGain: 40,
        difficulty: 'easy',
        description: 'Template caching not enabled',
        steps: [
          'Enable template caching',
          'Configure cache TTL',
          'Set appropriate cache size'
        ]
      });
    }

    // Analyze template performance
    let totalRenderTime = 0;
    let slowTemplates = 0;
    
    for (const template of this.templates.values()) {
      totalRenderTime += template.stats.averageRenderTime;
      
      if (template.stats.averageRenderTime > 100) { // >100ms
        slowTemplates++;
      }
    }

    if (slowTemplates > 0) {
      bottlenecks.push({
        area: 'templates',
        severity: slowTemplates > this.templates.size * 0.3 ? 'high' : 'medium',
        description: `${slowTemplates} templates with slow render times`,
        impact: 40,
        solutions: [
          'Optimize template complexity',
          'Enable template minification',
          'Use async rendering for heavy templates',
          'Implement partial caching'
        ]
      });
    }

    // Check minification
    if (!this.options.minify) {
      opportunities.push({
        area: 'templates',
        potentialGain: 20,
        difficulty: 'easy',
        description: 'Template minification not enabled',
        steps: [
          'Enable template minification',
          'Remove unnecessary whitespace',
          'Optimize template structure'
        ]
      });
    }

    return {
      score: Math.max(0, 100 - (bottlenecks.length * 25) - (opportunities.length * 10)),
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
          activeConnections: 0,
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
          cacheHitRatio: this.cache?.getStats().hitRatio || 0,
          templateRenderTime: totalRenderTime / Math.max(this.templates.size, 1),
          databaseQueryTime: 0,
          middlewareExecutionTime: 0,
          routeResolutionTime: 0,
          activeSessions: 0
        },
        custom: {
          templateStats: this.cache?.getStats(),
          templateCount: this.templates.size,
          averageRenderTime: totalRenderTime / Math.max(this.templates.size, 1)
        },
        timestamp: Date.now()
      },
      estimatedImprovements: {
        'template_render_time': this.cache ? 40 : 20,
        'memory_usage': this.options.minify ? 20 : 5,
        'cache_efficiency': this.options.enablePartialCaching ? 30 : 10
      }
    };
  }

  /**
   * Get template performance statistics
   */
  static getStats(): {
    cache?: any;
    templates: number;
    totalRenders: number;
    averageRenderTime: number;
    options: TemplateOptimizationOptions;
  } {
    let totalRenders = 0;
    let totalRenderTime = 0;

    for (const template of this.templates.values()) {
      totalRenders += template.stats.renderCount;
      totalRenderTime += template.stats.totalRenderTime;
    }

    return {
      cache: this.cache?.getStats(),
      templates: this.templates.size,
      totalRenders,
      averageRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      options: this.options
    };
  }

  /**
   * Clear all caches and compiled templates
   */
  static clear(): void {
    if (this.cache) {
      this.cache.clear();
    }
    this.templates.clear();
  }
}
