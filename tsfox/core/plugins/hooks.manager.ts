/**
 * @fileoverview Hooks manager implementation
 * @module tsfox/core/plugins/hooks.manager
 */

import { IHooksManager } from './interfaces';
import { 
  HookHandler, 
  HookOptions, 
  HookContext, 
  HookExecutionStats, 
  HookRegistration,
  HookDefinition,
  HookExecutionMode,
  IHookFilter,
  IHookMiddleware,
  HookPerformanceMonitor,
  HookPerformanceMetrics
} from './hooks.interfaces';

/**
 * Hook entry for internal management
 */
interface HookEntry {
  handler: HookHandler;
  options: HookOptions;
  plugin: string;
  id: string;
  registeredAt: number;
  stats: {
    invocations: number;
    totalTime: number;
    errors: number;
    lastExecution: number;
  };
}

/**
 * Hooks manager implementation
 */
export class HooksManager implements IHooksManager {
  private hooks: Map<string, HookEntry[]> = new Map();
  private definitions: Map<string, HookDefinition> = new Map();
  private filters: Map<string, IHookFilter> = new Map();
  private middleware: IHookMiddleware[] = [];
  private monitor: HookPerformanceMonitor;
  private nextId = 0;

  constructor(performanceOptions?: any) {
    this.monitor = new DefaultHookPerformanceMonitor();
    
    if (performanceOptions?.monitoring) {
      this.enablePerformanceMonitoring();
    }
  }

  /**
   * Register a hook handler
   */
  register(hook: string, handler: HookHandler, options: HookOptions = {}): void {
    const id = this.generateId();
    const entry: HookEntry = {
      handler,
      options: {
        priority: 50,
        once: false,
        ...options
      },
      plugin: options.context?.plugin || 'unknown',
      id,
      registeredAt: Date.now(),
      stats: {
        invocations: 0,
        totalTime: 0,
        errors: 0,
        lastExecution: 0
      }
    };

    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }

    const handlers = this.hooks.get(hook)!;
    handlers.push(entry);

    // Sort by priority (higher priority first)
    handlers.sort((a, b) => (b.options.priority || 50) - (a.options.priority || 50));
  }

  /**
   * Unregister a hook handler
   */
  unregister(hook: string, handler: HookHandler): void {
    const handlers = this.hooks.get(hook);
    if (!handlers) return;

    const index = handlers.findIndex(entry => entry.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      
      if (handlers.length === 0) {
        this.hooks.delete(hook);
      }
    }
  }

  /**
   * Execute a hook
   */
  async execute<T = any>(hook: string, ...args: any[]): Promise<T[]> {
    const handlers = this.hooks.get(hook);
    if (!handlers || handlers.length === 0) {
      return [];
    }

    const context = this.createHookContext(hook, args, handlers.length);
    const results: T[] = [];

    try {
      // Apply middleware
      for (const middleware of this.middleware) {
        await middleware.execute(context, async () => {});
      }

      // Execute handlers
      for (let i = 0; i < handlers.length; i++) {
        const entry = handlers[i];
        
        // Update context
        context.metadata.current = i;
        
        // Apply filters
        if (!this.shouldExecuteHandler(hook, entry, context)) {
          continue;
        }

        try {
          const startTime = performance.now();
          
          // Execute handler
          const result = await this.executeHandler(entry, context, args);
          
          const endTime = performance.now();
          const executionTime = endTime - startTime;
          
          // Update statistics
          this.updateHandlerStats(entry, executionTime, false);
          
          // Add result
          if (result !== undefined) {
            results.push(result);
          }

          // Handle once option
          if (entry.options.once) {
            this.unregister(hook, entry.handler);
          }

        } catch (error) {
          this.updateHandlerStats(entry, 0, true);
          
          // Log error but continue execution
          console.error(`Error in hook '${hook}' handler:`, error);
        }
      }

    } catch (error) {
      console.error(`Error executing hook '${hook}':`, error);
    }

    return results;
  }

  /**
   * Execute hook with early termination
   */
  async executeUntil<T = any>(
    hook: string, 
    condition: (result: T) => boolean, 
    ...args: any[]
  ): Promise<T | undefined> {
    const handlers = this.hooks.get(hook);
    if (!handlers || handlers.length === 0) {
      return undefined;
    }

    const context = this.createHookContext(hook, args, handlers.length);

    for (let i = 0; i < handlers.length; i++) {
      const entry = handlers[i];
      context.metadata.current = i;

      if (!this.shouldExecuteHandler(hook, entry, context)) {
        continue;
      }

      try {
        const startTime = performance.now();
        const result = await this.executeHandler(entry, context, args);
        const endTime = performance.now();
        
        this.updateHandlerStats(entry, endTime - startTime, false);

        if (result !== undefined && condition(result)) {
          return result;
        }

        if (entry.options.once) {
          this.unregister(hook, entry.handler);
        }

      } catch (error) {
        this.updateHandlerStats(entry, 0, true);
        console.error(`Error in hook '${hook}' handler:`, error);
      }
    }

    return undefined;
  }

  /**
   * Execute hook and reduce results
   */
  async executeReduce<T = any>(
    hook: string,
    reducer: (acc: T, current: T) => T,
    initial: T,
    ...args: any[]
  ): Promise<T> {
    const results = await this.execute<T>(hook, ...args);
    return results.reduce(reducer, initial);
  }

  /**
   * Get registered hooks
   */
  getHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get handlers for a hook
   */
  getHandlers(hook: string): HookHandler[] {
    const handlers = this.hooks.get(hook);
    return handlers ? handlers.map(entry => entry.handler) : [];
  }

  /**
   * Check if hook exists
   */
  hasHook(hook: string): boolean {
    return this.hooks.has(hook) && this.hooks.get(hook)!.length > 0;
  }

  /**
   * Clear all handlers for a hook
   */
  clear(hook: string): void {
    this.hooks.delete(hook);
  }

  /**
   * Clear all hooks
   */
  clearAll(): void {
    this.hooks.clear();
  }

  /**
   * Register a hook definition
   */
  defineHook(definition: HookDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /**
   * Get hook definition
   */
  getDefinition(hook: string): HookDefinition | undefined {
    return this.definitions.get(hook);
  }

  /**
   * Add hook filter
   */
  addFilter(filter: IHookFilter): void {
    this.filters.set(filter.name, filter);
  }

  /**
   * Remove hook filter
   */
  removeFilter(name: string): void {
    this.filters.delete(name);
  }

  /**
   * Add hook middleware
   */
  addMiddleware(middleware: IHookMiddleware): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => (b.priority || 50) - (a.priority || 50));
  }

  /**
   * Remove hook middleware
   */
  removeMiddleware(name: string): void {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * Get hook registrations
   */
  getRegistrations(hook?: string): HookRegistration[] {
    const registrations: HookRegistration[] = [];

    const processHook = (hookName: string, entries: HookEntry[]) => {
      for (const entry of entries) {
        registrations.push({
          hook: hookName,
          handler: entry.handler,
          plugin: entry.plugin,
          options: entry.options,
          registeredAt: entry.registeredAt,
          id: entry.id
        });
      }
    };

    if (hook) {
      const entries = this.hooks.get(hook);
      if (entries) {
        processHook(hook, entries);
      }
    } else {
      for (const [hookName, entries] of this.hooks) {
        processHook(hookName, entries);
      }
    }

    return registrations;
  }

  /**
   * Get hook statistics
   */
  getStats(hook?: string): Map<string, HookExecutionStats> {
    const stats = new Map<string, HookExecutionStats>();

    const processHook = (hookName: string, entries: HookEntry[]) => {
      const totalInvocations = entries.reduce((sum, e) => sum + e.stats.invocations, 0);
      const totalTime = entries.reduce((sum, e) => sum + e.stats.totalTime, 0);
      const totalErrors = entries.reduce((sum, e) => sum + e.stats.errors, 0);

      stats.set(hookName, {
        totalTime,
        handlersExecuted: entries.length,
        handlersSkipped: 0, // This would need tracking
        errors: totalErrors,
        handlerStats: entries.map(entry => ({
          name: entry.handler.name || 'anonymous',
          plugin: entry.plugin,
          executionTime: entry.stats.totalTime / Math.max(entry.stats.invocations, 1),
          priority: entry.options.priority || 50,
          skipped: false,
          error: entry.stats.errors > 0 ? { message: 'Handler had errors' } : undefined
        }))
      });
    };

    if (hook) {
      const entries = this.hooks.get(hook);
      if (entries) {
        processHook(hook, entries);
      }
    } else {
      for (const [hookName, entries] of this.hooks) {
        processHook(hookName, entries);
      }
    }

    return stats;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Map<string, HookPerformanceMetrics> {
    return this.monitor.getAllMetrics();
  }

  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring(): void {
    for (const hookName of this.hooks.keys()) {
      this.monitor.startMonitoring(hookName);
    }
  }

  /**
   * Disable performance monitoring
   */
  disablePerformanceMonitoring(): void {
    for (const hookName of this.hooks.keys()) {
      this.monitor.stopMonitoring(hookName);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Create hook execution context
   */
  private createHookContext(hook: string, args: any[], totalHandlers: number): HookContext {
    let stopped = false;
    let skipped = false;

    return {
      name: hook,
      args,
      value: undefined,
      metadata: {
        order: 0,
        total: totalHandlers,
        current: 0,
        startTime: Date.now()
      },
      stop: () => { stopped = true; },
      skip: () => { skipped = true; },
      getStats: () => ({
        totalTime: Date.now() - Date.now(), // Would need proper tracking
        handlersExecuted: 0,
        handlersSkipped: 0,
        errors: 0,
        handlerStats: []
      })
    };
  }

  /**
   * Check if handler should be executed
   */
  private shouldExecuteHandler(hook: string, entry: HookEntry, context: HookContext): boolean {
    // Apply filters
    for (const filter of this.filters.values()) {
      if (!filter.filter(context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single handler
   */
  private async executeHandler(entry: HookEntry, context: HookContext, args: any[]): Promise<any> {
    try {
      const result = await entry.handler(...args);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update handler statistics
   */
  private updateHandlerStats(entry: HookEntry, executionTime: number, hasError: boolean): void {
    entry.stats.invocations++;
    entry.stats.totalTime += executionTime;
    entry.stats.lastExecution = Date.now();
    
    if (hasError) {
      entry.stats.errors++;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `hook_${++this.nextId}_${Date.now()}`;
  }
}

/**
 * Default hook performance monitor implementation
 */
class DefaultHookPerformanceMonitor implements HookPerformanceMonitor {
  private metrics = new Map<string, HookPerformanceMetrics>();
  private monitoring = new Set<string>();

  startMonitoring(hook: string): void {
    this.monitoring.add(hook);
    if (!this.metrics.has(hook)) {
      this.metrics.set(hook, {
        hook,
        executions: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        totalTime: 0,
        errors: 0,
        lastExecution: 0,
        trend: 'stable'
      });
    }
  }

  stopMonitoring(hook: string): void {
    this.monitoring.delete(hook);
  }

  getMetrics(hook: string): HookPerformanceMetrics {
    return this.metrics.get(hook) || {
      hook,
      executions: 0,
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
      totalTime: 0,
      errors: 0,
      lastExecution: 0,
      trend: 'stable'
    };
  }

  getAllMetrics(): Map<string, HookPerformanceMetrics> {
    return new Map(this.metrics);
  }

  resetMetrics(hook?: string): void {
    if (hook) {
      this.metrics.delete(hook);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Update metrics for hook execution
   */
  updateMetrics(hook: string, executionTime: number, hasError: boolean): void {
    if (!this.monitoring.has(hook)) return;

    const metrics = this.getMetrics(hook);
    
    metrics.executions++;
    metrics.totalTime += executionTime;
    metrics.averageTime = metrics.totalTime / metrics.executions;
    metrics.minTime = Math.min(metrics.minTime, executionTime);
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);
    metrics.lastExecution = Date.now();
    
    if (hasError) {
      metrics.errors++;
    }

    // Simple trend calculation
    if (metrics.executions >= 10) {
      const recentAverage = executionTime;
      if (recentAverage < metrics.averageTime * 0.9) {
        metrics.trend = 'improving';
      } else if (recentAverage > metrics.averageTime * 1.1) {
        metrics.trend = 'degrading';
      } else {
        metrics.trend = 'stable';
      }
    }

    this.metrics.set(hook, metrics);
  }
}
