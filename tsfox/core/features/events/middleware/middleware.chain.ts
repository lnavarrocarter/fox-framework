/**
 * @fileoverview Event middleware chain implementation
 * @module tsfox/core/features/events/middleware
 */

import {
  EventInterface,
  EventContext,
  EventMiddlewareInterface,
  EventMiddlewareChain
} from '../interfaces';

/**
 * Event middleware chain implementation
 */
export class MemoryEventMiddlewareChain implements EventMiddlewareChain {
  private middleware: EventMiddlewareInterface[] = [];

  /**
   * Add middleware to the chain
   */
  add(middleware: EventMiddlewareInterface): void {
    this.middleware.push(middleware);
    // Sort by priority (lower number = higher priority)
    this.middleware.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove middleware from the chain
   */
  remove(middlewareName: string): void {
    this.middleware = this.middleware.filter(m => m.name !== middlewareName);
  }

  /**
   * Get middleware by name
   */
  get(middlewareName: string): EventMiddlewareInterface | null {
    return this.middleware.find(m => m.name === middlewareName) || null;
  }

  /**
   * Execute before emit middleware chain
   */
  async executeBeforeEmit(event: EventInterface, context: EventContext): Promise<EventInterface> {
    let processedEvent = event;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeEmit) {
        try {
          processedEvent = await middleware.beforeEmit(processedEvent, context);
        } catch (error) {
          console.error(`Middleware ${middleware.name} beforeEmit error:`, error);
          // Continue with next middleware
        }
      }
    }
    
    return processedEvent;
  }

  /**
   * Execute after emit middleware chain
   */
  async executeAfterEmit(event: EventInterface, context: EventContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.afterEmit) {
        try {
          await middleware.afterEmit(event, context);
        } catch (error) {
          console.error(`Middleware ${middleware.name} afterEmit error:`, error);
          // Continue with next middleware
        }
      }
    }
  }

  /**
   * Execute error handling middleware chain
   */
  async executeOnError(error: Error, event: EventInterface, context: EventContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.onError) {
        try {
          await middleware.onError(error, event, context);
        } catch (middlewareError) {
          console.error(`Middleware ${middleware.name} onError error:`, middlewareError);
          // Continue with next middleware
        }
      }
    }
  }

  /**
   * Execute before handle middleware chain
   */
  async executeBeforeHandle(event: EventInterface, context: EventContext): Promise<EventInterface> {
    let processedEvent = event;
    
    for (const middleware of this.middleware) {
      if (middleware.beforeHandle) {
        try {
          processedEvent = await middleware.beforeHandle(processedEvent, context);
        } catch (error) {
          console.error(`Middleware ${middleware.name} beforeHandle error:`, error);
          // Continue with next middleware
        }
      }
    }
    
    return processedEvent;
  }

  /**
   * Execute after handle middleware chain
   */
  async executeAfterHandle(event: EventInterface, context: EventContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.afterHandle) {
        try {
          await middleware.afterHandle(event, context);
        } catch (error) {
          console.error(`Middleware ${middleware.name} afterHandle error:`, error);
          // Continue with next middleware
        }
      }
    }
  }

  /**
   * Execute handle error middleware chain
   */
  async executeOnHandleError(error: Error, event: EventInterface, context: EventContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.onHandleError) {
        try {
          await middleware.onHandleError(error, event, context);
        } catch (middlewareError) {
          console.error(`Middleware ${middleware.name} onHandleError error:`, middlewareError);
          // Continue with next middleware
        }
      }
    }
  }

  /**
   * Get all middleware in the chain
   */
  getMiddleware(): EventMiddlewareInterface[] {
    return [...this.middleware];
  }

  /**
   * Clear all middleware from the chain
   */
  clear(): void {
    this.middleware = [];
  }
}

/**
 * Event middleware chain factory
 */
export class EventMiddlewareChainFactory {
  /**
   * Create a new middleware chain
   */
  static create(): EventMiddlewareChain {
    return new MemoryEventMiddlewareChain();
  }

  /**
   * Create middleware chain with default middleware
   */
  static createWithDefaults(): EventMiddlewareChain {
    const chain = new MemoryEventMiddlewareChain();
    
    // TODO: Add default middleware (logging, metrics, etc.)
    
    return chain;
  }
}
