/**
 * @fileoverview Plugin registry implementation
 * @module tsfox/core/plugins/registry
 */

import {
  IPlugin,
  IPluginRegistry,
  PluginManifest,
  PluginSearchCriteria,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  PluginDependency,
  PluginStatus,
  PluginCategory
} from './interfaces';

/**
 * Plugin registry entry
 */
interface PluginRegistryEntry {
  plugin: IPlugin;
  manifest: PluginManifest;
  registeredAt: number;
  status: PluginStatus;
  dependencies: PluginDependency[];
}

/**
 * Plugin registry implementation
 */
export class PluginRegistry implements IPluginRegistry {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  /**
   * Register a plugin
   */
  async register(plugin: IPlugin, manifest: PluginManifest): Promise<void> {
    // Check if plugin already exists
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    // Check name consistency
    if (plugin.name !== manifest.name) {
      throw new Error(`Plugin name mismatch: '${plugin.name}' vs '${manifest.name}'`);
    }

    // Check version consistency
    if (plugin.version !== manifest.version) {
      throw new Error(`Plugin version mismatch: '${plugin.version}' vs '${manifest.version}'`);
    }

    // Validate dependencies
    const dependencies = manifest.dependencies || [];
    await this.validateDependencies(dependencies);

    // Create registry entry
    const entry: PluginRegistryEntry = {
      plugin,
      manifest,
      registeredAt: Date.now(),
      status: 'registered',
      dependencies
    };

    // Register plugin
    this.plugins.set(plugin.name, entry);

    // Update dependency graph
    this.updateDependencyGraph(plugin.name, dependencies);
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is not registered`);
    }

    // Check if other plugins depend on this one
    const dependents = this.getDependents(name);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister '${name}' - it is required by: ${dependents.join(', ')}`
      );
    }

    // Remove from registry
    this.plugins.delete(name);

    // Remove from dependency graph
    this.dependencyGraph.delete(name);

    // Clean up references in other dependencies
    for (const [pluginName, deps] of this.dependencyGraph) {
      deps.delete(name);
    }
  }

  /**
   * Get a registered plugin
   */
  get(name: string): IPlugin | undefined {
    const entry = this.plugins.get(name);
    return entry?.plugin;
  }

  /**
   * Get all registered plugins
   */
  getAll(): IPlugin[] {
    return Array.from(this.plugins.values()).map(entry => entry.plugin);
  }

  /**
   * Check if plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Find plugins by criteria
   */
  find(criteria: PluginSearchCriteria): IPlugin[] {
    const plugins: IPlugin[] = [];

    for (const entry of this.plugins.values()) {
      if (this.matchesCriteria(entry, criteria)) {
        plugins.push(entry.plugin);
      }
    }

    return plugins;
  }

  /**
   * Get plugin manifest
   */
  getManifest(name: string): PluginManifest | undefined {
    const entry = this.plugins.get(name);
    return entry?.manifest;
  }

  /**
   * Validate plugin
   */
  async validate(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult> {
    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationWarning[] = [];

    // Validate plugin object
    this.validatePluginObject(plugin, errors, warnings);

    // Validate manifest
    this.validateManifestObject(manifest, errors, warnings);

    // Cross-validate plugin and manifest
    this.crossValidate(plugin, manifest, errors, warnings);

    // Validate dependencies
    await this.validateDependenciesForValidation(manifest.dependencies || [], errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get plugin dependencies
   */
  getDependencies(name: string): PluginDependency[] {
    const entry = this.plugins.get(name);
    return entry?.dependencies || [];
  }

  /**
   * Resolve dependencies
   */
  async resolveDependencies(plugins: string[]): Promise<string[]> {
    const resolved: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (pluginName: string) => {
      if (visited.has(pluginName)) {
        return;
      }

      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving '${pluginName}'`);
      }

      visiting.add(pluginName);

      const dependencies = this.getDependencies(pluginName);
      for (const dep of dependencies) {
        if (dep.type === 'plugin') {
          visit(dep.name);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      resolved.push(pluginName);
    };

    for (const plugin of plugins) {
      visit(plugin);
    }

    return resolved;
  }

  /**
   * Get plugin status
   */
  getStatus(name: string): PluginStatus | undefined {
    const entry = this.plugins.get(name);
    return entry?.status;
  }

  /**
   * Update plugin status
   */
  updateStatus(name: string, status: PluginStatus): void {
    const entry = this.plugins.get(name);
    if (entry) {
      entry.status = status;
    }
  }

  /**
   * Get plugins by status
   */
  getByStatus(status: PluginStatus): IPlugin[] {
    const plugins: IPlugin[] = [];

    for (const entry of this.plugins.values()) {
      if (entry.status === status) {
        plugins.push(entry.plugin);
      }
    }

    return plugins;
  }

  /**
   * Get plugin dependents
   */
  getDependents(name: string): string[] {
    const dependents: string[] = [];

    for (const [pluginName, deps] of this.dependencyGraph) {
      if (deps.has(name)) {
        dependents.push(pluginName);
      }
    }

    return dependents;
  }

  /**
   * Check if dependencies are satisfied
   */
  areDependenciesSatisfied(name: string): boolean {
    const dependencies = this.getDependencies(name);

    for (const dep of dependencies) {
      if (dep.type === 'plugin' && !dep.optional) {
        if (!this.has(dep.name)) {
          return false;
        }

        const depStatus = this.getStatus(dep.name);
        if (depStatus !== 'running' && depStatus !== 'initialized') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const total = this.plugins.size;
    const byStatus = new Map<PluginStatus, number>();
    const byCategory = new Map<PluginCategory, number>();

    for (const entry of this.plugins.values()) {
      // Count by status
      const count = byStatus.get(entry.status) || 0;
      byStatus.set(entry.status, count + 1);

      // Count by category
      const category = entry.manifest.metadata?.category || 'other';
      const catCount = byCategory.get(category) || 0;
      byCategory.set(category, catCount + 1);
    }

    return {
      total,
      byStatus: Object.fromEntries(byStatus),
      byCategory: Object.fromEntries(byCategory),
      totalDependencies: Array.from(this.dependencyGraph.values())
        .reduce((sum, deps) => sum + deps.size, 0)
    };
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.dependencyGraph.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name) {
      throw new Error('Plugin manifest must have a name');
    }

    if (!manifest.version) {
      throw new Error('Plugin manifest must have a version');
    }

    if (!manifest.main) {
      throw new Error('Plugin manifest must specify main entry file');
    }

    // Validate version format
    if (!this.isValidVersion(manifest.version)) {
      throw new Error(`Invalid version format: '${manifest.version}'`);
    }
  }

  /**
   * Validate dependencies
   */
  private async validateDependencies(dependencies: PluginDependency[]): Promise<void> {
    for (const dep of dependencies) {
      if (dep.type === 'plugin' && !dep.optional) {
        if (!this.has(dep.name)) {
          throw new Error(`Required plugin dependency not found: '${dep.name}'`);
        }

        // Check version compatibility
        const depManifest = this.getManifest(dep.name);
        if (depManifest && !this.isVersionCompatible(depManifest.version, dep.version)) {
          throw new Error(
            `Plugin '${dep.name}' version '${depManifest.version}' ` +
            `is not compatible with required '${dep.version}'`
          );
        }
      }
    }
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(pluginName: string, dependencies: PluginDependency[]): void {
    const pluginDeps = new Set<string>();

    for (const dep of dependencies) {
      if (dep.type === 'plugin') {
        pluginDeps.add(dep.name);
      }
    }

    this.dependencyGraph.set(pluginName, pluginDeps);
  }

  /**
   * Check if plugin matches criteria
   */
  private matchesCriteria(entry: PluginRegistryEntry, criteria: PluginSearchCriteria): boolean {
    // Name filter
    if (criteria.name && !entry.plugin.name.includes(criteria.name)) {
      return false;
    }

    // Category filter
    if (criteria.category && entry.manifest.metadata?.category !== criteria.category) {
      return false;
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      const pluginTags = entry.manifest.metadata?.tags || [];
      if (!criteria.tags.some(tag => pluginTags.includes(tag))) {
        return false;
      }
    }

    // Author filter
    if (criteria.author && entry.manifest.author !== criteria.author) {
      return false;
    }

    // Version filter
    if (criteria.version && !this.isVersionCompatible(entry.plugin.version, criteria.version)) {
      return false;
    }

    // Status filter
    if (criteria.status && entry.status !== criteria.status) {
      return false;
    }

    return true;
  }

  /**
   * Validate plugin object
   */
  private validatePluginObject(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    if (!plugin.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Plugin must have a name'
      });
    }

    if (!plugin.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Plugin must have a version'
      });
    }

    if (!this.isValidVersion(plugin.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: `Invalid version format: '${plugin.version}'`
      });
    }
  }

  /**
   * Validate manifest object
   */
  private validateManifestObject(manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    if (!manifest.name) {
      errors.push({
        code: 'MANIFEST_MISSING_NAME',
        message: 'Manifest must have a name'
      });
    }

    if (!manifest.version) {
      errors.push({
        code: 'MANIFEST_MISSING_VERSION',
        message: 'Manifest must have a version'
      });
    }

    if (!manifest.main) {
      errors.push({
        code: 'MANIFEST_MISSING_MAIN',
        message: 'Manifest must specify main entry file'
      });
    }

    if (!manifest.description) {
      warnings.push({
        code: 'MANIFEST_MISSING_DESCRIPTION',
        message: 'Manifest should have a description'
      });
    }

    if (!manifest.author) {
      warnings.push({
        code: 'MANIFEST_MISSING_AUTHOR',
        message: 'Manifest should have an author'
      });
    }
  }

  /**
   * Cross-validate plugin and manifest
   */
  private crossValidate(plugin: IPlugin, manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    if (plugin.name !== manifest.name) {
      errors.push({
        code: 'NAME_MISMATCH',
        message: `Plugin name '${plugin.name}' does not match manifest name '${manifest.name}'`
      });
    }

    if (plugin.version !== manifest.version) {
      errors.push({
        code: 'VERSION_MISMATCH',
        message: `Plugin version '${plugin.version}' does not match manifest version '${manifest.version}'`
      });
    }

    if (plugin.description && manifest.description && plugin.description !== manifest.description) {
      warnings.push({
        code: 'DESCRIPTION_MISMATCH',
        message: 'Plugin and manifest descriptions differ'
      });
    }
  }

  /**
   * Validate dependencies for validation result
   */
  private async validateDependenciesForValidation(
    dependencies: PluginDependency[], 
    errors: PluginValidationError[], 
    warnings: PluginValidationWarning[]
  ): Promise<void> {
    for (const dep of dependencies) {
      if (dep.type === 'plugin') {
        if (!this.has(dep.name) && !dep.optional) {
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Required plugin dependency not found: '${dep.name}'`,
            context: dep
          });
        }

        if (!this.isValidVersion(dep.version)) {
          errors.push({
            code: 'INVALID_DEPENDENCY_VERSION',
            message: `Invalid dependency version format: '${dep.version}'`,
            context: dep
          });
        }
      }
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
   * Check if versions are compatible
   */
  private isVersionCompatible(actual: string, required: string): boolean {
    // Simplified version compatibility check
    // This should be enhanced with proper semver range checking
    if (required.startsWith('^')) {
      const reqVersion = required.slice(1);
      return this.compareMajorVersion(actual, reqVersion) === 0;
    }

    if (required.startsWith('~')) {
      const reqVersion = required.slice(1);
      return this.compareMinorVersion(actual, reqVersion) === 0;
    }

    return actual === required;
  }

  /**
   * Compare major versions
   */
  private compareMajorVersion(v1: string, v2: string): number {
    const major1 = parseInt(v1.split('.')[0]);
    const major2 = parseInt(v2.split('.')[0]);
    return major1 - major2;
  }

  /**
   * Compare minor versions
   */
  private compareMinorVersion(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    const majorDiff = parts1[0] - parts2[0];
    if (majorDiff !== 0) return majorDiff;
    
    return parts1[1] - parts2[1];
  }
}
