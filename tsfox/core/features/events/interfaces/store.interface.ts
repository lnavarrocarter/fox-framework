/**
 * @fileoverview Event store interfaces
 * @module tsfox/core/features/events/interfaces
 */

import { EventInterface, EventHandler, Subscription } from './event.interface';

/**
 * Event store interface for persisting events
 */
export interface EventStoreInterface {
  /** Append events to a stream */
  append(streamId: string, events: EventInterface[], expectedVersion?: number): Promise<void>;
  
  /** Read events from a stream */
  read(streamId: string, fromVersion?: number, maxCount?: number): Promise<EventInterface[]>;
  
  /** Read all events from all streams */
  readAll(fromPosition?: number, maxCount?: number): Promise<EventInterface[]>;
  
  /** Subscribe to new events */
  subscribe(handler: EventHandler, fromPosition?: number): Promise<Subscription>;
  
  /** Get stream metadata */
  getStreamMetadata(streamId: string): Promise<StreamMetadata>;
  
  /** Set stream metadata */
  setStreamMetadata(streamId: string, metadata: StreamMetadata): Promise<void>;
  
  /** Delete a stream */
  deleteStream(streamId: string, hardDelete?: boolean): Promise<void>;
  
  /** Get event store statistics */
  getStats(): Promise<EventStoreStats>;
  
  /** Create a snapshot */
  createSnapshot(streamId: string, version: number, data: any): Promise<void>;
  
  /** Get the latest snapshot */
  getSnapshot(streamId: string): Promise<Snapshot | null>;
  
  /** Clean up old events based on retention policy */
  cleanup(): Promise<void>;
}

/**
 * Stream metadata
 */
export interface StreamMetadata {
  /** Stream identifier */
  streamId: string;
  
  /** Current version/event count */
  version: number;
  
  /** Stream creation timestamp */
  created: Date;
  
  /** Last update timestamp */
  lastUpdated: Date;
  
  /** Stream status */
  status: 'active' | 'deleted' | 'archived';
  
  /** Custom metadata */
  metadata?: Record<string, any>;
  
  /** Access control list */
  acl?: StreamACL;
}

/**
 * Stream access control list
 */
export interface StreamACL {
  /** Users/roles allowed to read */
  read?: string[];
  
  /** Users/roles allowed to write */
  write?: string[];
  
  /** Users/roles allowed to delete */
  delete?: string[];
}

/**
 * Event store statistics
 */
export interface EventStoreStats {
  /** Total number of streams */
  totalStreams: number;
  
  /** Total number of events */
  totalEvents: number;
  
  /** Storage size in bytes */
  storageSize: number;
  
  /** Number of active subscriptions */
  activeSubscriptions: number;
  
  /** Average events per stream */
  averageEventsPerStream: number;
  
  /** Read operations per second */
  readsPerSecond: number;
  
  /** Write operations per second */
  writesPerSecond: number;
  
  /** Last cleanup timestamp */
  lastCleanup?: Date;
}

/**
 * Snapshot interface
 */
export interface Snapshot {
  /** Stream identifier */
  streamId: string;
  
  /** Event version this snapshot represents */
  version: number;
  
  /** Snapshot data */
  data: any;
  
  /** Snapshot creation timestamp */
  timestamp: Date;
  
  /** Snapshot metadata */
  metadata?: Record<string, any>;
}

/**
 * Event store transaction interface
 */
export interface EventStoreTransaction {
  /** Transaction identifier */
  readonly id: string;
  
  /** Append events within transaction */
  append(streamId: string, events: EventInterface[], expectedVersion?: number): void;
  
  /** Commit the transaction */
  commit(): Promise<void>;
  
  /** Rollback the transaction */
  rollback(): Promise<void>;
  
  /** Transaction status */
  readonly status: 'pending' | 'committed' | 'rolled-back';
}

/**
 * Event store interface with transaction support
 */
export interface TransactionalEventStoreInterface extends EventStoreInterface {
  /** Begin a new transaction */
  beginTransaction(): Promise<EventStoreTransaction>;
  
  /** Execute operations within a transaction */
  withTransaction<T>(operation: (tx: EventStoreTransaction) => Promise<T>): Promise<T>;
}

/**
 * Event store reader interface for read-only operations
 */
export interface EventStoreReaderInterface {
  /** Read events from a stream */
  read(streamId: string, fromVersion?: number, maxCount?: number): Promise<EventInterface[]>;
  
  /** Read all events */
  readAll(fromPosition?: number, maxCount?: number): Promise<EventInterface[]>;
  
  /** Get stream metadata */
  getStreamMetadata(streamId: string): Promise<StreamMetadata>;
  
  /** Subscribe to events */
  subscribe(handler: EventHandler, fromPosition?: number): Promise<Subscription>;
  
  /** Get snapshot */
  getSnapshot(streamId: string): Promise<Snapshot | null>;
}

/**
 * Event store writer interface for write operations
 */
export interface EventStoreWriterInterface {
  /** Append events to a stream */
  append(streamId: string, events: EventInterface[], expectedVersion?: number): Promise<void>;
  
  /** Set stream metadata */
  setStreamMetadata(streamId: string, metadata: StreamMetadata): Promise<void>;
  
  /** Delete a stream */
  deleteStream(streamId: string, hardDelete?: boolean): Promise<void>;
  
  /** Create a snapshot */
  createSnapshot(streamId: string, version: number, data: any): Promise<void>;
}

/**
 * Event store migration interface
 */
export interface EventStoreMigrationInterface {
  /** Get current schema version */
  getCurrentVersion(): Promise<number>;
  
  /** Apply migrations up to target version */
  migrate(targetVersion?: number): Promise<void>;
  
  /** Rollback to previous version */
  rollback(targetVersion: number): Promise<void>;
  
  /** Get available migrations */
  getAvailableMigrations(): Promise<Migration[]>;
}

/**
 * Migration definition
 */
export interface Migration {
  /** Migration version */
  version: number;
  
  /** Migration name */
  name: string;
  
  /** Migration description */
  description: string;
  
  /** Apply the migration */
  up(): Promise<void>;
  
  /** Rollback the migration */
  down(): Promise<void>;
}

/**
 * Event store factory interface
 */
export interface EventStoreFactoryInterface {
  /** Create an event store instance */
  create(config: EventStoreConfig): Promise<EventStoreInterface>;
  
  /** Create a read-only event store instance */
  createReader(config: EventStoreConfig): Promise<EventStoreReaderInterface>;
  
  /** Create a write-only event store instance */
  createWriter(config: EventStoreConfig): Promise<EventStoreWriterInterface>;
  
  /** Get supported store types */
  getSupportedTypes(): string[];
}

/**
 * Event store configuration
 */
export interface EventStoreConfig {
  /** Store type */
  type: 'memory' | 'file' | 'database' | 'external';
  
  /** Connection string or configuration */
  connection?: string | Record<string, any>;
  
  /** Database/collection name */
  database?: string;
  
  /** Event retention configuration */
  retention?: {
    /** Retention period in days */
    days: number;
    
    /** Maximum events per stream */
    maxEvents?: number;
    
    /** Enable automatic cleanup */
    autoCleanup: boolean;
  };
  
  /** Snapshot configuration */
  snapshots?: {
    /** Enable snapshots */
    enabled: boolean;
    
    /** Snapshot frequency (events) */
    frequency: number;
    
    /** Maximum snapshots to keep */
    maxSnapshots: number;
  };
  
  /** Encryption configuration */
  encryption?: {
    /** Enable encryption */
    enabled: boolean;
    
    /** Encryption algorithm */
    algorithm: 'aes-256-gcm' | 'aes-128-gcm';
    
    /** Key derivation function */
    kdf: 'pbkdf2' | 'scrypt';
    
    /** Key file path */
    keyPath: string;
  };
  
  /** Performance settings */
  performance?: {
    /** Batch size for operations */
    batchSize: number;
    
    /** Connection pool size */
    poolSize: number;
    
    /** Query timeout in milliseconds */
    timeout: number;
    
    /** Enable caching */
    cache: {
      enabled: boolean;
      maxSize: number; // bytes
      ttl: number; // seconds
    };
  };
  
  /** Security settings */
  security?: {
    /** Enable SSL/TLS */
    ssl: boolean;
    
    /** SSL certificate path */
    sslCertPath?: string;
    
    /** SSL key path */
    sslKeyPath?: string;
    
    /** Authentication configuration */
    auth?: {
      username: string;
      password: string;
      database?: string;
    };
  };
}
