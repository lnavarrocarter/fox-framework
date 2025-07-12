/**
 * @fileoverview Core plugin system interfaces
 * @module tsfox/core/plugins/interfaces
 */

// ============================================================================
// CORE PLUGIN INTERFACES
// ============================================================================

/**
 * Main plugin interface that all plugins must implement
 */
export interface IPlugin {
  /** Unique plugin identifier */
  readonly name: string;
  
  /** Semantic version of the plugin */
  readonly version: string;
  
  /** Plugin description */
  readonly description?: string;
  
  /** Plugin dependencies */
  readonly dependencies?: PluginDependency[];
  
  /** Required permissions */
  readonly permissions?: PluginPermission[];
  
  /** Plugin metadata */
  readonly metadata?: PluginMetadata;

  /** Initialize the plugin */
  initialize?(context: PluginContext): Promise<void> | void;
  
  /** Configure the plugin */
  configure?(config: PluginConfig): Promise<void> | void;
  
  /** Cleanup when plugin is destroyed */
  destroy?(): Promise<void> | void;
  
  /** Handle lifecycle hooks */
  onHook?(hook: string, ...args: any[]): Promise<any> | any;
  
  /** Handle events */
  onEvent?(event: PluginEvent): Promise<void> | void;
  
  /** Health check for the plugin */
  healthCheck?(): Promise<PluginHealthStatus> | PluginHealthStatus;
}

/**
 * Plugin execution context provided to plugins
 */
export interface PluginContext {
  /** Main application instance */
  app: any; // Will be FoxApplication when available
  
  /** Plugin-specific logger */
  logger: any; // Will be LoggerInterface when available
  
  /** Plugin configuration */
  config: PluginConfig;
  
  /** Hooks manager for registering hooks */
  hooks: IHooksManager;
  
  /** Events manager for pub/sub */
  events: IEventsManager;
  
  /** Service container for dependency injection */
  services: IServiceContainer;
  
  /** Plugin utilities */
  utils: PluginUtils;
}

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  /** Plugin name (must be unique) */
  name: string;
  
  /** Semantic version */
  version: string;
  
  /** Description of the plugin */
  description: string;
  
  /** Plugin author */
  author: string;
  
  /** License type */
  license: string;
  
  /** Main entry file */
  main: string;
  
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
  
  /** Required permissions */
  permissions?: PluginPermission[];
  
  /** Supported hooks */
  hooks?: string[];
  
  /** Events this plugin emits/listens to */
  events?: string[];
  
  /** Configuration schema */
  config?: PluginConfigSchema;
  
  /** Compatible framework versions */
  frameworkVersion?: string;
  
  /** Plugin keywords for discovery */
  keywords?: string[];
  
  /** Plugin homepage URL */
  homepage?: string;
  
  /** Bug tracker URL */
  bugs?: string;
  
  /** Repository information */
  repository?: {
    type: string;
    url: string;
  };
  
  /** Plugin metadata */
  metadata?: PluginMetadata;
}

/**
 * Plugin dependency specification
 */
export interface PluginDependency {
  /** Dependency name */
  name: string;
  
  /** Required version range */
  version: string;
  
  /** Whether dependency is optional */
  optional?: boolean;
  
  /** Dependency type */
  type?: 'plugin' | 'npm' | 'framework';
}

/**
 * Plugin permission specification
 */
export interface PluginPermission {
  /** Permission type */
  type: PluginPermissionType;
  
  /** Permission description */
  description: string;
  
  /** Permission scope */
  scope?: string[];
  
  /** Whether permission is required */
  required?: boolean;
}

/**
 * Plugin permission types
 */
export type PluginPermissionType = 
  | 'filesystem'     // File system access
  | 'network'        // Network access
  | 'database'       // Database access
  | 'environment'    // Environment variables
  | 'process'        // Process management
  | 'hooks'          // Hook registration
  | 'events'         // Event system
  | 'config'         // Configuration access
  | 'logging'        // Logging system
  | 'cache'          // Cache system
  | 'security'       // Security features
  | 'admin';         // Administrative functions

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Plugin-specific configuration */
  [key: string]: any;
  
  /** Whether plugin is enabled */
  enabled?: boolean;
  
  /** Plugin environment */
  environment?: 'development' | 'production' | 'test';
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  /** Schema properties */
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description?: string;
      default?: any;
      required?: boolean;
      enum?: any[];
      minimum?: number;
      maximum?: number;
      pattern?: string;
    };
  };
  
  /** Required properties */
  required?: string[];
  
  /** Additional properties allowed */
  additionalProperties?: boolean;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin category */
  category?: PluginCategory;
  
  /** Plugin tags */
  tags?: string[];
  
  /** Plugin icon */
  icon?: string;
  
  /** Plugin screenshots */
  screenshots?: string[];
  
  /** Installation instructions */
  installation?: string;
  
  /** Usage examples */
  examples?: string[];
  
  /** Changelog */
  changelog?: string;
}

/**
 * Plugin categories
 */
export type PluginCategory = 
  | 'authentication'
  | 'authorization'
  | 'database'
  | 'caching'
  | 'logging'
  | 'monitoring'
  | 'security'
  | 'performance'
  | 'validation'
  | 'middleware'
  | 'templating'
  | 'routing'
  | 'testing'
  | 'deployment'
  | 'integration'
  | 'utility'
  | 'development'
  | 'other';

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Health check timestamp */
  timestamp: number;
  
  /** Health details */
  details?: {
    [key: string]: any;
  };
  
  /** Error information if unhealthy */
  error?: {
    message: string;
    stack?: string;
  };
}

// ============================================================================
// PLUGIN REGISTRY INTERFACES
// ============================================================================

/**
 * Plugin registry interface
 */
export interface IPluginRegistry {
  /** Register a plugin */
  register(plugin: IPlugin, manifest: PluginManifest): Promise<void>;
  
  /** Unregister a plugin */
  unregister(name: string): Promise<void>;
  
  /** Get a registered plugin */
  get(name: string): IPlugin | undefined;
  
  /** Get all registered plugins */
  getAll(): IPlugin[];
  
  /** Check if plugin is registered */
  has(name: string): boolean;
  
  /** Find plugins by criteria */
  find(criteria: PluginSearchCriteria): IPlugin[];
  
  /** Get plugin manifest */
  getManifest(name: string): PluginManifest | undefined;
  
  /** Validate plugin */
  validate(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult>;
  
  /** Get plugin dependencies */
  getDependencies(name: string): PluginDependency[];
  
  /** Check dependency resolution */
  resolveDependencies(plugins: string[]): Promise<string[]>;
}

/**
 * Plugin search criteria
 */
export interface PluginSearchCriteria {
  /** Plugin name pattern */
  name?: string;
  
  /** Plugin category */
  category?: PluginCategory;
  
  /** Plugin tags */
  tags?: string[];
  
  /** Author name */
  author?: string;
  
  /** Version range */
  version?: string;
  
  /** Whether plugin is enabled */
  enabled?: boolean;
  
  /** Plugin status */
  status?: PluginStatus;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  /** Whether plugin is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: PluginValidationError[];
  
  /** Validation warnings */
  warnings: PluginValidationWarning[];
}

/**
 * Plugin validation error
 */
export interface PluginValidationError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error context */
  context?: any;
}

/**
 * Plugin validation warning
 */
export interface PluginValidationWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Warning context */
  context?: any;
}

/**
 * Plugin status
 */
export type PluginStatus = 
  | 'registered'
  | 'initializing'
  | 'initialized'
  | 'configuring'
  | 'configured'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'disabled';

// ============================================================================
// HOOKS SYSTEM INTERFACES
// ============================================================================

/**
 * Hooks manager interface
 */
export interface IHooksManager {
  /** Register a hook handler */
  register(hook: string, handler: HookHandler, options?: HookOptions): void;
  
  /** Unregister a hook handler */
  unregister(hook: string, handler: HookHandler): void;
  
  /** Execute a hook */
  execute<T = any>(hook: string, ...args: any[]): Promise<T[]>;
  
  /** Execute hook with early termination */
  executeUntil<T = any>(hook: string, condition: (result: T) => boolean, ...args: any[]): Promise<T | undefined>;
  
  /** Execute hook and reduce results */
  executeReduce<T = any>(hook: string, reducer: (acc: T, current: T) => T, initial: T, ...args: any[]): Promise<T>;
  
  /** Get registered hooks */
  getHooks(): string[];
  
  /** Get handlers for a hook */
  getHandlers(hook: string): HookHandler[];
  
  /** Check if hook exists */
  hasHook(hook: string): boolean;
  
  /** Clear all handlers for a hook */
  clear(hook: string): void;
  
  /** Clear all hooks */
  clearAll(): void;
}

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
// EVENTS SYSTEM INTERFACES
// ============================================================================

/**
 * Events manager interface
 */
export interface IEventsManager {
  /** Subscribe to an event */
  on(event: string, handler: EventHandler): void;
  
  /** Subscribe to an event once */
  once(event: string, handler: EventHandler): void;
  
  /** Unsubscribe from an event */
  off(event: string, handler?: EventHandler): void;
  
  /** Emit an event */
  emit(event: string, data?: any): void;
  
  /** Emit an event asynchronously */
  emitAsync(event: string, data?: any): Promise<void>;
  
  /** Get event listeners */
  listeners(event: string): EventHandler[];
  
  /** Get all events */
  eventNames(): string[];
  
  /** Clear all listeners for an event */
  removeAllListeners(event?: string): void;
}

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
}

// ============================================================================
// SERVICE CONTAINER INTERFACES
// ============================================================================

/**
 * Service container interface
 */
export interface IServiceContainer {
  /** Register a service */
  register<T>(name: string, factory: ServiceFactory<T>, options?: ServiceOptions): void;
  
  /** Get a service */
  get<T>(name: string): T;
  
  /** Check if service exists */
  has(name: string): boolean;
  
  /** Resolve service dependencies */
  resolve<T>(factory: ServiceFactory<T>): T;
  
  /** Create child container */
  createChild(): IServiceContainer;
}

/**
 * Service factory function
 */
export type ServiceFactory<T> = (container: IServiceContainer) => T;

/**
 * Service options
 */
export interface ServiceOptions {
  /** Service lifetime */
  lifetime?: 'singleton' | 'transient' | 'scoped';
  
  /** Service dependencies */
  dependencies?: string[];
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Plugin utilities
 */
export interface PluginUtils {
  /** Path utilities */
  path: {
    resolve: (path: string) => string;
    join: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string) => string;
  };
  
  /** File system utilities */
  fs: {
    exists: (path: string) => Promise<boolean>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    mkdir: (path: string) => Promise<void>;
  };
  
  /** HTTP utilities */
  http: {
    get: (url: string) => Promise<any>;
    post: (url: string, data: any) => Promise<any>;
  };
  
  /** Validation utilities */
  validate: {
    schema: (data: any, schema: any) => boolean;
    semver: (version: string) => boolean;
  };
  
  /** Crypto utilities */
  crypto: {
    hash: (data: string) => string;
    uuid: () => string;
  };
}

// ============================================================================
// LOADER INTERFACES
// ============================================================================

/**
 * Plugin loader interface
 */
export interface IPluginLoader {
  /** Load a plugin from path */
  load(path: string): Promise<LoadedPlugin>;
  
  /** Unload a plugin */
  unload(name: string): Promise<void>;
  
  /** Reload a plugin */
  reload(name: string): Promise<LoadedPlugin>;
  
  /** Get loaded plugin */
  getLoaded(name: string): LoadedPlugin | undefined;
  
  /** Get all loaded plugins */
  getAllLoaded(): LoadedPlugin[];
}

/**
 * Loaded plugin information
 */
export interface LoadedPlugin {
  /** Plugin instance */
  plugin: IPlugin;
  
  /** Plugin manifest */
  manifest: PluginManifest;
  
  /** Load path */
  path: string;
  
  /** Load timestamp */
  loadedAt: number;
  
  /** Plugin status */
  status: PluginStatus;
  
  /** Module reference (for hot reload) */
  module?: any;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Note: Hooks and Events interfaces will be imported separately when needed
