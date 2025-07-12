/**
 * @fileoverview Events system interfaces
 * @module tsfox/core/plugins/events.interfaces
 */

// ============================================================================
// EVENT SYSTEM INTERFACES
// ============================================================================

/**
 * Event handler function
 */
export type EventHandler = (event: PluginEvent) => void | Promise<void>;

/**
 * Plugin event
 */
export interface PluginEvent {
  /** Event type */
  type: string;
  
  /** Event source plugin */
  source: string;
  
  /** Event data */
  data?: any;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Event ID */
  id: string;
  
  /** Event metadata */
  metadata?: {
    [key: string]: any;
  };
  
  /** Event priority */
  priority?: EventPriority;
  
  /** Event namespace */
  namespace?: string;
  
  /** Event version */
  version?: string;
  
  /** Whether event can be cancelled */
  cancellable?: boolean;
  
  /** Whether event is cancelled */
  cancelled?: boolean;
  
  /** Cancel the event */
  cancel?(): void;
  
  /** Prevent default behavior */
  preventDefault?(): void;
  
  /** Stop event propagation */
  stopPropagation?(): void;
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOWEST = 1,
  LOW = 25,
  NORMAL = 50,
  HIGH = 75,
  HIGHEST = 100,
  CRITICAL = 200
}

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  /** Event priority */
  priority?: EventPriority;
  
  /** Whether to subscribe once */
  once?: boolean;
  
  /** Event namespace filter */
  namespace?: string;
  
  /** Event version filter */
  version?: string;
  
  /** Condition function */
  condition?: (event: PluginEvent) => boolean;
  
  /** Subscription context */
  context?: any;
  
  /** Timeout for async handlers */
  timeout?: number;
  
  /** Error handling strategy */
  errorHandling?: EventErrorHandling;
}

/**
 * Event error handling strategies
 */
export type EventErrorHandling = 
  | 'ignore'        // Ignore errors
  | 'log'          // Log errors
  | 'throw'        // Throw errors
  | 'retry'        // Retry handler
  | 'circuit-break'; // Circuit breaker pattern

/**
 * Event subscription info
 */
export interface EventSubscription {
  /** Event name */
  event: string;
  
  /** Handler function */
  handler: EventHandler;
  
  /** Subscription options */
  options: EventSubscriptionOptions;
  
  /** Plugin that subscribed */
  plugin: string;
  
  /** Subscription ID */
  id: string;
  
  /** Subscription timestamp */
  subscribedAt: number;
  
  /** Handler stats */
  stats: EventHandlerStats;
}

/**
 * Event handler statistics
 */
export interface EventHandlerStats {
  /** Total invocations */
  invocations: number;
  
  /** Successful executions */
  successes: number;
  
  /** Failed executions */
  failures: number;
  
  /** Average execution time */
  averageTime: number;
  
  /** Last execution timestamp */
  lastExecution: number;
  
  /** Error details */
  errors: EventHandlerError[];
}

/**
 * Event handler error
 */
export interface EventHandlerError {
  /** Error message */
  message: string;
  
  /** Error stack */
  stack?: string;
  
  /** Error timestamp */
  timestamp: number;
  
  /** Event that caused error */
  event: PluginEvent;
}

/**
 * Event filter interface
 */
export interface IEventFilter {
  /** Filter name */
  name: string;
  
  /** Filter function */
  filter: (event: PluginEvent) => boolean;
  
  /** Filter description */
  description?: string;
  
  /** Filter priority */
  priority?: number;
}

/**
 * Event middleware for processing events
 */
export interface IEventMiddleware {
  /** Middleware name */
  name: string;
  
  /** Process event */
  process: (event: PluginEvent, next: () => Promise<void>) => Promise<void>;
  
  /** Middleware priority */
  priority?: number;
  
  /** Middleware context */
  context?: any;
}

/**
 * Event emitter options
 */
export interface EventEmitterOptions {
  /** Whether to emit async */
  async?: boolean;
  
  /** Event namespace */
  namespace?: string;
  
  /** Event version */
  version?: string;
  
  /** Event priority */
  priority?: EventPriority;
  
  /** Event timeout */
  timeout?: number;
  
  /** Whether event is cancellable */
  cancellable?: boolean;
  
  /** Event metadata */
  metadata?: {
    [key: string]: any;
  };
  
  /** Retry options */
  retry?: EventRetryOptions;
}

/**
 * Event retry options
 */
export interface EventRetryOptions {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Delay between retries */
  delay: number;
  
  /** Backoff strategy */
  backoff: 'fixed' | 'exponential' | 'linear';
  
  /** Maximum delay */
  maxDelay?: number;
  
  /** Jitter */
  jitter?: boolean;
}

/**
 * Event batch for grouped emission
 */
export interface EventBatch {
  /** Batch name */
  name: string;
  
  /** Events to emit */
  events: {
    type: string;
    data?: any;
    options?: EventEmitterOptions;
  }[];
  
  /** Batch options */
  options: {
    /** Execution mode */
    mode: 'parallel' | 'sequential';
    
    /** Batch timeout */
    timeout?: number;
    
    /** Error handling */
    errorHandling: EventErrorHandling;
    
    /** Stop on first error */
    failFast?: boolean;
  };
}

/**
 * Event metrics
 */
export interface EventMetrics {
  /** Event type */
  type: string;
  
  /** Total emissions */
  emissions: number;
  
  /** Total subscriptions */
  subscriptions: number;
  
  /** Active subscriptions */
  activeSubscriptions: number;
  
  /** Average handler execution time */
  averageHandlerTime: number;
  
  /** Total handler executions */
  handlerExecutions: number;
  
  /** Handler failures */
  handlerFailures: number;
  
  /** Last emission timestamp */
  lastEmission: number;
  
  /** Event throughput */
  throughput: {
    perSecond: number;
    perMinute: number;
    perHour: number;
  };
}

/**
 * Event store interface for event persistence
 */
export interface IEventStore {
  /** Store an event */
  store(event: PluginEvent): Promise<void>;
  
  /** Retrieve events */
  retrieve(criteria: EventStoreCriteria): Promise<PluginEvent[]>;
  
  /** Count events */
  count(criteria: EventStoreCriteria): Promise<number>;
  
  /** Delete events */
  delete(criteria: EventStoreCriteria): Promise<number>;
  
  /** Get event by ID */
  getById(id: string): Promise<PluginEvent | undefined>;
  
  /** Stream events */
  stream(criteria: EventStoreCriteria): AsyncIterable<PluginEvent>;
}

/**
 * Event store criteria
 */
export interface EventStoreCriteria {
  /** Event type filter */
  type?: string;
  
  /** Source plugin filter */
  source?: string;
  
  /** Namespace filter */
  namespace?: string;
  
  /** Time range */
  timeRange?: {
    from: number;
    to: number;
  };
  
  /** Event IDs */
  ids?: string[];
  
  /** Limit results */
  limit?: number;
  
  /** Skip results */
  skip?: number;
  
  /** Sort order */
  sort?: {
    field: 'timestamp' | 'type' | 'source';
    order: 'asc' | 'desc';
  };
}

/**
 * Event aggregation interface
 */
export interface IEventAggregator {
  /** Aggregate events */
  aggregate(criteria: EventAggregationCriteria): Promise<EventAggregationResult>;
  
  /** Get aggregation rules */
  getRules(): EventAggregationRule[];
  
  /** Add aggregation rule */
  addRule(rule: EventAggregationRule): void;
  
  /** Remove aggregation rule */
  removeRule(name: string): void;
}

/**
 * Event aggregation criteria
 */
export interface EventAggregationCriteria {
  /** Aggregation rule name */
  rule: string;
  
  /** Event filter */
  filter?: EventStoreCriteria;
  
  /** Aggregation window */
  window?: {
    size: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  
  /** Group by fields */
  groupBy?: string[];
}

/**
 * Event aggregation rule
 */
export interface EventAggregationRule {
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Aggregation function */
  aggregator: EventAggregator;
  
  /** Event selector */
  selector: (event: PluginEvent) => boolean;
  
  /** Grouping function */
  grouper?: (event: PluginEvent) => string;
  
  /** Rule options */
  options?: {
    /** Window size */
    windowSize?: number;
    
    /** Update interval */
    updateInterval?: number;
    
    /** Maximum entries */
    maxEntries?: number;
  };
}

/**
 * Event aggregator function
 */
export type EventAggregator = (events: PluginEvent[]) => EventAggregationResult;

/**
 * Event aggregation result
 */
export interface EventAggregationResult {
  /** Aggregation type */
  type: string;
  
  /** Result data */
  data: any;
  
  /** Event count */
  eventCount: number;
  
  /** Time range */
  timeRange: {
    from: number;
    to: number;
  };
  
  /** Aggregation timestamp */
  timestamp: number;
  
  /** Metadata */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Pre-defined framework events
 */
export enum FrameworkEvents {
  // Application Events
  APP_STARTING = 'app:starting',
  APP_STARTED = 'app:started',
  APP_STOPPING = 'app:stopping',
  APP_STOPPED = 'app:stopped',
  APP_ERROR = 'app:error',
  
  // Request Events
  REQUEST_RECEIVED = 'request:received',
  REQUEST_PROCESSED = 'request:processed',
  REQUEST_ERROR = 'request:error',
  REQUEST_TIMEOUT = 'request:timeout',
  
  // Response Events
  RESPONSE_SENT = 'response:sent',
  RESPONSE_ERROR = 'response:error',
  
  // Plugin Events
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_INITIALIZED = 'plugin:initialized',
  PLUGIN_DESTROYED = 'plugin:destroyed',
  PLUGIN_ERROR = 'plugin:error',
  PLUGIN_ENABLED = 'plugin:enabled',
  PLUGIN_DISABLED = 'plugin:disabled',
  
  // Configuration Events
  CONFIG_LOADED = 'config:loaded',
  CONFIG_CHANGED = 'config:changed',
  CONFIG_ERROR = 'config:error',
  
  // Security Events
  AUTH_SUCCESS = 'auth:success',
  AUTH_FAILURE = 'auth:failure',
  AUTH_TIMEOUT = 'auth:timeout',
  AUTHZ_GRANTED = 'authz:granted',
  AUTHZ_DENIED = 'authz:denied',
  
  // Performance Events
  PERFORMANCE_BASELINE = 'performance:baseline',
  PERFORMANCE_DEGRADATION = 'performance:degradation',
  PERFORMANCE_IMPROVEMENT = 'performance:improvement',
  
  // Error Events
  ERROR_HANDLED = 'error:handled',
  ERROR_UNHANDLED = 'error:unhandled',
  ERROR_CRITICAL = 'error:critical',
  
  // Cache Events
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  CACHE_INVALIDATED = 'cache:invalidated',
  CACHE_ERROR = 'cache:error',
  
  // Health Events
  HEALTH_CHECK_PASSED = 'health:check-passed',
  HEALTH_CHECK_FAILED = 'health:check-failed',
  HEALTH_DEGRADED = 'health:degraded',
  HEALTH_RECOVERED = 'health:recovered',
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export for compatibility with main interfaces
// Note: Types are already defined above
