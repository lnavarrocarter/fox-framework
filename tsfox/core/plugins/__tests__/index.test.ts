/**
 * @fileoverview Plugin system basic tests
 * @module tsfox/core/plugins/__tests__
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  PluginFactory,
  PluginRegistry,
  HooksManager,
  EventsManager,
  ServiceContainer,
  IPlugin,
  PluginManifest,
  createPluginFactory
} from '../index';

describe('Plugin System', () => {
  let pluginFactory: PluginFactory;

  beforeEach(async () => {
    pluginFactory = createPluginFactory({
      security: { enabled: false },
      development: { 
        hotReload: false,
        debugMode: false,
        validatePlugins: false 
      }
    });
    await pluginFactory.initialize();
  });

  afterEach(async () => {
    await pluginFactory.shutdown();
  });

  describe('PluginFactory', () => {
    it('should initialize successfully', async () => {
      const factory = createPluginFactory();
      await factory.initialize();
      
      expect(factory).toBeDefined();
      expect(factory.getHooks()).toBeDefined();
      expect(factory.getEvents()).toBeDefined();
      expect(factory.getServices()).toBeDefined();
      
      await factory.shutdown();
    });

    it('should register a simple plugin', async () => {
      const plugin: IPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin'
      };

      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      await pluginFactory.register(plugin, manifest);

      const registered = pluginFactory.get('test-plugin');
      expect(registered).toBe(plugin);
      expect(pluginFactory.getAll()).toHaveLength(1);
    });

    it('should validate plugin before registration', async () => {
      const plugin: IPlugin = {
        name: 'invalid-plugin',
        version: '1.0.0'
      };

      const manifest: PluginManifest = {
        name: 'different-name',
        version: '1.0.0',
        description: 'Invalid plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      const factory = createPluginFactory({
        development: { 
          hotReload: false,
          debugMode: false,
          validatePlugins: true 
        }
      });
      await factory.initialize();

      await expect(factory.register(plugin, manifest))
        .rejects.toThrow('Plugin validation failed');

      await factory.shutdown();
    });
  });

  describe('PluginRegistry', () => {
    let registry: PluginRegistry;

    beforeEach(() => {
      registry = new PluginRegistry();
    });

    it('should register and retrieve plugins', async () => {
      const plugin: IPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      await registry.register(plugin, manifest);

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.get('test-plugin')).toBe(plugin);
      expect(registry.getManifest('test-plugin')).toBe(manifest);
    });

    it('should prevent duplicate registrations', async () => {
      const plugin: IPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      const manifest: PluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      await registry.register(plugin, manifest);

      await expect(registry.register(plugin, manifest))
        .rejects.toThrow('already registered');
    });

    it('should find plugins by criteria', async () => {
      const plugin1: IPlugin = {
        name: 'auth-plugin',
        version: '1.0.0'
      };

      const plugin2: IPlugin = {
        name: 'cache-plugin',
        version: '1.0.0'
      };

      const manifest1: PluginManifest = {
        name: 'auth-plugin',
        version: '1.0.0',
        description: 'Authentication plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js',
        metadata: {
          category: 'authentication',
          tags: ['auth', 'security']
        }
      };

      const manifest2: PluginManifest = {
        name: 'cache-plugin',
        version: '1.0.0',
        description: 'Cache plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js',
        metadata: {
          category: 'caching',
          tags: ['cache', 'performance']
        }
      };

      await registry.register(plugin1, manifest1);
      await registry.register(plugin2, manifest2);

      const authPlugins = registry.find({ category: 'authentication' });
      expect(authPlugins).toHaveLength(1);
      expect(authPlugins[0]).toBe(plugin1);

      const taggedPlugins = registry.find({ tags: ['performance'] });
      expect(taggedPlugins).toHaveLength(1);
      expect(taggedPlugins[0]).toBe(plugin2);
    });
  });

  describe('HooksManager', () => {
    let hooks: HooksManager;

    beforeEach(() => {
      hooks = new HooksManager();
    });

    it('should register and execute hooks', async () => {
      const results: number[] = [];
      
      hooks.register('test:hook', (value: number) => {
        results.push(value * 2);
        return value * 2;
      });

      await hooks.execute('test:hook', 5);
      expect(results).toEqual([10]);
    });

    it('should execute hooks in priority order', async () => {
      const results: string[] = [];
      
      hooks.register('test:priority', () => results.push('low'), { priority: 10 });
      hooks.register('test:priority', () => results.push('high'), { priority: 90 });
      hooks.register('test:priority', () => results.push('medium'), { priority: 50 });

      await hooks.execute('test:priority');
      expect(results).toEqual(['high', 'medium', 'low']);
    });

    it('should support once handlers', async () => {
      let callCount = 0;
      
      hooks.register('test:once', () => callCount++, { once: true });

      await hooks.execute('test:once');
      await hooks.execute('test:once');
      
      expect(callCount).toBe(1);
    });

    it('should execute until condition', async () => {
      hooks.register('test:until', () => 'first');
      hooks.register('test:until', () => 'second');
      hooks.register('test:until', () => 'target');
      hooks.register('test:until', () => 'fourth');

      const result = await hooks.executeUntil(
        'test:until',
        (result: string) => result === 'target'
      );

      expect(result).toBe('target');
    });
  });

  describe('EventsManager', () => {
    let events: EventsManager;

    beforeEach(() => {
      events = new EventsManager();
    });

    it('should emit and handle events', async () => {
      const receivedEvents: any[] = [];
      
      events.on('test:event', (event) => {
        receivedEvents.push(event);
      });

      await events.emitAsync('test:event', { message: 'hello' });
      
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('test:event');
      expect(receivedEvents[0].data).toEqual({ message: 'hello' });
    });

    it('should support once listeners', async () => {
      let callCount = 0;
      
      events.once('test:once', () => {
        callCount++;
      });

      await events.emitAsync('test:once');
      await events.emitAsync('test:once');
      
      expect(callCount).toBe(1);
    });

    it('should handle multiple listeners', async () => {
      const results: string[] = [];
      
      events.on('test:multiple', () => {
        results.push('first');
      });
      events.on('test:multiple', () => {
        results.push('second');
      });
      events.on('test:multiple', () => {
        results.push('third');
      });

      await events.emitAsync('test:multiple');
      
      expect(results).toEqual(['first', 'second', 'third']);
    });

    it('should remove listeners', () => {
      const handler = () => {};
      
      events.on('test:remove', handler);
      expect(events.listeners('test:remove')).toHaveLength(1);
      
      events.off('test:remove', handler);
      expect(events.listeners('test:remove')).toHaveLength(0);
    });
  });

  describe('ServiceContainer', () => {
    let container: ServiceContainer;

    beforeEach(() => {
      container = new ServiceContainer();
    });

    it('should register and resolve services', () => {
      container.register('test-service', () => ({ value: 42 }));
      
      const service = container.get('test-service') as { value: number };
      expect(service.value).toBe(42);
    });

    it('should support singleton lifetime', () => {
      container.singleton('singleton-service', () => ({ id: Math.random() }));
      
      const service1 = container.get('singleton-service');
      const service2 = container.get('singleton-service');
      
      expect(service1).toBe(service2);
    });

    it('should support transient lifetime', () => {
      container.transient('transient-service', () => ({ id: Math.random() }));
      
      const service1 = container.get('transient-service') as { id: number };
      const service2 = container.get('transient-service') as { id: number };
      
      expect(service1).not.toBe(service2);
      expect(service1.id).not.toBe(service2.id);
    });

    it('should resolve dependencies', () => {
      container.register('dependency', () => ({ name: 'dep' }));
      container.register('service', (c) => ({
        dependency: c.get('dependency'),
        name: 'service'
      }));
      
      const service = container.get('service') as { 
        dependency: { name: string }; 
        name: string 
      };
      expect(service.dependency.name).toBe('dep');
    });

    it('should create child containers', () => {
      container.register('parent-service', () => ({ type: 'parent' }));
      
      const child = container.createChild();
      child.register('child-service', () => ({ type: 'child' }));
      
      expect(child.has('parent-service')).toBe(true);
      expect(child.has('child-service')).toBe(true);
      expect(container.has('child-service')).toBe(false);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should execute full plugin lifecycle', async () => {
      const lifecycleEvents: string[] = [];
      
      const plugin: IPlugin = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        
        async initialize(context) {
          lifecycleEvents.push('initialize');
          context.events.on('test:event', () => {
            lifecycleEvents.push('event-handled');
          });
        },
        
        async configure(config) {
          lifecycleEvents.push('configure');
        },
        
        async destroy() {
          lifecycleEvents.push('destroy');
        }
      };

      const manifest: PluginManifest = {
        name: 'lifecycle-plugin',
        version: '1.0.0',
        description: 'Lifecycle test plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      await pluginFactory.register(plugin, manifest);
      
      // Test event handling
      const events = pluginFactory.getEvents();
      await events.emitAsync('test:event');
      
      // Unregister plugin
      await pluginFactory.unregister('lifecycle-plugin');
      
      expect(lifecycleEvents).toEqual([
        'configure',
        'initialize',
        'event-handled',
        'destroy'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin initialization errors', async () => {
      const plugin: IPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        
        async initialize() {
          throw new Error('Initialization failed');
        }
      };

      const manifest: PluginManifest = {
        name: 'error-plugin',
        version: '1.0.0',
        description: 'Error test plugin',
        author: 'Test Author',
        license: 'MIT',
        main: 'index.js'
      };

      await expect(pluginFactory.register(plugin, manifest))
        .rejects.toThrow('Initialization failed');
    });

    it('should handle hook execution errors gracefully', async () => {
      const hooks = pluginFactory.getHooks();
      
      hooks.register('test:error', () => {
        throw new Error('Hook error');
      });
      
      hooks.register('test:error', () => 'success');
      
      // Should not throw, but continue execution
      const results = await hooks.execute('test:error');
      expect(results).toEqual(['success']);
    });
  });
});
