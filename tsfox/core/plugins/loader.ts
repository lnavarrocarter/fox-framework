/**
 * @fileoverview Plugin loader implementation
 * @module tsfox/core/plugins/loader
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  IPluginLoader,
  IPlugin,
  PluginManifest,
  LoadedPlugin,
  PluginStatus
} from './interfaces';

/**
 * Plugin loader implementation
 */
export class PluginLoader implements IPluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>();
  private developmentOptions: any;

  constructor(developmentOptions?: any) {
    this.developmentOptions = developmentOptions || {};
  }

  /**
   * Load a plugin from path
   */
  async load(pluginPath: string): Promise<LoadedPlugin> {
    try {
      // Resolve absolute path
      const absolutePath = path.resolve(pluginPath);
      
      // Load manifest
      const manifest = await this.loadManifest(absolutePath);
      
      // Load plugin module
      const plugin = await this.loadPluginModule(absolutePath, manifest);
      
      // Create loaded plugin entry
      const loaded: LoadedPlugin = {
        plugin,
        manifest,
        path: absolutePath,
        loadedAt: Date.now(),
        status: 'registered',
        module: undefined // Module reference for hot reload
      };

      // Store loaded plugin
      this.loadedPlugins.set(plugin.name, loaded);
      
      return loaded;

    } catch (error) {
      throw new Error(`Failed to load plugin from '${pluginPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unload a plugin
   */
  async unload(name: string): Promise<void> {
    const loaded = this.loadedPlugins.get(name);
    if (!loaded) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    try {
      // Call plugin destroy if available
      if (loaded.plugin.destroy) {
        await loaded.plugin.destroy();
      }

      // Clear module cache if in development mode
      if (this.developmentOptions.hotReload && loaded.module) {
        this.clearModuleCache(loaded.path);
      }

      // Remove from loaded plugins
      this.loadedPlugins.delete(name);

    } catch (error) {
      throw new Error(`Failed to unload plugin '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reload a plugin
   */
  async reload(name: string): Promise<LoadedPlugin> {
    const loaded = this.loadedPlugins.get(name);
    if (!loaded) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    try {
      // Unload current version
      await this.unload(name);
      
      // Load new version
      return await this.load(loaded.path);

    } catch (error) {
      throw new Error(`Failed to reload plugin '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get loaded plugin
   */
  getLoaded(name: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  getAllLoaded(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * Update plugin status
   */
  updateStatus(name: string, status: PluginStatus): void {
    const loaded = this.loadedPlugins.get(name);
    if (loaded) {
      loaded.status = status;
    }
  }

  /**
   * Get plugins by status
   */
  getByStatus(status: PluginStatus): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values())
      .filter(loaded => loaded.status === status);
  }

  /**
   * Load plugin from directory
   */
  async loadFromDirectory(directory: string): Promise<LoadedPlugin[]> {
    const loaded: LoadedPlugin[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);
          const manifestPath = path.join(pluginPath, 'plugin.json');
          
          try {
            // Check if manifest exists
            await fs.access(manifestPath);
            
            // Load plugin
            const plugin = await this.load(pluginPath);
            loaded.push(plugin);
            
          } catch (error) {
            console.warn(`Skipping directory '${entry.name}': ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to load plugins from directory '${directory}': ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return loaded;
  }

  /**
   * Get loader statistics
   */
  getStats() {
    const all = this.getAllLoaded();
    const byStatus = new Map<PluginStatus, number>();
    
    for (const loaded of all) {
      const count = byStatus.get(loaded.status) || 0;
      byStatus.set(loaded.status, count + 1);
    }
    
    return {
      totalLoaded: all.length,
      byStatus: Object.fromEntries(byStatus),
      oldestLoad: all.length > 0 ? Math.min(...all.map(l => l.loadedAt)) : 0,
      newestLoad: all.length > 0 ? Math.max(...all.map(l => l.loadedAt)) : 0
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load plugin manifest from directory
   */
  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as PluginManifest;
      
      // Validate required fields
      this.validateManifest(manifest);
      
      return manifest;
      
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error('Plugin manifest (plugin.json) not found');
      }
      throw new Error(`Failed to load manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    const required = ['name', 'version', 'main'];
    
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Manifest missing required field: ${field}`);
      }
    }

    // Validate version format
    if (!this.isValidVersion(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`);
    }
  }

  /**
   * Load plugin module
   */
  private async loadPluginModule(pluginPath: string, manifest: PluginManifest): Promise<IPlugin> {
    const mainPath = path.resolve(pluginPath, manifest.main);
    
    try {
      // Check if main file exists
      await fs.access(mainPath);
      
      // Clear module cache if in development mode
      if (this.developmentOptions.hotReload) {
        this.clearModuleCache(mainPath);
      }
      
      // Load module
      const module = require(mainPath);
      
      // Get plugin instance
      let plugin: IPlugin;
      
      if (typeof module === 'function') {
        // Module exports a constructor/factory function
        plugin = new module();
      } else if (module.default && typeof module.default === 'function') {
        // ES6 default export
        plugin = new module.default();
      } else if (module.default) {
        // ES6 default export instance
        plugin = module.default;
      } else if (module.plugin) {
        // Named export 'plugin'
        plugin = module.plugin;
      } else {
        // Module is the plugin instance
        plugin = module;
      }
      
      // Validate plugin object
      this.validatePlugin(plugin, manifest);
      
      return plugin;
      
    } catch (error) {
      throw new Error(`Failed to load plugin module '${mainPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate plugin object
   */
  private validatePlugin(plugin: any, manifest: PluginManifest): void {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }

    if (!plugin.name) {
      throw new Error('Plugin must have a name property');
    }

    if (!plugin.version) {
      throw new Error('Plugin must have a version property');
    }

    if (plugin.name !== manifest.name) {
      throw new Error(`Plugin name '${plugin.name}' does not match manifest name '${manifest.name}'`);
    }

    if (plugin.version !== manifest.version) {
      throw new Error(`Plugin version '${plugin.version}' does not match manifest version '${manifest.version}'`);
    }
  }

  /**
   * Clear module cache for hot reload
   */
  private clearModuleCache(modulePath: string): void {
    try {
      // Get resolved module path
      const resolved = require.resolve(modulePath);
      
      // Delete from cache
      delete require.cache[resolved];
      
      // Also clear any dependent modules
      for (const [cachedPath, module] of Object.entries(require.cache)) {
        if (module && module.children) {
          const children = module.children as any[];
          const index = children.findIndex(child => child.filename === resolved);
          if (index !== -1) {
            children.splice(index, 1);
          }
        }
      }
      
    } catch (error) {
      console.warn(`Failed to clear module cache for '${modulePath}':`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if version is valid
   */
  private isValidVersion(version: string): boolean {
    // Simple semver validation
    const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+)?(?:\+[a-zA-Z0-9-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Find plugin directory from various paths
   */
  private async findPluginDirectory(searchPath: string): Promise<string> {
    try {
      const stats = await fs.stat(searchPath);
      
      if (stats.isFile()) {
        // If it's a file, return its directory
        return path.dirname(searchPath);
      } else if (stats.isDirectory()) {
        // If it's a directory, check if it contains a manifest
        const manifestPath = path.join(searchPath, 'plugin.json');
        try {
          await fs.access(manifestPath);
          return searchPath;
        } catch {
          throw new Error('Directory does not contain a plugin manifest');
        }
      } else {
        throw new Error('Path is neither a file nor a directory');
      }
      
    } catch (error) {
      throw new Error(`Invalid plugin path '${searchPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Watch plugin directory for changes (development mode)
   */
  private watchPluginDirectory(pluginPath: string, pluginName: string): void {
    if (!this.developmentOptions.hotReload) {
      return;
    }

    try {
      const fs = require('fs');
      
      const watcher = fs.watch(pluginPath, { recursive: true }, (eventType: string, filename: string) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.ts'))) {
          console.log(`Plugin '${pluginName}' file changed: ${filename}`);
          
          // Debounce reload
          setTimeout(async () => {
            try {
              await this.reload(pluginName);
              console.log(`Plugin '${pluginName}' reloaded successfully`);
            } catch (error) {
              console.error(`Failed to reload plugin '${pluginName}':`, error instanceof Error ? error.message : String(error));
            }
          }, 1000);
        }
      });

      // Store watcher reference for cleanup
      const loaded = this.loadedPlugins.get(pluginName);
      if (loaded) {
        (loaded as any).watcher = watcher;
      }
      
    } catch (error) {
      console.warn(`Failed to watch plugin directory '${pluginPath}':`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Stop watching plugin directory
   */
  private stopWatchingPluginDirectory(pluginName: string): void {
    const loaded = this.loadedPlugins.get(pluginName);
    if (loaded && (loaded as any).watcher) {
      try {
        (loaded as any).watcher.close();
        delete (loaded as any).watcher;
      } catch (error) {
        console.warn(`Failed to stop watching plugin '${pluginName}':`, error instanceof Error ? error.message : String(error));
      }
    }
  }
}
