/**
 * @fileoverview Event system main exports
 * @module tsfox/core/features/events
 */

// Main event system
export * from './event.system';

// Core implementations
export * from './core';

// Specific interface exports (avoid conflicts)
export {
  EventInterface,
  EventMetadata,
  EventHandler,
  EventFilter,
  EventEmitterInterface,
  Subscription,
  SubscriptionOptions,
  RetryOptions,
  EventSystemInterface,
  EventStats
} from './interfaces/event.interface';

export {
  EventStoreInterface,
  TransactionalEventStoreInterface,
  EventStoreReaderInterface,
  EventStoreWriterInterface,
  EventStoreMigrationInterface,
  EventStoreFactoryInterface,
  EventStoreTransaction,
  StreamMetadata,
  StreamACL,
  EventStoreStats,
  Snapshot,
  Migration
} from './interfaces/store.interface';

export {
  EventBusInterface,
  EventBusStats as InterfaceEventBusStats,
  EventAdapterInterface,
  AdapterSubscriptionOptions,
  AdapterStats,
  RedisAdapterConfig as BusRedisAdapterConfig,
  RabbitMQAdapterConfig
} from './interfaces/adapter.interface';

export * from './interfaces/sourcing.interface';
export * from './interfaces/middleware.interface';

// Middleware
export * from './middleware/middleware.chain';
export { EventLoggingMiddleware } from './middleware/logging.middleware';
export type { LoggingMiddlewareOptions } from './middleware/logging.middleware';
export { EventMetricsMiddleware } from './middleware/metrics.middleware';
export type { MetricsMiddlewareOptions, EventMetricsSnapshot } from './middleware/metrics.middleware';

// CQRS
export { CommandBus, CommandBusError } from './cqrs/command-bus';
export { QueryBus, QueryBusError } from './cqrs/query-bus';

// Event Sourcing
export { AggregateRoot, InMemoryEventSourcingRepository } from './sourcing/aggregate-root';
export { ProjectionManager } from './sourcing/projection-manager';
export { SagaManager } from './sourcing/saga-manager';

// Adapters
export { SseAdapter } from './adapters/sse.adapter';
export type { SseAdapterOptions } from './adapters/sse.adapter';
export { RedisEventAdapter } from './adapters/redis.adapter';
export type { RedisAdapterConfig } from './adapters/redis.adapter';

// Re-export main classes for convenience
export {
  EventSystem,
  EventSystemFactory
} from './event.system';

export {
  EventEmitter,
  EventEmitterFactory,
  ExtendedEventEmitterInterface,
  MemoryEventStore,
  EventStoreFactory,
  MemoryEventBus,
  EventBusFactory
} from './core';

export {
  EventMiddlewareChainFactory
} from './middleware/middleware.chain';

