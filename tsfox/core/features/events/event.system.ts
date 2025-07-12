/**
 * @fileoverview Main event system implementation
 * @module tsfox/core/features/events
 */

import {
  EventInterface,
  EventSystemInterface,
  EventHandler,
  Subscription,
  SubscriptionOptions,
  EventStats,
  EventConfig,
  EventBusInterface,
  EventStoreInterface
} from './interfaces';

import {
  EventEmitter,
  EventEmitterFactory,
  ExtendedEventEmitterInterface,
  MemoryEventStore,
  EventStoreFactory,
  MemoryEventBus,
  EventBusFactory
} from './core';

import {
  EventMiddlewareChainFactory
} from './middleware/middleware.chain';

/**
 * Main event system implementation
 */
export class EventSystem implements EventSystemInterface {
  private emitter: ExtendedEventEmitterInterface;
  private store: EventStoreInterface;
  private bus: EventBusInterface;
  private stats: {
    totalEvents: number;
    startTime: Date;
    lastProcessed: Date;
    failedEvents: number;
    retriedEvents: number;
    memoryUsage: number;
  };

  constructor(config?: Partial<EventConfig>) {
    // Initialize middleware chain
    const middlewareChain = EventMiddlewareChainFactory.createWithDefaults();
    
    // Initialize emitter
    this.emitter = EventEmitterFactory.create(middlewareChain);
    
    // Initialize store
    this.store = config?.store 
      ? EventStoreFactory.createFromConfig(config.store)
      : EventStoreFactory.createMemoryStore();
    
    // Initialize bus
    this.bus = config?.bus
      ? EventBusFactory.createFromConfig(config.bus, this.emitter)
      : EventBusFactory.createMemoryBus(this.emitter);

    // Initialize stats
    this.stats = {
      totalEvents: 0,
      startTime: new Date(),
      lastProcessed: new Date(),
      failedEvents: 0,
      retriedEvents: 0,
      memoryUsage: 0
    };
  }

  /**
   * Get the event emitter
   */
  getEmitter(): ExtendedEventEmitterInterface {
    return this.emitter;
  }

  /**
   * Get the event store
   */
  getStore(): EventStoreInterface {
    return this.store;
  }

  /**
   * Get the event bus
   */
  getBus(): EventBusInterface {
    return this.bus;
  }

  /**
   * Emit an event through the complete pipeline
   */
  async emit(event: EventInterface): Promise<void> {
    try {
      // Increment stats
      this.stats.totalEvents++;
      this.stats.lastProcessed = new Date();

      // Store the event first
      if (event.aggregateId) {
        await this.store.append(event.aggregateId, [event]);
      }

      // Publish through the bus (which will emit locally and to external adapters)
      await this.bus.publish(event);

    } catch (error) {
      this.stats.failedEvents++;
      throw error;
    }
  }

  /**
   * Register a local event handler
   */
  on(eventType: string, handler: EventHandler): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Subscribe to events from the bus
   */
  async subscribe(
    eventType: string, 
    handler: EventHandler, 
    options?: SubscriptionOptions
  ): Promise<Subscription> {
    return this.bus.subscribe(eventType, handler, options);
  }

  /**
   * Replay events from a stream
   */
  async replay(streamId: string, fromVersion?: number): Promise<void> {
    const events = await this.store.read(streamId, fromVersion);
    
    for (const event of events) {
      await this.emitter.emit(event);
    }
  }

  /**
   * Register an event projection
   */
  registerProjection(projection: any): void {
    // TODO: Implement projection registration
    console.log('TODO: Implement projection registration for:', projection);
  }

  /**
   * Get event processing statistics
   */
  getStats(): EventStats {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const eventsPerSecond = uptime > 0 ? (this.stats.totalEvents / (uptime / 1000)) : 0;

    return {
      totalEvents: this.stats.totalEvents,
      eventsPerSecond,
      averageLatency: 0, // TODO: Implement latency tracking
      failedEvents: this.stats.failedEvents,
      retriedEvents: this.stats.retriedEvents,
      memoryUsage: this.stats.memoryUsage,
      activeSubscriptions: this.emitter.getSubscriptions().length,
      lastProcessed: this.stats.lastProcessed
    };
  }

  /**
   * Shutdown the event system
   */
  async shutdown(): Promise<void> {
    // Close bus connections
    await this.bus.close();
    
    // Clear emitter
    this.emitter.clear();
    
    // Clear store if it has a clear method
    if ('clear' in this.store && typeof this.store.clear === 'function') {
      await this.store.clear();
    }
  }
}

/**
 * Event system factory
 */
export class EventSystemFactory {
  /**
   * Create a new event system with default configuration
   */
  static create(config?: Partial<EventConfig>): EventSystemInterface {
    return new EventSystem(config);
  }

  /**
   * Create a memory-only event system for testing
   */
  static createMemorySystem(): EventSystemInterface {
    return new EventSystem({
      store: {
        type: 'memory'
      }
    });
  }

  /**
   * Create event system from full configuration
   */
  static createFromConfig(config: EventConfig): EventSystemInterface {
    return new EventSystem(config);
  }
}
