/**
 * @fileoverview Main plugin system factory
 * @module tsfox/core/plugins/factory
 */

import {
  IPlugin,
  IPluginRegistry,
  IHooksManager,
  IEventsManager,
  IServiceContainer,
  IPluginLoader,
  PluginManifest,
  PluginContext,
  PluginConfig,
  PluginSearchCriteria,
  PluginValidationResult,
  LoadedPlugin,
  PluginStatus,
  PluginUtils
} from './interfaces';

import { PluginRegistry } from './registry';
import { HooksManager } from './hooks.manager';
import { EventsManager } from './events.manager';
import { ServiceContainer } from './service.container';
import { PluginLoader } from './loader';
import { PluginValidator } from './validator';
import { PluginSecurity } from './security';
import { PluginUtils as Utils } from './utils';

/**
 * Plugin system factory options
 */
export interface PluginFactoryOptions {
  /** Enable security sandbox */
  security?: {
    enabled: boolean;
    sandbox?: boolean;
    permissions?: string[];
    isolation?: boolean;
  };
  
  /** Performance options */
  performance?: {
    monitoring: boolean;
    metrics: boolean;
    profiling: boolean;
  };
  
  /** Development options */
  development?: {
    hotReload: boolean;
    debugMode: boolean;
    validatePlugins: boolean;
  };
  
  /** Storage options */
  storage?: {
    persistEvents: boolean;
    eventStore?: string;
    cachePlugins: boolean;
  };
  
  /** Logging options */
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeStack: boolean;
    logEvents: boolean;
  };
}

/**
 * Plugin system statistics
 */
export interface PluginSystemStats {
  /** Total registered plugins */
  totalPlugins: number;
  
  /** Active plugins */
  activePlugins: number;
  
  /** Failed plugins */
  failedPlugins: number;
  
  /** Total hooks registered */
  totalHooks: number;
  
  /** Total event subscriptions */
  totalSubscriptions: number;
  
  /** System uptime */
  uptime: number;
  
  /** Memory usage */
  memoryUsage: {
    plugins: number;
    hooks: number;
    events: number;
    total: number;
  };
  
  /** Performance metrics */
  performance: {
    averagePluginLoadTime: number;
    averageHookExecutionTime: number;
    averageEventEmissionTime: number;
  };
}

/**
 * Main plugin system factory
 */
export class PluginFactory {
  private registry!: IPluginRegistry;
  private hooks!: IHooksManager;
  private events!: IEventsManager;
  private services!: IServiceContainer;
  private loader!: IPluginLoader;
  private validator!: PluginValidator;
  private security!: PluginSecurity;
  private utils!: PluginUtils;
  private options: PluginFactoryOptions;
  private initialized: boolean = false;
  private startTime: number;

  constructor(options: PluginFactoryOptions = {}) {
    this.options = this.mergeDefaultOptions(options);
    this.startTime = Date.now();
    
    this.initializeComponents();
  }

  /**
   * Initialize plugin system components
   */
  private initializeComponents(): void {
    // Initialize core components
    this.registry = new PluginRegistry();
    this.hooks = new HooksManager(this.options.performance);
    this.events = new EventsManager(this.options.storage);
    this.services = new ServiceContainer();
    this.loader = new PluginLoader(this.options.development);
    this.validator = new PluginValidator();
    this.security = new PluginSecurity(this.options.security);
    this.utils = new Utils();

    // Register core services
    this.registerCoreServices();
    
    // Setup component interactions
    this.setupComponentInteractions();
  }

  /**
   * Register core services in the container
   */
  private registerCoreServices(): void {
    this.services.register('registry', () => this.registry);
    this.services.register('hooks', () => this.hooks);
    this.services.register('events', () => this.events);
    this.services.register('loader', () => this.loader);
    this.services.register('validator', () => this.validator);
    this.services.register('security', () => this.security);
    this.services.register('utils', () => this.utils);
  }

  /**
   * Setup interactions between components
   */
  private setupComponentInteractions(): void {
    // Plugin lifecycle events
    this.hooks.register('plugin:before-load', async (plugin: IPlugin) => {
      await this.events.emitAsync('plugin:loading', { plugin: plugin.name });
    });

    this.hooks.register('plugin:after-load', async (plugin: IPlugin) => {
      await this.events.emitAsync('plugin:loaded', { plugin: plugin.name });
    });

    this.hooks.register('plugin:before-init', async (plugin: IPlugin) => {
      await this.events.emitAsync('plugin:initializing', { plugin: plugin.name });
    });

    this.hooks.register('plugin:after-init', async (plugin: IPlugin) => {
      await this.events.emitAsync('plugin:initialized', { plugin: plugin.name });
    });

    // Error handling
    this.events.on('plugin:error', (event) => {
      console.error(`Plugin error in ${event.source}:`, event.data);
    });

    // Security monitoring
    if (this.options.security?.enabled) {
      this.hooks.register('plugin:before-load', async (plugin: IPlugin, manifest: PluginManifest) => {
        await this.security.validatePermissions(plugin, manifest);
      });
    }
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Plugin system already initialized');
    }

    try {
      // Execute initialization hooks
      await this.hooks.execute('system:before-init');

      // Initialize components
      await this.hooks.execute('system:init-components');

      // Load auto-load plugins if configured
      await this.loadAutoLoadPlugins();

      // Execute post-initialization hooks
      await this.hooks.execute('system:after-init');

      this.initialized = true;
      await this.events.emitAsync('system:initialized', {
        uptime: Date.now() - this.startTime,
        options: this.options
      });

    } catch (error) {
      await this.events.emitAsync('system:init-error', { error });
      throw error;
    }
  }

  /**
   * Register a plugin
   */
  async register(plugin: IPlugin, manifest: PluginManifest): Promise<void> {
    this.ensureInitialized();

    try {
      // Validate plugin
      if (this.options.development?.validatePlugins) {
        const validation = await this.validator.validate(plugin, manifest);
        if (!validation.valid) {
          throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Security check
      if (this.options.security?.enabled) {
        await this.security.validatePlugin(plugin, manifest);
      }

      // Execute pre-registration hooks
      await this.hooks.execute('plugin:before-register', plugin, manifest);

      // Register plugin
      await this.registry.register(plugin, manifest);

      // Initialize plugin
      await this.initializePlugin(plugin, manifest);

      // Execute post-registration hooks
      await this.hooks.execute('plugin:after-register', plugin, manifest);

      await this.events.emitAsync('plugin:registered', {
        plugin: plugin.name,
        version: plugin.version
      });

    } catch (error) {
      await this.events.emitAsync('plugin:register-error', {
        plugin: plugin.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Initialize a plugin
   */
  private async initializePlugin(plugin: IPlugin, manifest: PluginManifest): Promise<void> {
    const context = this.createPluginContext(plugin, manifest);

    // Execute pre-init hooks
    await this.hooks.execute('plugin:before-init', plugin, context);

    try {
      // Configure plugin
      if (plugin.configure) {
        await plugin.configure(context.config);
      }

      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(context);
      }

      // Execute post-init hooks
      await this.hooks.execute('plugin:after-init', plugin, context);

    } catch (error) {
      await this.events.emitAsync('plugin:init-error', {
        plugin: plugin.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(plugin: IPlugin, manifest: PluginManifest): PluginContext {
    const pluginConfig = this.getPluginConfig(plugin.name);

    return {
      app: null, // Will be set when available
      logger: this.createPluginLogger(plugin.name),
      config: pluginConfig,
      hooks: this.hooks,
      events: this.events,
      services: this.services.createChild(),
      utils: this.utils
    };
  }

  /**
   * Create plugin-specific logger
   */
  private createPluginLogger(pluginName: string): any {
    // Simple logger implementation - will be enhanced with proper logging system
    return {
      debug: (message: string, ...args: any[]) => {
        if (this.options.logging?.level === 'debug') {
          console.debug(`[${pluginName}] ${message}`, ...args);
        }
      },
      info: (message: string, ...args: any[]) => {
        console.info(`[${pluginName}] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        console.warn(`[${pluginName}] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        console.error(`[${pluginName}] ${message}`, ...args);
      }
    };
  }

  /**
   * Get plugin configuration
   */
  private getPluginConfig(pluginName: string): PluginConfig {
    // Default configuration - will be enhanced with configuration system
    return {
      enabled: true,
      environment: process.env.NODE_ENV as any || 'development',
      debug: this.options.development?.debugMode || false
    };
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    this.ensureInitialized();

    const plugin = this.registry.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    try {
      // Execute pre-unregister hooks
      await this.hooks.execute('plugin:before-unregister', plugin);

      // Destroy plugin
      if (plugin.destroy) {
        await plugin.destroy();
      }

      // Unregister plugin
      await this.registry.unregister(name);

      // Clean up plugin services
      // Note: Implementation depends on service container cleanup

      // Execute post-unregister hooks
      await this.hooks.execute('plugin:after-unregister', name);

      await this.events.emitAsync('plugin:unregistered', { plugin: name });

    } catch (error) {
      await this.events.emitAsync('plugin:unregister-error', {
        plugin: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Load a plugin from path
   */
  async load(path: string): Promise<LoadedPlugin> {
    this.ensureInitialized();

    try {
      const loaded = await this.loader.load(path);
      await this.register(loaded.plugin, loaded.manifest);
      return loaded;
    } catch (error) {
      await this.events.emitAsync('plugin:load-error', {
        path,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(name: string): Promise<void> {
    await this.unregister(name);
    await this.loader.unload(name);
  }

  /**
   * Reload a plugin
   */
  async reload(name: string): Promise<LoadedPlugin> {
    this.ensureInitialized();

    try {
      await this.unload(name);
      const loaded = await this.loader.reload(name);
      await this.register(loaded.plugin, loaded.manifest);
      return loaded;
    } catch (error) {
      await this.events.emitAsync('plugin:reload-error', {
        plugin: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get a plugin
   */
  get(name: string): IPlugin | undefined {
    return this.registry.get(name);
  }

  /**
   * Get all plugins
   */
  getAll(): IPlugin[] {
    return this.registry.getAll();
  }

  /**
   * Find plugins by criteria
   */
  find(criteria: PluginSearchCriteria): IPlugin[] {
    return this.registry.find(criteria);
  }

  /**
   * Get plugin manifest
   */
  getManifest(name: string): PluginManifest | undefined {
    return this.registry.getManifest(name);
  }

  /**
   * Validate a plugin
   */
  async validate(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult> {
    return this.validator.validate(plugin, manifest);
  }

  /**
   * Get hooks manager
   */
  getHooks(): IHooksManager {
    return this.hooks;
  }

  /**
   * Get events manager
   */
  getEvents(): IEventsManager {
    return this.events;
  }

  /**
   * Get service container
   */
  getServices(): IServiceContainer {
    return this.services;
  }

  /**
   * Get system statistics
   */
  getStats(): PluginSystemStats {
    const plugins = this.getAll();
    const activePlugins = plugins.filter(p => this.getPluginStatus(p.name) === 'running').length;
    const failedPlugins = plugins.filter(p => this.getPluginStatus(p.name) === 'error').length;

    return {
      totalPlugins: plugins.length,
      activePlugins,
      failedPlugins,
      totalHooks: this.hooks.getHooks().length,
      totalSubscriptions: this.getTotalSubscriptions(),
      uptime: Date.now() - this.startTime,
      memoryUsage: this.getMemoryUsage(),
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Get plugin status
   */
  private getPluginStatus(name: string): PluginStatus {
    // Simplified status check - will be enhanced with proper status tracking
    const plugin = this.get(name);
    return plugin ? 'running' : 'stopped';
  }

  /**
   * Get total event subscriptions
   */
  private getTotalSubscriptions(): number {
    // Implementation depends on events manager
    return 0;
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): PluginSystemStats['memoryUsage'] {
    // Simplified memory tracking
    const used = process.memoryUsage();
    return {
      plugins: Math.round(used.heapUsed * 0.3),
      hooks: Math.round(used.heapUsed * 0.1),
      events: Math.round(used.heapUsed * 0.1),
      total: used.heapUsed
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): PluginSystemStats['performance'] {
    // Simplified performance metrics
    return {
      averagePluginLoadTime: 100,
      averageHookExecutionTime: 1,
      averageEventEmissionTime: 0.5
    };
  }

  /**
   * Load auto-load plugins
   */
  private async loadAutoLoadPlugins(): Promise<void> {
    // Implementation for auto-loading plugins from configured directories
    // This will be enhanced based on configuration system
  }

  /**
   * Merge default options
   */
  private mergeDefaultOptions(options: PluginFactoryOptions): PluginFactoryOptions {
    return {
      security: {
        enabled: false,
        sandbox: false,
        permissions: [],
        isolation: false,
        ...options.security
      },
      performance: {
        monitoring: true,
        metrics: true,
        profiling: false,
        ...options.performance
      },
      development: {
        hotReload: false,
        debugMode: false,
        validatePlugins: true,
        ...options.development
      },
      storage: {
        persistEvents: false,
        eventStore: 'memory',
        cachePlugins: true,
        ...options.storage
      },
      logging: {
        level: 'info',
        includeStack: true,
        logEvents: false,
        ...options.logging
      }
    };
  }

  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Plugin system not initialized. Call initialize() first.');
    }
  }

  /**
   * Shutdown the plugin system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Execute pre-shutdown hooks
      await this.hooks.execute('system:before-shutdown');

      // Destroy all plugins
      const plugins = this.getAll();
      for (const plugin of plugins) {
        try {
          await this.unregister(plugin.name);
        } catch (error) {
          console.error(`Error unregistering plugin ${plugin.name}:`, error);
        }
      }

      // Clear all hooks and events
      this.hooks.clearAll();
      this.events.removeAllListeners();

      // Execute post-shutdown hooks
      await this.hooks.execute('system:after-shutdown');

      this.initialized = false;
      
      await this.events.emitAsync('system:shutdown', {
        uptime: Date.now() - this.startTime
      });

    } catch (error) {
      await this.events.emitAsync('system:shutdown-error', { error });
      throw error;
    }
  }
}
