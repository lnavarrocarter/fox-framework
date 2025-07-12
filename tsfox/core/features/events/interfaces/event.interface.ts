/**
 * @fileoverview Event system interfaces
 * @module tsfox/core/features/events/interfaces
 */

/**
 * Core event interface representing a domain event
 */
export interface EventInterface {
  /** Unique event identifier */
  readonly id: string;
  
  /** Event type/name */
  readonly type: string;
  
  /** Aggregate root identifier this event belongs to */
  readonly aggregateId?: string;
  
  /** Event version for optimistic concurrency */
  readonly version?: number;
  
  /** Event payload data */
  readonly data: any;
  
  /** Event metadata */
  readonly metadata: EventMetadata;
  
  /** Event timestamp */
  readonly timestamp: Date;
}

/**
 * Event metadata containing correlation and causation information
 */
export interface EventMetadata {
  /** Correlation ID for request tracing */
  correlationId?: string;
  
  /** Causation ID linking to the event that caused this event */
  causationId?: string;
  
  /** User ID who triggered the event */
  userId?: string;
  
  /** Source service/component that generated the event */
  source: string;
  
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: EventInterface) => Promise<void> | void;

/**
 * Event filter function type
 */
export type EventFilter = (event: EventInterface) => boolean;

/**
 * Basic event emitter interface
 */
export interface EventEmitterInterface {
  /** Emit an event to all local handlers */
  emit(event: EventInterface): Promise<void>;
  
  /** Register an event handler */
  on(eventType: string, handler: EventHandler): void;
  
  /** Remove an event handler */
  off(eventType: string, handler: EventHandler): void;
  
  /** Register a one-time event handler */
  once(eventType: string, handler: EventHandler): void;
  
  /** Get all handlers for an event type */
  listeners(eventType: string): EventHandler[];
  
  /** Remove all handlers for an event type */
  removeAllListeners(eventType?: string): void;
}

/**
 * Event subscription interface
 */
export interface Subscription {
  /** Unique subscription identifier */
  readonly id: string;
  
  /** Event type being subscribed to */
  readonly eventType: string;
  
  /** Event handler function */
  readonly handler: EventHandler;
  
  /** Filter function for events */
  readonly filter?: EventFilter;
  
  /** Subscription options */
  readonly options: SubscriptionOptions;
  
  /** Unsubscribe from events */
  unsubscribe(): Promise<void>;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Start consuming from a specific position */
  fromPosition?: number;
  
  /** Maximum number of events to process concurrently */
  maxConcurrency?: number;
  
  /** Enable dead letter queue for failed events */
  deadLetterQueue?: boolean;
  
  /** Retry configuration */
  retry?: RetryOptions;
  
  /** Acknowledgment mode */
  ackMode?: 'auto' | 'manual';
}

/**
 * Retry configuration
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Backoff strategy */
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  
  /** Initial delay in milliseconds */
  initialDelay: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** Multiplier for exponential backoff */
  multiplier?: number;
}

/**
 * Event system configuration
 */
export interface EventConfig {
  /** Event store configuration */
  store: EventStoreConfig;
  
  /** Event bus configuration */
  bus: EventBusConfig;
  
  /** Stream processing configuration */
  stream: StreamConfig;
  
  /** Global retry configuration */
  retry: RetryOptions;
  
  /** Performance settings */
  performance: PerformanceConfig;
  
  /** Security settings */
  security: SecurityConfig;
}

/**
 * Event store configuration
 */
export interface EventStoreConfig {
  /** Store type */
  type: 'memory' | 'file' | 'database' | 'external';
  
  /** Connection configuration */
  connection?: any;
  
  /** Event retention period in days */
  retentionDays?: number;
  
  /** Enable snapshots */
  snapshots?: {
    enabled: boolean;
    frequency: number; // events
    maxSnapshots: number;
  };
  
  /** Encryption settings */
  encryption?: {
    enabled: boolean;
    algorithm?: string;
    keyPath?: string;
  };
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  /** Bus adapter type */
  adapter: 'memory' | 'redis' | 'rabbitmq' | 'kafka' | 'nats';
  
  /** Connection configuration */
  connection?: any;
  
  /** Number of partitions for scaling */
  partitions?: number;
  
  /** Consumer group configuration */
  consumerGroup?: {
    id: string;
    maxConcurrency: number;
  };
  
  /** Serialization format */
  serialization?: 'json' | 'avro' | 'protobuf';
}

/**
 * Stream processing configuration
 */
export interface StreamConfig {
  /** Batch size for processing events */
  batchSize: number;
  
  /** Maximum concurrent stream processors */
  maxConcurrency: number;
  
  /** Buffer time for batching events */
  bufferTime: number;
  
  /** Enable event ordering */
  ordered?: boolean;
  
  /** Windowing configuration */
  windowing?: {
    type: 'tumbling' | 'sliding' | 'session';
    size: number; // milliseconds
    overlap?: number; // for sliding windows
  };
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Enable performance metrics */
  enableMetrics: boolean;
  
  /** Maximum events per second before throttling */
  maxEventsPerSecond?: number;
  
  /** Memory limit for buffering events */
  maxMemoryUsage?: number; // bytes
  
  /** Enable event compression */
  compression?: {
    enabled: boolean;
    algorithm: 'gzip' | 'lz4' | 'snappy';
    level?: number;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Enable event validation */
  validation: boolean;
  
  /** Allowed event sources */
  allowedSources?: string[];
  
  /** Enable event signing */
  signing?: {
    enabled: boolean;
    algorithm: 'hmac' | 'rsa' | 'ecdsa';
    keyPath: string;
  };
  
  /** Rate limiting configuration */
  rateLimit?: {
    enabled: boolean;
    maxEventsPerSecond: number;
    windowSize: number; // seconds
  };
}

/**
 * Event processing statistics
 */
export interface EventStats {
  /** Total events processed */
  totalEvents: number;
  
  /** Events processed per second */
  eventsPerSecond: number;
  
  /** Average processing latency */
  averageLatency: number;
  
  /** Number of failed events */
  failedEvents: number;
  
  /** Number of retried events */
  retriedEvents: number;
  
  /** Memory usage in bytes */
  memoryUsage: number;
  
  /** Active subscriptions count */
  activeSubscriptions: number;
  
  /** Last processing timestamp */
  lastProcessed: Date;
}

/**
 * Main event system interface
 */
export interface EventSystemInterface {
  /** Get the event emitter */
  getEmitter(): EventEmitterInterface;
  
  /** Get the event store */
  getStore(): EventStoreInterface;
  
  /** Get the event bus */
  getBus(): EventBusInterface;
  
  /** Emit an event through the complete pipeline */
  emit(event: EventInterface): Promise<void>;
  
  /** Register a local event handler */
  on(eventType: string, handler: EventHandler): void;
  
  /** Subscribe to events from the bus */
  subscribe(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Promise<Subscription>;
  
  /** Replay events from a stream */
  replay(streamId: string, fromVersion?: number): Promise<void>;
  
  /** Register an event projection */
  registerProjection(projection: EventProjection): void;
  
  /** Get event processing statistics */
  getStats(): EventStats;
  
  /** Shutdown the event system */
  shutdown(): Promise<void>;
}
