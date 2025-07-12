/**
 * @fileoverview Hooks system interfaces
 * @module tsfox/core/plugins/hooks.interfaces
 */

// ============================================================================
// TYPE IMPORTS
// ============================================================================

/**
 * Hook handler function
 */
export type HookHandler = (...args: any[]) => any | Promise<any>;

/**
 * Hook options
 */
export interface HookOptions {
  /** Handler priority (higher = earlier execution) */
  priority?: number;
  
  /** Whether handler should run once */
  once?: boolean;
  
  /** Handler context */
  context?: any;
}

// ============================================================================
// HOOKS SYSTEM INTERFACES
// ============================================================================

/**
 * Hook execution context
 */
export interface HookContext {
  /** Hook name */
  name: string;
  
  /** Original arguments */
  args: any[];
  
  /** Current value being processed */
  value?: any;
  
  /** Hook metadata */
  metadata: {
    /** Execution order */
    order: number;
    
    /** Total handlers */
    total: number;
    
    /** Current handler index */
    current: number;
    
    /** Execution start time */
    startTime: number;
  };
  
  /** Stop further execution */
  stop(): void;
  
  /** Skip current handler */
  skip(): void;
  
  /** Get execution statistics */
  getStats(): HookExecutionStats;
}

/**
 * Hook execution statistics
 */
export interface HookExecutionStats {
  /** Total execution time */
  totalTime: number;
  
  /** Number of handlers executed */
  handlersExecuted: number;
  
  /** Number of handlers skipped */
  handlersSkipped: number;
  
  /** Number of errors */
  errors: number;
  
  /** Execution details per handler */
  handlerStats: HookHandlerStats[];
}

/**
 * Hook handler execution statistics
 */
export interface HookHandlerStats {
  /** Handler function name */
  name: string;
  
  /** Handler plugin source */
  plugin: string;
  
  /** Execution time */
  executionTime: number;
  
  /** Handler priority */
  priority: number;
  
  /** Whether handler was skipped */
  skipped: boolean;
  
  /** Error information if any */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Hook registration info
 */
export interface HookRegistration {
  /** Hook name */
  hook: string;
  
  /** Handler function */
  handler: HookHandler;
  
  /** Plugin that registered the handler */
  plugin: string;
  
  /** Registration options */
  options: HookOptions;
  
  /** Registration timestamp */
  registeredAt: number;
  
  /** Handler ID */
  id: string;
}

/**
 * Hook definition for pre-defined hooks
 */
export interface HookDefinition {
  /** Hook name */
  name: string;
  
  /** Hook description */
  description: string;
  
  /** Expected arguments */
  args: HookArgument[];
  
  /** Expected return type */
  returnType?: HookReturnType;
  
  /** Hook category */
  category: HookCategory;
  
  /** Whether hook is async */
  async: boolean;
  
  /** Execution mode */
  mode: HookExecutionMode;
  
  /** Hook version */
  version: string;
  
  /** Hook deprecation info */
  deprecated?: {
    since: string;
    replacement?: string;
    message: string;
  };
}

/**
 * Hook argument definition
 */
export interface HookArgument {
  /** Argument name */
  name: string;
  
  /** Argument type */
  type: string;
  
  /** Argument description */
  description: string;
  
  /** Whether argument is optional */
  optional?: boolean;
  
  /** Default value */
  default?: any;
}

/**
 * Hook return type definition
 */
export interface HookReturnType {
  /** Return type */
  type: string;
  
  /** Return description */
  description: string;
  
  /** Whether return is optional */
  optional?: boolean;
}

/**
 * Hook categories
 */
export type HookCategory = 
  | 'lifecycle'      // Application lifecycle
  | 'request'        // Request processing
  | 'response'       // Response processing
  | 'routing'        // Route handling
  | 'middleware'     // Middleware execution
  | 'error'          // Error handling
  | 'validation'     // Data validation
  | 'authentication' // Authentication
  | 'authorization'  // Authorization
  | 'logging'        // Logging system
  | 'cache'          // Cache operations
  | 'database'       // Database operations
  | 'plugin'         // Plugin system
  | 'template'       // Template rendering
  | 'security'       // Security operations
  | 'performance'    // Performance hooks
  | 'custom';        // Custom hooks

/**
 * Hook execution modes
 */
export type HookExecutionMode = 
  | 'waterfall'   // Each handler gets result of previous
  | 'parallel'    // All handlers execute in parallel
  | 'sequential'  // Handlers execute in sequence but independently
  | 'filter'      // Filter out falsy results
  | 'reduce'      // Reduce results to single value
  | 'first'       // Return first truthy result
  | 'bail';       // Stop on first error

/**
 * Pre-defined framework hooks
 */
export enum FrameworkHooks {
  // Application Lifecycle
  APP_BEFORE_INIT = 'app:before-init',
  APP_AFTER_INIT = 'app:after-init',
  APP_BEFORE_START = 'app:before-start',
  APP_AFTER_START = 'app:after-start',
  APP_BEFORE_STOP = 'app:before-stop',
  APP_AFTER_STOP = 'app:after-stop',
  
  // Request Lifecycle
  REQUEST_BEFORE_PARSE = 'request:before-parse',
  REQUEST_AFTER_PARSE = 'request:after-parse',
  REQUEST_BEFORE_ROUTE = 'request:before-route',
  REQUEST_AFTER_ROUTE = 'request:after-route',
  REQUEST_BEFORE_MIDDLEWARE = 'request:before-middleware',
  REQUEST_AFTER_MIDDLEWARE = 'request:after-middleware',
  REQUEST_BEFORE_HANDLER = 'request:before-handler',
  REQUEST_AFTER_HANDLER = 'request:after-handler',
  
  // Response Lifecycle
  RESPONSE_BEFORE_SEND = 'response:before-send',
  RESPONSE_AFTER_SEND = 'response:after-send',
  RESPONSE_BEFORE_RENDER = 'response:before-render',
  RESPONSE_AFTER_RENDER = 'response:after-render',
  
  // Error Handling
  ERROR_BEFORE_HANDLE = 'error:before-handle',
  ERROR_AFTER_HANDLE = 'error:after-handle',
  ERROR_BEFORE_LOG = 'error:before-log',
  ERROR_AFTER_LOG = 'error:after-log',
  
  // Plugin System
  PLUGIN_BEFORE_LOAD = 'plugin:before-load',
  PLUGIN_AFTER_LOAD = 'plugin:after-load',
  PLUGIN_BEFORE_INIT = 'plugin:before-init',
  PLUGIN_AFTER_INIT = 'plugin:after-init',
  PLUGIN_BEFORE_DESTROY = 'plugin:before-destroy',
  PLUGIN_AFTER_DESTROY = 'plugin:after-destroy',
  
  // Configuration
  CONFIG_BEFORE_LOAD = 'config:before-load',
  CONFIG_AFTER_LOAD = 'config:after-load',
  CONFIG_BEFORE_VALIDATE = 'config:before-validate',
  CONFIG_AFTER_VALIDATE = 'config:after-validate',
  
  // Security
  SECURITY_BEFORE_AUTH = 'security:before-auth',
  SECURITY_AFTER_AUTH = 'security:after-auth',
  SECURITY_BEFORE_AUTHORIZE = 'security:before-authorize',
  SECURITY_AFTER_AUTHORIZE = 'security:after-authorize',
  
  // Performance
  PERFORMANCE_BEFORE_MEASURE = 'performance:before-measure',
  PERFORMANCE_AFTER_MEASURE = 'performance:after-measure',
  
  // Cache
  CACHE_BEFORE_GET = 'cache:before-get',
  CACHE_AFTER_GET = 'cache:after-get',
  CACHE_BEFORE_SET = 'cache:before-set',
  CACHE_AFTER_SET = 'cache:after-set',
  CACHE_BEFORE_DELETE = 'cache:before-delete',
  CACHE_AFTER_DELETE = 'cache:after-delete',
}

/**
 * Hook filter interface for advanced filtering
 */
export interface IHookFilter {
  /** Filter name */
  name: string;
  
  /** Filter function */
  filter: (context: HookContext) => boolean;
  
  /** Filter description */
  description?: string;
}

/**
 * Hook middleware for processing hook execution
 */
export interface IHookMiddleware {
  /** Middleware name */
  name: string;
  
  /** Execute middleware */
  execute: (context: HookContext, next: () => Promise<any>) => Promise<any>;
  
  /** Middleware priority */
  priority?: number;
}

/**
 * Conditional hook execution
 */
export interface ConditionalHook {
  /** Hook name */
  hook: string;
  
  /** Condition function */
  condition: (context: HookContext) => boolean;
  
  /** Handler to execute if condition is true */
  handler: HookHandler;
  
  /** Handler to execute if condition is false */
  elseHandler?: HookHandler;
  
  /** Condition description */
  description?: string;
}

/**
 * Hook batching for grouped execution
 */
export interface HookBatch {
  /** Batch name */
  name: string;
  
  /** Hooks to execute */
  hooks: {
    hook: string;
    args: any[];
  }[];
  
  /** Execution mode */
  mode: 'parallel' | 'sequential';
  
  /** Batch timeout */
  timeout?: number;
  
  /** Error handling mode */
  errorMode: 'fail-fast' | 'continue' | 'collect';
}

/**
 * Hook performance monitoring
 */
export interface HookPerformanceMonitor {
  /** Start monitoring */
  startMonitoring(hook: string): void;
  
  /** Stop monitoring */
  stopMonitoring(hook: string): void;
  
  /** Get performance metrics */
  getMetrics(hook: string): HookPerformanceMetrics;
  
  /** Get all metrics */
  getAllMetrics(): Map<string, HookPerformanceMetrics>;
  
  /** Reset metrics */
  resetMetrics(hook?: string): void;
}

/**
 * Hook performance metrics
 */
export interface HookPerformanceMetrics {
  /** Hook name */
  hook: string;
  
  /** Total executions */
  executions: number;
  
  /** Average execution time */
  averageTime: number;
  
  /** Minimum execution time */
  minTime: number;
  
  /** Maximum execution time */
  maxTime: number;
  
  /** Total execution time */
  totalTime: number;
  
  /** Error count */
  errors: number;
  
  /** Last execution time */
  lastExecution: number;
  
  /** Execution trend */
  trend: 'improving' | 'degrading' | 'stable';
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export for compatibility with main interfaces
// Note: Types are already defined above
