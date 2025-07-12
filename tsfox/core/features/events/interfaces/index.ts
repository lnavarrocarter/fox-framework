/**
 * @fileoverview Event system interfaces index
 * @module tsfox/core/features/events/interfaces
 */

// Core event interfaces
export * from './event.interface';

// Event store interfaces (exclude conflicting EventStoreConfig)
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
} from './store.interface';

// Event adapter interfaces
export * from './adapter.interface';

// Event sourcing interfaces
export * from './sourcing.interface';

// Event middleware interfaces
export * from './middleware.interface';
