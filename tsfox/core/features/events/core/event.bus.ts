/**
 * @fileoverview Event bus implementation
 * @module tsfox/core/features/events/core
 */

import {
  EventInterface,
  EventBusInterface,
  EventAdapterInterface,
  EventHandler,
  Subscription,
  SubscriptionOptions,
  EventBusStats
} from '../interfaces';
import { ExtendedEventEmitterInterface } from './event.emitter';

/**
 * In-memory event bus implementation
 */
export class MemoryEventBus implements EventBusInterface {
  private emitter: ExtendedEventEmitterInterface;
  private adapters: Map<string, EventAdapterInterface> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private stats: {
    totalPublished: number;
    totalReceived: number;
    failedPublishes: number;
    publishTimes: number[];
    lastActivity: Date;
  } = {
    totalPublished: 0,
    totalReceived: 0,
    failedPublishes: 0,
    publishTimes: [],
    lastActivity: new Date()
  };

  constructor(emitter: ExtendedEventEmitterInterface) {
    this.emitter = emitter;
  }

  /**
   * Publish an event
   */
  async publish(event: EventInterface): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Emit locally first
      await this.emitter.emit(event);

      // Publish to external adapters
      const publishPromises = Array.from(this.adapters.values()).map(adapter =>
        adapter.publish(event.type, event).catch(error => {
          console.error(`Adapter publish error:`, error);
          this.stats.failedPublishes++;
        })
      );

      await Promise.all(publishPromises);
      
      this.stats.totalPublished++;
      this.stats.publishTimes.push(Date.now() - startTime);
      this.stats.lastActivity = new Date();
      
      // Keep only last 100 publish times for average calculation
      if (this.stats.publishTimes.length > 100) {
        this.stats.publishTimes.shift();
      }
    } catch (error) {
      this.stats.failedPublishes++;
      throw error;
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events: EventInterface[]): Promise<void> {
    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);
  }

  /**
   * Subscribe to events
   */
  async subscribe(
    eventType: string,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Promise<Subscription> {
    const subscription = this.emitter.subscribe(eventType, handler, options);
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Subscribe to multiple event types
   */
  async subscribeToMultiple(
    eventTypes: string[],
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Promise<Subscription> {
    // Create subscriptions for each event type
    const subscriptions = eventTypes.map(eventType => 
      this.emitter.subscribe(eventType, handler, options)
    );

    // Create a composite subscription
    const compositeSubscription: Subscription = {
      id: this.generateSubscriptionId(),
      eventType: eventTypes.join(','),
      handler,
      options: options || {},
      unsubscribe: async () => {
        await Promise.all(subscriptions.map(sub => sub.unsubscribe()));
        this.subscriptions.delete(compositeSubscription.id);
      }
    };

    this.subscriptions.set(compositeSubscription.id, compositeSubscription);
    return compositeSubscription;
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscription: Subscription): Promise<void> {
    subscription.unsubscribe();
    this.subscriptions.delete(subscription.id);
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get bus statistics
   */
  async getStats(): Promise<EventBusStats> {
    const averagePublishLatency = this.stats.publishTimes.length > 0
      ? this.stats.publishTimes.reduce((sum, time) => sum + time, 0) / this.stats.publishTimes.length
      : 0;

    const eventsPerSecond = this.calculateEventsPerSecond();

    return {
      totalPublished: this.stats.totalPublished,
      totalReceived: this.stats.totalReceived,
      eventsPerSecond,
      averagePublishLatency,
      activeSubscriptions: this.subscriptions.size,
      failedPublishes: this.stats.failedPublishes,
      connectionStatus: this.getConnectionStatus(),
      lastActivity: this.stats.lastActivity
    };
  }

  /**
   * Close the bus connection
   */
  async close(): Promise<void> {
    // Disconnect all adapters
    const disconnectPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.disconnect().catch(error => {
        console.error(`Adapter disconnection error:`, error);
      })
    );

    await Promise.all(disconnectPromises);

    // Clear all subscriptions
    this.subscriptions.clear();
    this.emitter.removeAllListeners();
  }

  /**
   * Connect to external message brokers
   */
  async connect(): Promise<void> {
    // Connect all adapters
    const connectPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.connect().catch(error => {
        console.error(`Adapter connection error:`, error);
      })
    );

    await Promise.all(connectPromises);
  }

  /**
   * Disconnect from external message brokers
   */
  async disconnect(): Promise<void> {
    // Disconnect all adapters
    const disconnectPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.disconnect().catch(error => {
        console.error(`Adapter disconnection error:`, error);
      })
    );

    await Promise.all(disconnectPromises);
  }

  /**
   * Add adapter for external messaging
   */
  addAdapter(name: string, adapter: EventAdapterInterface): void {
    this.adapters.set(name, adapter);

    // Set up adapter event handling by subscribing to topics
    // Note: This is a simplified approach - real implementation would depend on adapter capabilities
  }

  /**
   * Remove adapter
   */
  removeAdapter(name: string): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      adapter.disconnect().catch(error => {
        console.error(`Adapter disconnection error:`, error);
      });
      this.adapters.delete(name);
    }
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): EventAdapterInterface | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all adapters
   */
  getAdapters(): Map<string, EventAdapterInterface> {
    return new Map(this.adapters);
  }

  /**
   * Calculate events per second
   */
  private calculateEventsPerSecond(): number {
    // Simple calculation based on last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentPublishTimes = this.stats.publishTimes.filter(time => 
      (this.stats.lastActivity.getTime() - time) <= 60000
    );
    
    return recentPublishTimes.length;
  }

  /**
   * Get connection status
   */
  private getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (this.adapters.size === 0) {
      return 'connected'; // No external adapters, consider locally connected
    }

    // Check if any adapters are connected (would need healthCheck method)
    return 'connected'; // Simplified for now
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all subscriptions and adapters
   */
  clear(): void {
    // Clear emitter
    this.emitter.removeAllListeners();

    // Clear adapters
    for (const adapter of this.adapters.values()) {
      adapter.disconnect().catch(console.error);
    }
    this.adapters.clear();
    
    // Clear subscriptions
    this.subscriptions.clear();

    // Reset stats
    this.stats = {
      totalPublished: 0,
      totalReceived: 0,
      failedPublishes: 0,
      publishTimes: [],
      lastActivity: new Date()
    };
  }
}

/**
 * Event bus factory
 */
export class EventBusFactory {
  /**
   * Create a memory-based event bus
   */
  static createMemoryBus(emitter: ExtendedEventEmitterInterface): EventBusInterface {
    return new MemoryEventBus(emitter);
  }

  /**
   * Create event bus with default configuration
   */
  static createWithDefaults(): EventBusInterface {
    // TODO: Create with default emitter and middleware
    const { EventEmitterFactory } = require('./event.emitter');
    const emitter = EventEmitterFactory.createWithDefaults();
    return new MemoryEventBus(emitter);
  }

  /**
   * Create event bus from configuration
   */
  static createFromConfig(config: EventBusConfig, emitter: ExtendedEventEmitterInterface): EventBusInterface {
    const bus = new MemoryEventBus(emitter);

    // Add configured adapters
    if (config.adapters) {
      for (const [name, adapterConfig] of Object.entries(config.adapters)) {
        // TODO: Create adapters from configuration
        console.log(`TODO: Create adapter ${name} with config:`, adapterConfig);
      }
    }

    return bus;
  }
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  /** Adapter configurations */
  adapters?: Record<string, any>;
  
  /** Connection settings */
  connection?: {
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
  };
  
  /** Performance settings */
  performance?: {
    maxConcurrency: number;
    batchSize: number;
    bufferSize: number;
  };
  
  /** Error handling */
  errorHandling?: {
    retryFailedMessages: boolean;
    deadLetterQueue: boolean;
    maxRetries: number;
  };
}
