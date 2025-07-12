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
  RedisAdapterConfig,
  RabbitMQAdapterConfig
} from './interfaces/adapter.interface';

export * from './interfaces/sourcing.interface';
export * from './interfaces/middleware.interface';

// Middleware
export * from './middleware/middleware.chain';

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
