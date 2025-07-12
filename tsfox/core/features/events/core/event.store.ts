/**
 * @fileoverview Event store implementation
 * @module tsfox/core/features/events/core
 */

import {
  EventInterface,
  EventStoreInterface,
  StreamMetadata,
  EventStoreStats,
  Snapshot,
  EventStoreTransaction,
  TransactionalEventStoreInterface,
  EventHandler,
  Subscription
} from '../interfaces';

/**
 * In-memory transaction implementation
 */
class MemoryTransaction implements EventStoreTransaction {
  readonly id: string;
  readonly status: 'pending' | 'committed' | 'rolled-back' = 'pending';
  private operations: Array<{
    streamId: string;
    events: EventInterface[];
    expectedVersion?: number;
  }> = [];
  private store: MemoryEventStore;
  private _status: 'pending' | 'committed' | 'rolled-back' = 'pending';

  constructor(id: string, store: MemoryEventStore) {
    this.id = id;
    this.store = store;
  }

  get status(): 'pending' | 'committed' | 'rolled-back' {
    return this._status;
  }

  append(streamId: string, events: EventInterface[], expectedVersion?: number): void {
    if (this._status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    this.operations.push({
      streamId,
      events,
      expectedVersion
    });
  }

  async commit(): Promise<void> {
    if (this._status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    try {
      // Execute all operations
      for (const operation of this.operations) {
        await this.store.directAppend(
          operation.streamId,
          operation.events,
          operation.expectedVersion
        );
      }

      this._status = 'committed';
    } catch (error) {
      this._status = 'rolled-back';
      throw error;
    }
  }

  async rollback(): Promise<void> {
    this._status = 'rolled-back';
  }
}

/**
 * In-memory event store implementation
 */
export class MemoryEventStore implements TransactionalEventStoreInterface {
  private events: Map<string, EventInterface[]> = new Map();
  private metadata: Map<string, StreamMetadata> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private subscriptions: Map<string, { handler: EventHandler; fromPosition?: number }> = new Map();
  private eventCounter: number = 0;

  /**
   * Append events to a stream
   */
  async append(
    streamId: string,
    events: EventInterface[],
    expectedVersion?: number
  ): Promise<void> {
    await this.directAppend(streamId, events, expectedVersion);
  }

  /**
   * Direct append (used by transactions)
   */
  async directAppend(
    streamId: string,
    events: EventInterface[],
    expectedVersion?: number
  ): Promise<number> {
    // Check expected version
    const currentVersion = await this.getStreamVersion(streamId);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(
        `Expected version ${expectedVersion}, but current version is ${currentVersion}`
      );
    }

    // Get or create stream
    if (!this.events.has(streamId)) {
      this.events.set(streamId, []);
      this.metadata.set(streamId, {
        streamId,
        version: 0,
        created: new Date(),
        lastUpdated: new Date(),
        status: 'active'
      });
    }

    const stream = this.events.get(streamId)!;
    const streamMetadata = this.metadata.get(streamId)!;

    // Append events
    let version = streamMetadata.version;
    for (const event of events) {
      version++;
      this.eventCounter++;
      
      // Create event with additional properties
      const enhancedEvent: EventInterface = {
        ...event,
        // Add position for global ordering if not present
        ...(event.metadata ? {} : { metadata: {} })
      };
      
      stream.push(enhancedEvent);
    }

    // Update metadata
    streamMetadata.version = version;
    streamMetadata.lastUpdated = new Date();

    return version;
  }

  /**
   * Read events from a stream
   */
  async read(
    streamId: string,
    fromVersion?: number,
    maxCount?: number
  ): Promise<EventInterface[]> {
    const stream = this.events.get(streamId);
    if (!stream) {
      return [];
    }

    let events = stream;

    // Filter by version (assuming events are ordered by version)
    if (fromVersion !== undefined) {
      const startIndex = Math.max(0, fromVersion);
      events = events.slice(startIndex);
    }

    // Limit count
    if (maxCount !== undefined) {
      events = events.slice(0, maxCount);
    }

    return [...events]; // Return copy
  }

  /**
   * Read all events from all streams
   */
  async readAll(fromPosition?: number, maxCount?: number): Promise<EventInterface[]> {
    const allEvents: EventInterface[] = [];
    
    for (const stream of this.events.values()) {
      allEvents.push(...stream);
    }

    // Sort by timestamp
    allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let events = allEvents;

    // Filter by position (using array index as position)
    if (fromPosition !== undefined) {
      events = events.slice(fromPosition);
    }

    // Limit count
    if (maxCount !== undefined) {
      events = events.slice(0, maxCount);
    }

    return events;
  }

  /**
   * Subscribe to new events
   */
  async subscribe(handler: EventHandler, fromPosition?: number): Promise<Subscription> {
    const subscriptionId = this.generateSubscriptionId();
    
    this.subscriptions.set(subscriptionId, {
      handler,
      fromPosition
    });

    return {
      id: subscriptionId,
      unsubscribe: () => {
        this.subscriptions.delete(subscriptionId);
      }
    };
  }

  /**
   * Get stream metadata
   */
  async getStreamMetadata(streamId: string): Promise<StreamMetadata> {
    const metadata = this.metadata.get(streamId);
    if (!metadata) {
      throw new Error(`Stream ${streamId} not found`);
    }
    return { ...metadata };
  }

  /**
   * Set stream metadata
   */
  async setStreamMetadata(streamId: string, metadata: StreamMetadata): Promise<void> {
    this.metadata.set(streamId, { ...metadata });
  }

  /**
   * Delete a stream
   */
  async deleteStream(streamId: string, hardDelete?: boolean): Promise<void> {
    if (hardDelete) {
      this.events.delete(streamId);
      this.metadata.delete(streamId);
      this.snapshots.delete(streamId);
    } else {
      const metadata = this.metadata.get(streamId);
      if (metadata) {
        metadata.status = 'deleted';
        metadata.lastUpdated = new Date();
      }
    }
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<EventStoreStats> {
    let totalEvents = 0;
    let totalStreams = this.events.size;

    for (const stream of this.events.values()) {
      totalEvents += stream.length;
    }

    return {
      totalEvents,
      totalStreams,
      storageSize: this.calculateStorageSize(),
      activeSubscriptions: this.subscriptions.size,
      averageEventsPerStream: totalStreams > 0 ? totalEvents / totalStreams : 0,
      readsPerSecond: 0, // Would need metrics collection
      writesPerSecond: 0, // Would need metrics collection
      lastCleanup: undefined
    };
  }

  /**
   * Create a snapshot
   */
  async createSnapshot(streamId: string, version: number, data: any): Promise<void> {
    const snapshot: Snapshot = {
      streamId,
      version,
      data,
      timestamp: new Date()
    };
    
    this.snapshots.set(streamId, snapshot);
  }

  /**
   * Get snapshot
   */
  async getSnapshot(streamId: string): Promise<Snapshot | null> {
    const snapshot = this.snapshots.get(streamId);
    return snapshot ? { ...snapshot } : null;
  }

  /**
   * Clean up old events
   */
  async cleanup(): Promise<void> {
    // Implementation would depend on retention policies
    // For now, this is a no-op
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<EventStoreTransaction> {
    const transactionId = this.generateTransactionId();
    return new MemoryTransaction(transactionId, this);
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<T>(operation: (tx: EventStoreTransaction) => Promise<T>): Promise<T> {
    const transaction = await this.beginTransaction();
    
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get stream version
   */
  private async getStreamVersion(streamId: string): Promise<number> {
    const metadata = this.metadata.get(streamId);
    return metadata ? metadata.version : -1;
  }

  /**
   * Calculate storage size (rough estimation)
   */
  private calculateStorageSize(): number {
    let size = 0;
    
    // Calculate events size
    for (const stream of this.events.values()) {
      for (const event of stream) {
        size += JSON.stringify(event).length;
      }
    }
    
    // Calculate metadata size
    for (const metadata of this.metadata.values()) {
      size += JSON.stringify(metadata).length;
    }
    
    // Calculate snapshots size
    for (const snapshot of this.snapshots.values()) {
      size += JSON.stringify(snapshot).length;
    }
    
    return size;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.events.clear();
    this.metadata.clear();
    this.snapshots.clear();
    this.subscriptions.clear();
    this.eventCounter = 0;
  }
}

/**
 * Event store factory
 */
export class EventStoreFactory {
  /**
   * Create memory-based event store
   */
  static createMemoryStore(): TransactionalEventStoreInterface {
    return new MemoryEventStore();
  }

  /**
   * Create event store from configuration
   */
  static createFromConfig(config: EventStoreConfig): EventStoreInterface {
    switch (config.type) {
      case 'memory':
        return new MemoryEventStore();
      default:
        throw new Error(`Unsupported event store type: ${config.type}`);
    }
  }
}

/**
 * Event store configuration
 */
export interface EventStoreConfig {
  /** Store type */
  type: 'memory' | 'file' | 'database' | 'external' | 'postgresql' | 'mongodb' | 'eventstore';
  
  /** Connection configuration */
  connection?: any;
  
  /** Performance settings */
  performance?: {
    batchSize: number;
    maxConcurrency: number;
    cacheSize: number;
  };
  
  /** Security settings */
  security?: {
    encryption: boolean;
    accessControl: boolean;
  };
}
