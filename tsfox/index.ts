import { FoxFactory } from './core/fox.factory';
import { ServerConfig, Route, Middleware, HttpError } from './core/types';
import { Router } from './core/router.factory';

// Logging System Exports
export {
    ILogger,
    LogLevel,
    LogEntry,
    LogContext,
    Logger,
    LoggerFactory,
    LoggerConfig,
    ConsoleTransport,
    FileTransport,
    FileTransportOptions,
    DefaultFormatter,
    JsonFormatter,
    RequestLoggingMiddleware,
    RequestLoggingOptions,
    generateId,
    generateCorrelationId,
    generateShortId
} from './core/logging';

// Cache System Exports
export {
    Cache,
    CacheFactory,
    MemoryCacheProvider,
    responseCache,
    apiCache,
    templateCache,
    invalidateCache,
    cacheMetrics,
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
} from './core/cache';

// Error Handling System Exports
export {
    BaseError,
    safeAsync,
    batchAsync
} from './core/errors';

const startServer = (config: ServerConfig): void => {
    const app = FoxFactory.createInstance(config)
    app.start();
};

export { startServer, Router, HttpError, Middleware, Route, ServerConfig };
