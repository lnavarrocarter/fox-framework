/**
 * @fileoverview Plugin system main exports
 * @module tsfox/core/plugins
 */

// Core interfaces
export * from './interfaces';

// Specific hook and event interfaces (avoiding conflicts)
export type {
  HookContext,
  HookExecutionStats,
  HookRegistration,
  HookDefinition,
  HookExecutionMode,
  IHookFilter,
  IHookMiddleware,
  HookPerformanceMonitor,
  HookPerformanceMetrics,
  FrameworkHooks
} from './hooks.interfaces';

export type {
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
  EventStoreCriteria,
  FrameworkEvents
} from './events.interfaces';

// Main factory
export { PluginFactory } from './factory';
export type { PluginFactoryOptions } from './factory';

// Import for internal use
import { PluginFactory } from './factory';
import type { PluginFactoryOptions } from './factory';

// Core components
export { PluginRegistry } from './registry';
export { HooksManager } from './hooks.manager';
export { EventsManager } from './events.manager';
export { ServiceContainer } from './service.container';
export { PluginLoader } from './loader';
export { PluginValidator } from './validator';
export { PluginSecurity } from './security';
export { PluginUtils } from './utils';

// Supporting types and interfaces from components
export type {
  ServiceInfo,
  ValidationResult,
  DependencyGraph,
  GraphNode,
  GraphEdge,
  ContainerStats
} from './service.container';

// Version and metadata
export const PLUGIN_SYSTEM_VERSION = '1.0.0';
export const PLUGIN_API_VERSION = '1.0.0';

/**
 * Plugin system metadata
 */
export const PLUGIN_SYSTEM_INFO = {
  name: 'Fox Framework Plugin System',
  version: PLUGIN_SYSTEM_VERSION,
  apiVersion: PLUGIN_API_VERSION,
  description: 'Comprehensive plugin system for Fox Framework',
  features: [
    'Plugin lifecycle management',
    'Dependency resolution',
    'Hook system for extensibility',
    'Event-driven architecture',
    'Security sandboxing',
    'Performance monitoring',
    'Hot reload support',
    'Type-safe plugin development'
  ],
  compatibility: {
    foxFramework: '^1.0.0',
    node: '>=14.0.0',
    typescript: '^4.0.0'
  }
};

/**
 * Default plugin factory options
 */
export const DEFAULT_PLUGIN_OPTIONS = {
  security: {
    enabled: true,
    sandbox: false,
    permissions: [],
    isolation: false
  },
  performance: {
    monitoring: true,
    metrics: true,
    profiling: false
  },
  development: {
    hotReload: false,
    debugMode: false,
    validatePlugins: true
  },
  storage: {
    persistEvents: false,
    eventStore: 'memory',
    cachePlugins: true
  },
  logging: {
    level: 'info' as const,
    includeStack: true,
    logEvents: false
  }
};

/**
 * Create a new plugin factory with default options
 */
export function createPluginFactory(options: Partial<PluginFactoryOptions> = {}) {
  const mergedOptions: PluginFactoryOptions = {
    ...DEFAULT_PLUGIN_OPTIONS,
    ...options,
    security: { ...DEFAULT_PLUGIN_OPTIONS.security, ...(options.security || {}) },
    performance: { ...DEFAULT_PLUGIN_OPTIONS.performance, ...(options.performance || {}) },
    development: { ...DEFAULT_PLUGIN_OPTIONS.development, ...(options.development || {}) },
    storage: { ...DEFAULT_PLUGIN_OPTIONS.storage, ...(options.storage || {}) },
    logging: { ...DEFAULT_PLUGIN_OPTIONS.logging, ...(options.logging || {}) }
  };

  return new PluginFactory(mergedOptions);
}

/**
 * Plugin system utilities
 */
export const PluginSystemUtils = {
  /**
   * Validate plugin manifest
   */
  validateManifest: (manifest: any): boolean => {
    const required = ['name', 'version', 'main'];
    return required.every(field => field in manifest && manifest[field]);
  },

  /**
   * Generate plugin template
   */
  generatePluginTemplate: (name: string, version: string = '1.0.0') => ({
    name,
    version,
    description: `Plugin: ${name}`,
    author: 'Plugin Author',
    license: 'MIT',
    main: 'index.js',
    dependencies: [],
    permissions: [],
    hooks: [],
    events: [],
    metadata: {
      category: 'other' as const,
      tags: [],
      keywords: [name]
    }
  }),

  /**
   * Create basic plugin structure
   */
  createPluginStructure: (name: string) => ({
    [`${name}/`]: {
      'plugin.json': 'Plugin manifest file',
      'index.js': 'Main plugin entry point',
      'README.md': 'Plugin documentation',
      'package.json': 'NPM package configuration (if needed)',
      'src/': {
        'plugin.ts': 'TypeScript plugin implementation',
        'types.ts': 'Plugin-specific types',
        'config.ts': 'Plugin configuration'
      },
      'tests/': {
        'plugin.test.ts': 'Plugin tests'
      },
      'docs/': {
        'API.md': 'Plugin API documentation',
        'examples.md': 'Usage examples'
      }
    }
  }),

  /**
   * Plugin development best practices
   */
  bestPractices: {
    naming: [
      'Use kebab-case for plugin names',
      'Prefix with organization or scope',
      'Be descriptive but concise',
      'Avoid generic terms'
    ],
    structure: [
      'Follow semantic versioning',
      'Include comprehensive manifest',
      'Provide clear documentation',
      'Add proper error handling',
      'Include unit tests'
    ],
    performance: [
      'Avoid synchronous operations',
      'Use lazy loading when possible',
      'Clean up resources in destroy()',
      'Monitor memory usage',
      'Optimize hook handlers'
    ],
    security: [
      'Request minimal permissions',
      'Validate all inputs',
      'Avoid eval() and similar',
      'Use secure dependencies',
      'Handle sensitive data properly'
    ]
  }
};

/**
 * Plugin development helpers
 */
export const PluginHelpers = {
  /**
   * Create plugin base class
   */
  createBasePlugin: (name: string, version: string) => {
    return class BasePlugin {
      public readonly name = name;
      public readonly version = version;
      public readonly description?: string;
      
      private context?: any;
      private initialized = false;

      async initialize(context: any): Promise<void> {
        this.context = context;
        this.initialized = true;
        await this.onInitialize(context);
      }

      async destroy(): Promise<void> {
        if (this.initialized) {
          await this.onDestroy();
          this.initialized = false;
          this.context = undefined;
        }
      }

      protected async onInitialize(context: any): Promise<void> {
        // Override in subclass
      }

      protected async onDestroy(): Promise<void> {
        // Override in subclass
      }

      protected getContext() {
        return this.context;
      }

      protected isInitialized(): boolean {
        return this.initialized;
      }
    };
  },

  /**
   * Create plugin decorator
   */
  createPluginDecorator: (manifest: any) => {
    return function(target: any) {
      target.prototype.manifest = manifest;
      target.prototype.name = manifest.name;
      target.prototype.version = manifest.version;
      target.prototype.description = manifest.description;
      return target;
    };
  }
};

/**
 * Common plugin patterns
 */
export const PluginPatterns = {
  /**
   * Middleware plugin pattern
   */
  Middleware: {
    create: (handler: Function) => ({
      name: 'middleware-plugin',
      version: '1.0.0',
      initialize: async (context: any) => {
        context.hooks.register('request:before-handler', handler);
      }
    })
  },

  /**
   * Service plugin pattern
   */
  Service: {
    create: (serviceName: string, serviceFactory: Function) => ({
      name: `${serviceName}-service`,
      version: '1.0.0',
      initialize: async (context: any) => {
        context.services.register(serviceName, serviceFactory);
      }
    })
  },

  /**
   * Event handler plugin pattern
   */
  EventHandler: {
    create: (eventName: string, handler: Function) => ({
      name: `${eventName}-handler`,
      version: '1.0.0',
      initialize: async (context: any) => {
        context.events.on(eventName, handler);
      }
    })
  }
};
