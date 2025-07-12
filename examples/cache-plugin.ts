/**
 * @fileoverview Cache Plugin Example
 * @module examples/cache-plugin
 */

import { 
  IPlugin, 
  PluginManifest, 
  PluginContext,
  PluginConfigurationSchema 
} from '../tsfox/core/plugins';

/**
 * Configuración del plugin de cache
 */
interface CachePluginConfig {
  /** Proveedor de cache a usar */
  provider: 'memory' | 'redis' | 'file';
  
  /** TTL por defecto en segundos */
  defaultTtl: number;
  
  /** Tamaño máximo del cache en MB */
  maxSize?: number;
  
  /** Configuración específica del proveedor */
  providerConfig?: {
    // Para Redis
    redis?: {
      host: string;
      port: number;
      password?: string;
      database?: number;
    };
    
    // Para File
    file?: {
      directory: string;
      compression?: boolean;
    };
  };
}

/**
 * Plugin de cache para Fox Framework
 * 
 * Proporciona funcionalidad de cache con múltiples proveedores
 * y integración completa con el sistema de hooks y eventos.
 */
export class CachePlugin implements IPlugin {
  name = 'fox-cache';
  version = '1.0.0';
  description = 'Advanced caching system with multiple providers';
  
  private context?: PluginContext;
  private config?: CachePluginConfig;
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  /**
   * Configura el plugin con la configuración proporcionada
   */
  async configure(config: CachePluginConfig) {
    this.config = {
      provider: 'memory',
      defaultTtl: 3600,
      maxSize: 100,
      ...config
    };

    // Validar configuración
    if (this.config.provider === 'redis' && !this.config.providerConfig?.redis) {
      throw new Error('Redis configuration is required when using redis provider');
    }

    this.context?.logger.info('Cache plugin configured', {
      provider: this.config.provider,
      defaultTtl: this.config.defaultTtl
    });
  }

  /**
   * Inicializa el plugin y registra hooks y servicios
   */
  async initialize(context: PluginContext) {
    this.context = context;
    
    context.logger.info('Initializing Cache Plugin');

    // Registrar servicio de cache
    context.services.singleton('cache', () => this.createCacheService());

    // Registrar hooks para cache automático
    this.registerHooks(context);

    // Registrar eventos
    this.registerEvents(context);

    // Configurar limpieza automática
    this.setupCleanup();

    context.logger.info('Cache Plugin initialized successfully');
  }

  /**
   * Limpia recursos al destruir el plugin
   */
  async destroy() {
    this.cache.clear();
    this.context?.logger.info('Cache Plugin destroyed', this.getStats());
  }

  /**
   * Registra hooks para funcionalidad de cache
   */
  private registerHooks(context: PluginContext) {
    // Hook para cache de respuestas HTTP
    context.hooks.register('http:response', async (response, request) => {
      if (request.method === 'GET' && response.cacheable) {
        const cacheKey = this.generateCacheKey(request.url, request.headers);
        await this.set(cacheKey, response.data, response.cacheTime || this.config!.defaultTtl);
        
        context.logger.debug('Response cached', { key: cacheKey });
      }
      return response;
    }, { priority: 10 });

    // Hook para verificar cache antes de procesar request
    context.hooks.register('http:request', async (request) => {
      if (request.method === 'GET') {
        const cacheKey = this.generateCacheKey(request.url, request.headers);
        const cached = await this.get(cacheKey);
        
        if (cached) {
          context.logger.debug('Cache hit', { key: cacheKey });
          request.cachedResponse = cached;
        }
      }
      return request;
    }, { priority: 90 });

    // Hook para invalidar cache
    context.hooks.register('cache:invalidate', async (pattern: string) => {
      const deleted = await this.deletePattern(pattern);
      context.logger.info('Cache invalidated', { pattern, deletedCount: deleted });
      return { pattern, deletedCount: deleted };
    });
  }

  /**
   * Registra eventos del sistema de cache
   */
  private registerEvents(context: PluginContext) {
    // Emitir evento cuando se alcanza el límite de memoria
    context.events.on('system:memory-warning', () => {
      this.clearExpired();
      context.events.emit('cache:cleanup', { 
        reason: 'memory-warning',
        itemsRemoved: this.cache.size 
      });
    });

    // Emitir estadísticas periódicamente
    setInterval(() => {
      context.events.emit('cache:stats', this.getStats());
    }, 60000); // Cada minuto
  }

  /**
   * Configura limpieza automática de cache expirado
   */
  private setupCleanup() {
    setInterval(() => {
      this.clearExpired();
    }, 300000); // Cada 5 minutos
  }

  /**
   * Crea el servicio de cache que se expondrá a otros plugins
   */
  private createCacheService() {
    return {
      // Métodos principales
      get: (key: string) => this.get(key),
      set: (key: string, value: any, ttl?: number) => this.set(key, value, ttl),
      delete: (key: string) => this.delete(key),
      clear: () => this.clear(),
      
      // Métodos avanzados
      has: (key: string) => this.has(key),
      keys: () => this.keys(),
      mget: (keys: string[]) => this.mget(keys),
      mset: (entries: Array<[string, any, number?]>) => this.mset(entries),
      
      // Operaciones por patrón
      deletePattern: (pattern: string) => this.deletePattern(pattern),
      getPattern: (pattern: string) => this.getPattern(pattern),
      
      // Estadísticas y utilidades
      getStats: () => this.getStats(),
      getSize: () => this.cache.size,
      getTtl: (key: string) => this.getTtl(key),
      
      // Cache con función
      remember: (key: string, factory: () => Promise<any>, ttl?: number) => 
        this.remember(key, factory, ttl),
      
      // Cache de tags
      tag: (tags: string[]) => this.createTaggedCache(tags),
    };
  }

  /**
   * Obtiene un valor del cache
   */
  private async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Almacena un valor en el cache
   */
  private async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.config!.defaultTtl) * 1000;
    
    this.cache.set(key, { value, expires });
    this.stats.sets++;

    this.context?.events.emit('cache:set', { key, ttl: ttl || this.config!.defaultTtl });
  }

  /**
   * Elimina un valor del cache
   */
  private async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.context?.events.emit('cache:delete', { key });
    }
    return deleted;
  }

  /**
   * Limpia todo el cache
   */
  private async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.context?.events.emit('cache:clear', { itemsRemoved: size });
  }

  /**
   * Verifica si existe una clave en el cache
   */
  private has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? item.expires > Date.now() : false;
  }

  /**
   * Obtiene todas las claves válidas
   */
  private keys(): string[] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([, item]) => item.expires > now)
      .map(([key]) => key);
  }

  /**
   * Obtiene múltiples valores
   */
  private async mget(keys: string[]): Promise<Array<{ key: string; value: any }>> {
    const results = [];
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.push({ key, value });
      }
    }
    return results;
  }

  /**
   * Establece múltiples valores
   */
  private async mset(entries: Array<[string, any, number?]>): Promise<void> {
    for (const [key, value, ttl] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Elimina claves que coinciden con un patrón
   */
  private async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = this.keys().filter(key => regex.test(key));
    
    for (const key of keysToDelete) {
      await this.delete(key);
    }
    
    return keysToDelete.length;
  }

  /**
   * Obtiene valores que coinciden con un patrón
   */
  private async getPattern(pattern: string): Promise<Array<{ key: string; value: any }>> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys = this.keys().filter(key => regex.test(key));
    
    return this.mget(matchingKeys);
  }

  /**
   * Obtiene el TTL restante de una clave
   */
  private getTtl(key: string): number {
    const item = this.cache.get(key);
    if (!item) return -1;
    
    const remaining = Math.max(0, item.expires - Date.now());
    return Math.floor(remaining / 1000);
  }

  /**
   * Cache con función factory
   */
  private async remember(
    key: string, 
    factory: () => Promise<any>, 
    ttl?: number
  ): Promise<any> {
    let value = await this.get(key);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Crea un cache con tags para invalidación por grupos
   */
  private createTaggedCache(tags: string[]) {
    const tagPrefix = `tags:${tags.join(':')}:`;
    
    return {
      get: (key: string) => this.get(tagPrefix + key),
      set: (key: string, value: any, ttl?: number) => this.set(tagPrefix + key, value, ttl),
      delete: (key: string) => this.delete(tagPrefix + key),
      flush: () => this.deletePattern(`${tagPrefix}*`)
    };
  }

  /**
   * Limpia entradas expiradas
   */
  private clearExpired(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.context?.events.emit('cache:expired-cleanup', { itemsRemoved: removed });
    }
    
    return removed;
  }

  /**
   * Genera clave de cache a partir de URL y headers
   */
  private generateCacheKey(url: string, headers: Record<string, string>): string {
    const relevantHeaders = ['accept', 'accept-language', 'authorization'];
    const headerParts = relevantHeaders
      .filter(name => headers[name])
      .map(name => `${name}:${headers[name]}`)
      .join('|');
    
    return `http:${url}${headerParts ? '|' + headerParts : ''}`;
  }

  /**
   * Obtiene estadísticas del cache
   */
  private getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Estima el uso de memoria del cache
   */
  private getMemoryUsage(): number {
    // Estimación aproximada en bytes
    let size = 0;
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(item.value).length * 2;
      size += 16; // overhead del objeto
    }
    return size;
  }
}

/**
 * Schema de configuración del plugin
 */
export const cacheConfigSchema: PluginConfigurationSchema = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      enum: ['memory', 'redis', 'file'],
      default: 'memory',
      description: 'Cache provider to use'
    },
    defaultTtl: {
      type: 'number',
      minimum: 1,
      default: 3600,
      description: 'Default TTL in seconds'
    },
    maxSize: {
      type: 'number',
      minimum: 1,
      description: 'Maximum cache size in MB'
    },
    providerConfig: {
      type: 'object',
      properties: {
        redis: {
          type: 'object',
          properties: {
            host: { type: 'string' },
            port: { type: 'number', minimum: 1, maximum: 65535 },
            password: { type: 'string' },
            database: { type: 'number', minimum: 0 }
          },
          required: ['host', 'port']
        },
        file: {
          type: 'object',
          properties: {
            directory: { type: 'string' },
            compression: { type: 'boolean', default: false }
          },
          required: ['directory']
        }
      }
    }
  },
  required: ['provider']
};

/**
 * Manifiesto del plugin
 */
export const cachePluginManifest: PluginManifest = {
  name: 'fox-cache',
  version: '1.0.0',
  description: 'Advanced caching system with multiple providers',
  author: 'Fox Framework Team',
  license: 'MIT',
  main: 'cache-plugin.js',
  
  dependencies: {
    '@fox/core': '^1.0.0'
  },
  
  configuration: cacheConfigSchema,
  
  permissions: [
    'filesystem:read',
    'filesystem:write',
    'network:http'
  ],
  
  metadata: {
    category: 'performance',
    tags: ['cache', 'performance', 'memory', 'redis'],
    homepage: 'https://fox-framework.dev/plugins/cache',
    repository: 'https://github.com/fox-framework/plugins/cache'
  },
  
  engines: {
    fox: '^1.0.0',
    node: '>=14.0.0'
  }
};

// Exportar plugin y configuración por defecto
export const defaultCacheConfig: CachePluginConfig = {
  provider: 'memory',
  defaultTtl: 3600,
  maxSize: 100
};

/**
 * Ejemplo de uso del plugin
 */
export const exampleUsage = `
// Registrar el plugin
import { CachePlugin, cachePluginManifest, defaultCacheConfig } from './cache-plugin';

const cachePlugin = new CachePlugin();
await cachePlugin.configure(defaultCacheConfig);

await pluginFactory.register(cachePlugin, cachePluginManifest);

// Usar el servicio de cache
const cache = pluginFactory.getServices().get('cache');

// Cache básico
await cache.set('user:123', { name: 'John', email: 'john@example.com' }, 1800);
const user = await cache.get('user:123');

// Cache con función factory
const expensiveData = await cache.remember('expensive:calculation', async () => {
  return await performExpensiveCalculation();
}, 3600);

// Cache con tags
const userCache = cache.tag(['user', 'profile']);
await userCache.set('123', userData);
await userCache.flush(); // Limpia todos los datos de usuario

// Obtener estadísticas
const stats = cache.getStats();
console.log(\`Hit rate: \${stats.hitRate}%, Size: \${stats.size} items\`);
`;
