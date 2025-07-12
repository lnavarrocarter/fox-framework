/**
 * @fileoverview Event emitter implementation
 * @module tsfox/core/features/events/core
 */

import {
  EventInterface,
  EventEmitterInterface,
  EventHandler,
  EventContext,
  EventMiddlewareChain,
  Subscription,
  SubscriptionOptions
} from '../interfaces';

/**
 * Extended event emitter interface with subscription support
 */
export interface ExtendedEventEmitterInterface extends EventEmitterInterface {
  /** Register an event handler and return subscription */
  subscribe(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Subscription;
  
  /** Register a one-time event handler and return subscription */
  subscribeOnce(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Subscription;
  
  /** Get all active subscriptions */
  getSubscriptions(): Subscription[];
  
  /** Get subscription by ID */
  getSubscription(id: string): Subscription | null;
  
  /** Get emitter statistics */
  getStats(): EventEmitterStats;
  
  /** Clear all data */
  clear(): void;
}

/**
 * In-memory event emitter implementation
 */
export class EventEmitter implements ExtendedEventEmitterInterface {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private middlewareChain?: EventMiddlewareChain;
  private isListening: boolean = false;

  constructor(middlewareChain?: EventMiddlewareChain) {
    this.middlewareChain = middlewareChain;
  }

  /**
   * Emit an event
   */
  async emit(event: EventInterface, context?: EventContext): Promise<void> {
    try {
      // Create context if not provided
      const eventContext = context || this.createDefaultContext(event);

      // Apply before emit middleware
      const processedEvent = this.middlewareChain
        ? await this.middlewareChain.executeBeforeEmit(event, eventContext)
        : event;

      // Get handlers for this event type
      const eventHandlers = this.handlers.get(processedEvent.type) || new Set();
      const wildcardHandlers = this.handlers.get('*') || new Set();
      
      // Combine handlers
      const allHandlers = new Set([...eventHandlers, ...wildcardHandlers]);

      // Execute handlers in parallel
      const handlerPromises = Array.from(allHandlers).map(async (handler) => {
        try {
          // Apply before handle middleware
          const handlerEvent = this.middlewareChain
            ? await this.middlewareChain.executeBeforeHandle(processedEvent, eventContext)
            : processedEvent;

          // Execute handler
          await handler(handlerEvent);

          // Apply after handle middleware
          if (this.middlewareChain) {
            await this.middlewareChain.executeAfterHandle(handlerEvent, eventContext);
          }
        } catch (error) {
          // Apply handle error middleware
          if (this.middlewareChain) {
            await this.middlewareChain.executeOnHandleError(
              error as Error,
              processedEvent,
              eventContext
            );
          } else {
            console.error('Event handler error:', error);
          }
        }
      });

      await Promise.all(handlerPromises);

      // Apply after emit middleware
      if (this.middlewareChain) {
        await this.middlewareChain.executeAfterEmit(processedEvent, eventContext);
      }
    } catch (error) {
      // Apply error middleware
      const eventContext = context || this.createDefaultContext(event);
      if (this.middlewareChain) {
        await this.middlewareChain.executeOnError(error as Error, event, eventContext);
      } else {
        console.error('Event emission error:', error);
        throw error;
      }
    }
  }

  /**
   * Register an event handler (EventEmitterInterface requirement)
   */
  on(eventType: string, handler: EventHandler): void {
    // Get or create handler set for this event type
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler);
  }

  /**
   * Subscribe to events and return subscription
   */
  subscribe(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Subscription {
    // Get or create handler set for this event type
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler);

    // Create subscription
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler,
      options: options || {},
      unsubscribe: async () => {
        handlerSet.delete(handler);
        this.subscriptions.delete(subscription.id);
      }
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Subscribe to events once
   */
  once(eventType: string, handler: EventHandler): void {
    const onceHandler: EventHandler = async (event) => {
      try {
        await handler(event);
      } finally {
        this.off(eventType, onceHandler);
      }
    };

    this.on(eventType, onceHandler);
  }

  /**
   * Subscribe to events once and return subscription
   */
  subscribeOnce(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Subscription {
    const subscription = this.subscribe(eventType, handler, options);
    
    // Wrap the original handler to unsubscribe after first execution
    const originalHandler = subscription.handler;
    const onceHandler: EventHandler = async (event) => {
      try {
        await originalHandler(event);
      } finally {
        await subscription.unsubscribe();
      }
    };

    // Replace handler in the handlers map
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      handlerSet.delete(handler);
      handlerSet.add(onceHandler);
    }

    return subscription;
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for this event type
      this.handlers.delete(eventType);
      
      // Remove related subscriptions
      for (const [id, subscription] of this.subscriptions) {
        if (subscription.eventType === eventType) {
          this.subscriptions.delete(id);
        }
      }
    } else {
      // Remove specific handler
      const handlerSet = this.handlers.get(eventType);
      if (handlerSet) {
        handlerSet.delete(handler);
        
        // Remove related subscription
        for (const [id, subscription] of this.subscriptions) {
          if (subscription.eventType === eventType && subscription.handler === handler) {
            this.subscriptions.delete(id);
            break;
          }
        }
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.off(eventType);
    } else {
      this.handlers.clear();
      
      // Clear all subscriptions
      this.subscriptions.clear();
    }
  }

  /**
   * Get event listeners
   */
  listeners(eventType: string): EventHandler[] {
    const handlerSet = this.handlers.get(eventType);
    return handlerSet ? Array.from(handlerSet) : [];
  }

  /**
   * Get event types that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get listener count for event type
   */
  listenerCount(eventType: string): number {
    const handlerSet = this.handlers.get(eventType);
    return handlerSet ? handlerSet.size : 0;
  }

  /**
   * Start listening for events
   */
  async startListening(): Promise<void> {
    this.isListening = true;
  }

  /**
   * Stop listening for events
   */
  async stopListening(): Promise<void> {
    this.isListening = false;
  }

  /**
   * Check if emitter is listening
   */
  isEventListening(): boolean {
    return this.isListening;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): Subscription | null {
    return this.subscriptions.get(id) || null;
  }

  /**
   * Create default event context
   */
  private createDefaultContext(event: EventInterface): EventContext {
    return {
      eventId: event.id,
      correlationId: event.metadata?.correlationId,
      source: 'EventEmitter',
      timestamp: new Date(),
      metadata: {}
    };
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get emitter statistics
   */
  getStats(): EventEmitterStats {
    const handlerCounts: Record<string, number> = {};
    let totalHandlers = 0;

    for (const [eventType, handlerSet] of this.handlers) {
      const count = handlerSet.size;
      handlerCounts[eventType] = count;
      totalHandlers += count;
    }

    return {
      totalEventTypes: this.handlers.size,
      totalHandlers,
      activeSubscriptions: this.subscriptions.size,
      handlersByEventType: handlerCounts,
      isListening: this.isListening
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.removeAllListeners();
    this.isListening = false;
  }
}

/**
 * Event emitter statistics
 */
export interface EventEmitterStats {
  /** Total event types registered */
  totalEventTypes: number;
  
  /** Total handlers registered */
  totalHandlers: number;
  
  /** Active subscriptions */
  activeSubscriptions: number;
  
  /** Handlers by event type */
  handlersByEventType: Record<string, number>;
  
  /** Is listening flag */
  isListening: boolean;
}

/**
 * Event emitter factory
 */
export class EventEmitterFactory {
  /**
   * Create a new event emitter
   */
  static create(middlewareChain?: EventMiddlewareChain): ExtendedEventEmitterInterface {
    return new EventEmitter(middlewareChain);
  }

  /**
   * Create event emitter with default middleware
   */
  static createWithDefaults(): ExtendedEventEmitterInterface {
    // TODO: Add default middleware chain
    return new EventEmitter();
  }
}
