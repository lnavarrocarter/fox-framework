/**
 * @fileoverview Events manager implementation
 * @module tsfox/core/plugins/events.manager
 */

import { IEventsManager } from './interfaces';
import {
  EventHandler,
  PluginEvent,
  EventPriority,
  EventSubscriptionOptions,
  EventSubscription,
  EventHandlerStats,
  EventHandlerError,
  IEventFilter,
  IEventMiddleware,
  EventEmitterOptions,
  EventBatch,
  EventMetrics,
  IEventStore,
  EventStoreCriteria
} from './events.interfaces';

/**
 * Event subscription entry
 */
interface EventSubscriptionEntry {
  handler: EventHandler;
  options: EventSubscriptionOptions;
  plugin: string;
  id: string;
  subscribedAt: number;
  stats: EventHandlerStats;
}

/**
 * Events manager implementation
 */
export class EventsManager implements IEventsManager {
  private subscriptions = new Map<string, EventSubscriptionEntry[]>();
  private filters: IEventFilter[] = [];
  private middleware: IEventMiddleware[] = [];
  private eventStore?: IEventStore;
  private metrics = new Map<string, EventMetrics>();
  private nextId = 0;

  constructor(storageOptions?: any) {
    if (storageOptions?.persistEvents && storageOptions.eventStore) {
      this.initializeEventStore(storageOptions.eventStore);
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): void {
    this.subscribe(event, handler, {});
  }

  /**
   * Subscribe to an event once
   */
  once(event: string, handler: EventHandler): void {
    this.subscribe(event, handler, { once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler?: EventHandler): void {
    const subscriptions = this.subscriptions.get(event);
    if (!subscriptions) return;

    if (handler) {
      const index = subscriptions.findIndex(sub => sub.handler === handler);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(event);
        }
      }
    } else {
      this.subscriptions.delete(event);
    }

    this.updateMetrics(event, 'unsubscribe');
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    const pluginEvent = this.createEvent(event, data, { async: false });
    this.processEvent(pluginEvent);
  }

  /**
   * Emit an event asynchronously
   */
  async emitAsync(event: string, data?: any): Promise<void> {
    const pluginEvent = this.createEvent(event, data, { async: true });
    await this.processEventAsync(pluginEvent);
  }

  /**
   * Emit event with options
   */
  async emitWithOptions(event: string, data?: any, options: EventEmitterOptions = {}): Promise<void> {
    const pluginEvent = this.createEvent(event, data, options);
    
    if (options.async !== false) {
      await this.processEventAsync(pluginEvent);
    } else {
      this.processEvent(pluginEvent);
    }
  }

  /**
   * Emit event batch
   */
  async emitBatch(batch: EventBatch): Promise<void> {
    const events = batch.events.map(e => this.createEvent(e.type, e.data, e.options));

    if (batch.options.mode === 'parallel') {
      const promises = events.map(event => this.processEventAsync(event));
      
      if (batch.options.failFast) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }
    } else {
      // Sequential execution
      for (const event of events) {
        try {
          await this.processEventAsync(event);
        } catch (error) {
          if (batch.options.errorHandling === 'ignore') {
            continue;
          } else if (batch.options.errorHandling === 'log') {
            console.error(`Error in batch event ${event.type}:`, error);
            continue;
          } else {
            throw error;
          }
        }
      }
    }
  }

  /**
   * Get event listeners
   */
  listeners(event: string): EventHandler[] {
    const subscriptions = this.subscriptions.get(event);
    return subscriptions ? subscriptions.map(sub => sub.handler) : [];
  }

  /**
   * Get all events
   */
  eventNames(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Clear all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Subscribe with advanced options
   */
  subscribe(event: string, handler: EventHandler, options: EventSubscriptionOptions): string {
    const id = this.generateId();
    const entry: EventSubscriptionEntry = {
      handler,
      options: {
        priority: EventPriority.NORMAL,
        once: false,
        ...options
      },
      plugin: options.context?.plugin || 'unknown',
      id,
      subscribedAt: Date.now(),
      stats: {
        invocations: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
        lastExecution: 0,
        errors: []
      }
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const subscriptions = this.subscriptions.get(event)!;
    subscriptions.push(entry);

    // Sort by priority (higher priority first)
    subscriptions.sort((a, b) => (b.options.priority || EventPriority.NORMAL) - (a.options.priority || EventPriority.NORMAL));

    this.updateMetrics(event, 'subscribe');
    
    return id;
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    for (const [event, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(event);
        }
        this.updateMetrics(event, 'unsubscribe');
        break;
      }
    }
  }

  /**
   * Get subscription info
   */
  getSubscription(subscriptionId: string): EventSubscription | undefined {
    for (const [event, subscriptions] of this.subscriptions) {
      const entry = subscriptions.find(sub => sub.id === subscriptionId);
      if (entry) {
        return {
          event,
          handler: entry.handler,
          options: entry.options,
          plugin: entry.plugin,
          id: entry.id,
          subscribedAt: entry.subscribedAt,
          stats: entry.stats
        };
      }
    }
    return undefined;
  }

  /**
   * Get all subscriptions for an event
   */
  getSubscriptions(event: string): EventSubscription[] {
    const entries = this.subscriptions.get(event) || [];
    return entries.map(entry => ({
      event,
      handler: entry.handler,
      options: entry.options,
      plugin: entry.plugin,
      id: entry.id,
      subscribedAt: entry.subscribedAt,
      stats: entry.stats
    }));
  }

  /**
   * Add event filter
   */
  addFilter(filter: IEventFilter): void {
    this.filters.push(filter);
    this.filters.sort((a, b) => (b.priority || 50) - (a.priority || 50));
  }

  /**
   * Remove event filter
   */
  removeFilter(name: string): void {
    const index = this.filters.findIndex(f => f.name === name);
    if (index !== -1) {
      this.filters.splice(index, 1);
    }
  }

  /**
   * Add event middleware
   */
  addMiddleware(middleware: IEventMiddleware): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => (b.priority || 50) - (a.priority || 50));
  }

  /**
   * Remove event middleware
   */
  removeMiddleware(name: string): void {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * Get event metrics
   */
  getMetrics(event?: string): Map<string, EventMetrics> {
    if (event) {
      const metric = this.metrics.get(event);
      return metric ? new Map([[event, metric]]) : new Map();
    }
    return new Map(this.metrics);
  }

  /**
   * Reset metrics
   */
  resetMetrics(event?: string): void {
    if (event) {
      this.metrics.delete(event);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get system statistics
   */
  getStats() {
    const totalEvents = this.subscriptions.size;
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((sum, subs) => sum + subs.length, 0);
    
    const activeSubscriptions = totalSubscriptions; // All are active in this implementation
    
    return {
      totalEvents,
      totalSubscriptions,
      activeSubscriptions,
      totalEmissions: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.emissions, 0),
      totalHandlerExecutions: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.handlerExecutions, 0),
      totalHandlerFailures: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.handlerFailures, 0)
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize event store
   */
  private initializeEventStore(storeType: string): void {
    // For now, use a simple in-memory store
    // This would be enhanced with proper persistence stores
    this.eventStore = new MemoryEventStore();
  }

  /**
   * Create a plugin event
   */
  private createEvent(type: string, data?: any, options: EventEmitterOptions = {}): PluginEvent {
    return {
      type,
      source: options.namespace || 'system',
      data,
      timestamp: Date.now(),
      id: this.generateEventId(),
      metadata: options.metadata,
      priority: options.priority,
      namespace: options.namespace,
      version: options.version,
      cancellable: options.cancellable,
      cancelled: false,
      cancel: function() { this.cancelled = true; },
      preventDefault: function() { /* Implementation */ },
      stopPropagation: function() { /* Implementation */ }
    };
  }

  /**
   * Process event synchronously
   */
  private processEvent(event: PluginEvent): void {
    try {
      // Apply filters
      if (!this.applyFilters(event)) {
        return;
      }

      // Store event if persistence is enabled
      if (this.eventStore) {
        this.eventStore.store(event).catch(console.error);
      }

      // Process subscriptions
      const subscriptions = this.subscriptions.get(event.type) || [];
      
      for (const subscription of subscriptions) {
        if (this.shouldProcessSubscription(subscription, event)) {
          this.executeHandlerSync(subscription, event);
        }
      }

      this.updateMetrics(event.type, 'emit');

    } catch (error) {
      console.error(`Error processing event ${event.type}:`, error);
    }
  }

  /**
   * Process event asynchronously
   */
  private async processEventAsync(event: PluginEvent): Promise<void> {
    try {
      // Apply filters
      if (!this.applyFilters(event)) {
        return;
      }

      // Apply middleware
      for (const middleware of this.middleware) {
        await middleware.process(event, async () => {});
      }

      // Store event if persistence is enabled
      if (this.eventStore) {
        await this.eventStore.store(event);
      }

      // Process subscriptions
      const subscriptions = this.subscriptions.get(event.type) || [];
      
      const promises = subscriptions
        .filter(sub => this.shouldProcessSubscription(sub, event))
        .map(sub => this.executeHandlerAsync(sub, event));

      await Promise.allSettled(promises);

      this.updateMetrics(event.type, 'emit');

    } catch (error) {
      console.error(`Error processing event ${event.type}:`, error);
    }
  }

  /**
   * Apply event filters
   */
  private applyFilters(event: PluginEvent): boolean {
    for (const filter of this.filters) {
      if (!filter.filter(event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if subscription should be processed
   */
  private shouldProcessSubscription(subscription: EventSubscriptionEntry, event: PluginEvent): boolean {
    // Namespace filter
    if (subscription.options.namespace && event.namespace !== subscription.options.namespace) {
      return false;
    }

    // Version filter
    if (subscription.options.version && event.version !== subscription.options.version) {
      return false;
    }

    // Condition filter
    if (subscription.options.condition && !subscription.options.condition(event)) {
      return false;
    }

    return true;
  }

  /**
   * Execute handler synchronously
   */
  private executeHandlerSync(subscription: EventSubscriptionEntry, event: PluginEvent): void {
    const startTime = performance.now();
    
    try {
      subscription.handler(event);
      
      const endTime = performance.now();
      this.updateSubscriptionStats(subscription, endTime - startTime, true);
      
      // Handle once option
      if (subscription.options.once) {
        this.unsubscribe(subscription.id);
      }

    } catch (error) {
      this.updateSubscriptionStats(subscription, 0, false, error as Error);
    }
  }

  /**
   * Execute handler asynchronously
   */
  private async executeHandlerAsync(subscription: EventSubscriptionEntry, event: PluginEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      const timeout = subscription.options.timeout;
      
      if (timeout) {
        await Promise.race([
          subscription.handler(event),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), timeout)
          )
        ]);
      } else {
        await subscription.handler(event);
      }
      
      const endTime = performance.now();
      this.updateSubscriptionStats(subscription, endTime - startTime, true);
      
      // Handle once option
      if (subscription.options.once) {
        this.unsubscribe(subscription.id);
      }

    } catch (error) {
      this.updateSubscriptionStats(subscription, 0, false, error as Error);
    }
  }

  /**
   * Update subscription statistics
   */
  private updateSubscriptionStats(
    subscription: EventSubscriptionEntry, 
    executionTime: number, 
    success: boolean, 
    error?: Error
  ): void {
    subscription.stats.invocations++;
    subscription.stats.lastExecution = Date.now();
    
    if (success) {
      subscription.stats.successes++;
    } else {
      subscription.stats.failures++;
      
      if (error) {
        subscription.stats.errors.push({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          event: {} as PluginEvent // Simplified for now
        });

        // Keep only last 10 errors
        if (subscription.stats.errors.length > 10) {
          subscription.stats.errors = subscription.stats.errors.slice(-10);
        }
      }
    }

    // Update average time
    const totalTime = subscription.stats.averageTime * (subscription.stats.invocations - 1) + executionTime;
    subscription.stats.averageTime = totalTime / subscription.stats.invocations;
  }

  /**
   * Update event metrics
   */
  private updateMetrics(event: string, operation: 'emit' | 'subscribe' | 'unsubscribe'): void {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, {
        type: event,
        emissions: 0,
        subscriptions: 0,
        activeSubscriptions: 0,
        averageHandlerTime: 0,
        handlerExecutions: 0,
        handlerFailures: 0,
        lastEmission: 0,
        throughput: {
          perSecond: 0,
          perMinute: 0,
          perHour: 0
        }
      });
    }

    const metrics = this.metrics.get(event)!;
    
    switch (operation) {
      case 'emit':
        metrics.emissions++;
        metrics.lastEmission = Date.now();
        break;
      case 'subscribe':
        metrics.subscriptions++;
        metrics.activeSubscriptions++;
        break;
      case 'unsubscribe':
        metrics.activeSubscriptions = Math.max(0, metrics.activeSubscriptions - 1);
        break;
    }

    this.metrics.set(event, metrics);
  }

  /**
   * Generate unique subscription ID
   */
  private generateId(): string {
    return `sub_${++this.nextId}_${Date.now()}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Simple in-memory event store implementation
 */
class MemoryEventStore implements IEventStore {
  private events: PluginEvent[] = [];
  private maxEvents = 10000;

  async store(event: PluginEvent): Promise<void> {
    this.events.push(event);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async retrieve(criteria: EventStoreCriteria): Promise<PluginEvent[]> {
    let filtered = [...this.events];

    // Apply filters
    if (criteria.type) {
      filtered = filtered.filter(e => e.type === criteria.type);
    }
    
    if (criteria.source) {
      filtered = filtered.filter(e => e.source === criteria.source);
    }
    
    if (criteria.namespace) {
      filtered = filtered.filter(e => e.namespace === criteria.namespace);
    }
    
    if (criteria.timeRange) {
      filtered = filtered.filter(e => 
        e.timestamp >= criteria.timeRange!.from && 
        e.timestamp <= criteria.timeRange!.to
      );
    }
    
    if (criteria.ids) {
      filtered = filtered.filter(e => criteria.ids!.includes(e.id));
    }

    // Apply sorting
    if (criteria.sort) {
      filtered.sort((a, b) => {
        const field = criteria.sort!.field;
        const order = criteria.sort!.order === 'desc' ? -1 : 1;
        
        if (field === 'timestamp') {
          return (a.timestamp - b.timestamp) * order;
        } else if (field === 'type') {
          return a.type.localeCompare(b.type) * order;
        } else if (field === 'source') {
          return a.source.localeCompare(b.source) * order;
        }
        
        return 0;
      });
    }

    // Apply pagination
    if (criteria.skip) {
      filtered = filtered.slice(criteria.skip);
    }
    
    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  async count(criteria: EventStoreCriteria): Promise<number> {
    const results = await this.retrieve(criteria);
    return results.length;
  }

  async delete(criteria: EventStoreCriteria): Promise<number> {
    const toDelete = await this.retrieve(criteria);
    const deleteIds = new Set(toDelete.map(e => e.id));
    
    const originalLength = this.events.length;
    this.events = this.events.filter(e => !deleteIds.has(e.id));
    
    return originalLength - this.events.length;
  }

  async getById(id: string): Promise<PluginEvent | undefined> {
    return this.events.find(e => e.id === id);
  }

  async *stream(criteria: EventStoreCriteria): AsyncIterable<PluginEvent> {
    const results = await this.retrieve(criteria);
    for (const event of results) {
      yield event;
    }
  }
}
