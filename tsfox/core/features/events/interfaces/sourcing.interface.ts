/**
 * @fileoverview Event sourcing interfaces
 * @module tsfox/core/features/events/interfaces
 */

import { EventInterface } from './event.interface';

/**
 * Event sourcing aggregate root interface
 */
export interface AggregateRootInterface {
  /** Aggregate identifier */
  readonly id: string;
  
  /** Current version */
  readonly version: number;
  
  /** Apply an event to the aggregate */
  apply(event: EventInterface): void;
  
  /** Get uncommitted events */
  getUncommittedEvents(): EventInterface[];
  
  /** Mark events as committed */
  markEventsAsCommitted(): void;
  
  /** Load aggregate from history */
  loadFromHistory(events: EventInterface[]): void;
  
  /** Get aggregate snapshot */
  getSnapshot(): any;
  
  /** Load aggregate from snapshot */
  loadFromSnapshot(snapshot: any, version: number): void;
}

/**
 * Event projection interface
 */
export interface EventProjection {
  /** Projection name */
  readonly name: string;
  
  /** Projection version */
  readonly version: number;
  
  /** Event types this projection handles */
  readonly eventTypes: string[];
  
  /** Initialize the projection state */
  initialize(): any;
  
  /** Project an event onto the current state */
  project(event: EventInterface, state: any): any;
  
  /** Reset the projection */
  reset(): Promise<void>;
  
  /** Get projection metadata */
  getMetadata(): ProjectionMetadata;
}

/**
 * Projection metadata
 */
export interface ProjectionMetadata {
  /** Projection name */
  name: string;
  
  /** Current version */
  version: number;
  
  /** Last processed event position */
  position: number;
  
  /** Last update timestamp */
  lastUpdated: Date;
  
  /** Projection status */
  status: 'running' | 'stopped' | 'error' | 'rebuilding';
  
  /** Error information */
  error?: {
    message: string;
    timestamp: Date;
    event?: EventInterface;
  };
  
  /** Processing statistics */
  stats: {
    eventsProcessed: number;
    eventsPerSecond: number;
    averageProcessingTime: number;
    lastEventTimestamp?: Date;
  };
}

/**
 * Projection manager interface
 */
export interface ProjectionManagerInterface {
  /** Register a projection */
  register(projection: EventProjection): Promise<void>;
  
  /** Unregister a projection */
  unregister(projectionName: string): Promise<void>;
  
  /** Start a projection */
  start(projectionName: string): Promise<void>;
  
  /** Stop a projection */
  stop(projectionName: string): Promise<void>;
  
  /** Restart a projection */
  restart(projectionName: string): Promise<void>;
  
  /** Rebuild a projection from the beginning */
  rebuild(projectionName: string): Promise<void>;
  
  /** Get projection status */
  getStatus(projectionName: string): Promise<ProjectionMetadata>;
  
  /** Get all projections */
  getAll(): Promise<ProjectionMetadata[]>;
  
  /** Reset a projection */
  reset(projectionName: string): Promise<void>;
}

/**
 * Read model interface for projections
 */
export interface ReadModelInterface<T = any> {
  /** Find by ID */
  findById(id: string): Promise<T | null>;
  
  /** Find by criteria */
  find(criteria: any): Promise<T[]>;
  
  /** Save/update a read model */
  save(model: T): Promise<void>;
  
  /** Delete a read model */
  delete(id: string): Promise<void>;
  
  /** Count models */
  count(criteria?: any): Promise<number>;
  
  /** Clear all data */
  clear(): Promise<void>;
}

/**
 * Saga interface for long-running processes
 */
export interface SagaInterface {
  /** Saga identifier */
  readonly id: string;
  
  /** Saga type */
  readonly type: string;
  
  /** Current saga state */
  readonly state: any;
  
  /** Saga status */
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
  
  /** Handle an event */
  handle(event: EventInterface): Promise<SagaCommand[]>;
  
  /** Mark saga as completed */
  complete(): void;
  
  /** Mark saga as failed */
  fail(error: Error): void;
  
  /** Start compensation */
  compensate(): Promise<SagaCommand[]>;
}

/**
 * Saga command interface
 */
export interface SagaCommand {
  /** Command type */
  type: string;
  
  /** Target aggregate ID */
  aggregateId: string;
  
  /** Command data */
  data: any;
  
  /** Command metadata */
  metadata?: Record<string, any>;
}

/**
 * Saga manager interface
 */
export interface SagaManagerInterface {
  /** Start a new saga */
  start(sagaType: string, event: EventInterface): Promise<string>;
  
  /** Handle an event for all relevant sagas */
  handle(event: EventInterface): Promise<void>;
  
  /** Get saga by ID */
  getSaga(sagaId: string): Promise<SagaInterface | null>;
  
  /** Complete a saga */
  complete(sagaId: string): Promise<void>;
  
  /** Fail a saga */
  fail(sagaId: string, error: Error): Promise<void>;
  
  /** Get saga statistics */
  getStats(): Promise<SagaStats>;
}

/**
 * Saga statistics
 */
export interface SagaStats {
  /** Total sagas created */
  totalSagas: number;
  
  /** Active sagas */
  activeSagas: number;
  
  /** Completed sagas */
  completedSagas: number;
  
  /** Failed sagas */
  failedSagas: number;
  
  /** Average completion time */
  averageCompletionTime: number;
  
  /** Sagas by status */
  sagasByStatus: Record<string, number>;
}

/**
 * Command handler interface
 */
export interface CommandHandlerInterface<T = any> {
  /** Handle a command */
  handle(command: T): Promise<EventInterface[]>;
  
  /** Get supported command types */
  getSupportedCommands(): string[];
}

/**
 * Command bus interface
 */
export interface CommandBusInterface {
  /** Send a command */
  send(command: any): Promise<void>;
  
  /** Register a command handler */
  register(commandType: string, handler: CommandHandlerInterface): void;
  
  /** Unregister a command handler */
  unregister(commandType: string): void;
  
  /** Get registered handlers */
  getHandlers(): Map<string, CommandHandlerInterface>;
}

/**
 * Query handler interface
 */
export interface QueryHandlerInterface<TQuery = any, TResult = any> {
  /** Handle a query */
  handle(query: TQuery): Promise<TResult>;
  
  /** Get supported query types */
  getSupportedQueries(): string[];
}

/**
 * Query bus interface
 */
export interface QueryBusInterface {
  /** Execute a query */
  execute<T>(query: any): Promise<T>;
  
  /** Register a query handler */
  register(queryType: string, handler: QueryHandlerInterface): void;
  
  /** Unregister a query handler */
  unregister(queryType: string): void;
  
  /** Get registered handlers */
  getHandlers(): Map<string, QueryHandlerInterface>;
}

/**
 * Event sourcing repository interface
 */
export interface EventSourcingRepositoryInterface<T extends AggregateRootInterface> {
  /** Get aggregate by ID */
  getById(id: string): Promise<T | null>;
  
  /** Save aggregate */
  save(aggregate: T): Promise<void>;
  
  /** Delete aggregate */
  delete(id: string): Promise<void>;
  
  /** Check if aggregate exists */
  exists(id: string): Promise<boolean>;
  
  /** Get aggregate version */
  getVersion(id: string): Promise<number>;
}

/**
 * Snapshot store interface
 */
export interface SnapshotStoreInterface {
  /** Save a snapshot */
  save(aggregateId: string, snapshot: any, version: number): Promise<void>;
  
  /** Get the latest snapshot */
  get(aggregateId: string): Promise<AggregateSnapshot | null>;
  
  /** Delete snapshots for an aggregate */
  delete(aggregateId: string): Promise<void>;
  
  /** Get snapshot statistics */
  getStats(): Promise<SnapshotStats>;
  
  /** Clean up old snapshots */
  cleanup(): Promise<void>;
}

/**
 * Aggregate snapshot
 */
export interface AggregateSnapshot {
  /** Aggregate ID */
  aggregateId: string;
  
  /** Snapshot version */
  version: number;
  
  /** Snapshot data */
  data: any;
  
  /** Creation timestamp */
  timestamp: Date;
  
  /** Snapshot metadata */
  metadata?: Record<string, any>;
}

/**
 * Snapshot statistics
 */
export interface SnapshotStats {
  /** Total snapshots */
  totalSnapshots: number;
  
  /** Storage size in bytes */
  storageSize: number;
  
  /** Average snapshot size */
  averageSnapshotSize: number;
  
  /** Snapshots by aggregate type */
  snapshotsByType: Record<string, number>;
  
  /** Last cleanup timestamp */
  lastCleanup?: Date;
}

/**
 * Event sourcing configuration
 */
export interface EventSourcingConfig {
  /** Snapshot configuration */
  snapshots: {
    /** Enable snapshots */
    enabled: boolean;
    
    /** Snapshot frequency (number of events) */
    frequency: number;
    
    /** Maximum snapshots to keep per aggregate */
    maxPerAggregate: number;
    
    /** Snapshot store configuration */
    store: any;
  };
  
  /** Projection configuration */
  projections: {
    /** Enable projections */
    enabled: boolean;
    
    /** Batch size for projection updates */
    batchSize: number;
    
    /** Maximum concurrent projections */
    maxConcurrency: number;
    
    /** Projection store configuration */
    store: any;
  };
  
  /** Saga configuration */
  sagas: {
    /** Enable sagas */
    enabled: boolean;
    
    /** Saga timeout in milliseconds */
    timeout: number;
    
    /** Maximum compensation attempts */
    maxCompensationAttempts: number;
    
    /** Saga store configuration */
    store: any;
  };
  
  /** CQRS configuration */
  cqrs: {
    /** Enable command/query separation */
    enabled: boolean;
    
    /** Command timeout in milliseconds */
    commandTimeout: number;
    
    /** Query timeout in milliseconds */
    queryTimeout: number;
  };
}
