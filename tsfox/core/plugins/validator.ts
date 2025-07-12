/**
 * @fileoverview Plugin validator implementation
 * @module tsfox/core/plugins/validator
 */

import {
  IPlugin,
  PluginManifest,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  PluginDependency,
  PluginPermission,
  PluginConfigSchema
} from './interfaces';

/**
 * Plugin validator implementation
 */
export class PluginValidator {
  
  /**
   * Validate a plugin and its manifest
   */
  async validate(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult> {
    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationWarning[] = [];

    // Validate plugin object
    this.validatePluginObject(plugin, errors, warnings);

    // Validate manifest
    this.validateManifest(manifest, errors, warnings);

    // Cross-validate plugin and manifest
    this.crossValidate(plugin, manifest, errors, warnings);

    // Validate dependencies
    this.validateDependencies(manifest.dependencies || [], errors, warnings);

    // Validate permissions
    this.validatePermissions(manifest.permissions || [], errors, warnings);

    // Validate configuration schema
    if (manifest.config) {
      this.validateConfigSchema(manifest.config, errors, warnings);
    }

    // Validate hooks and events
    this.validateHooksAndEvents(manifest, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin security
   */
  async validateSecurity(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult> {
    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationWarning[] = [];

    // Check for dangerous patterns
    this.checkDangerousPatterns(plugin, errors, warnings);

    // Validate permissions
    this.validateSecurityPermissions(manifest.permissions || [], errors, warnings);

    // Check for known vulnerabilities
    this.checkKnownVulnerabilities(manifest, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin performance impact
   */
  async validatePerformance(plugin: IPlugin, manifest: PluginManifest): Promise<PluginValidationResult> {
    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationWarning[] = [];

    // Check for performance anti-patterns
    this.checkPerformancePatterns(plugin, errors, warnings);

    // Validate memory usage patterns
    this.validateMemoryUsage(plugin, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate plugin object structure
   */
  private validatePluginObject(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Required properties
    if (!plugin.name) {
      errors.push({
        code: 'PLUGIN_MISSING_NAME',
        message: 'Plugin must have a name property'
      });
    }

    if (!plugin.version) {
      errors.push({
        code: 'PLUGIN_MISSING_VERSION',
        message: 'Plugin must have a version property'
      });
    }

    // Validate version format
    if (plugin.version && !this.isValidVersion(plugin.version)) {
      errors.push({
        code: 'PLUGIN_INVALID_VERSION',
        message: `Invalid version format: '${plugin.version}'`
      });
    }

    // Validate name format
    if (plugin.name && !this.isValidPluginName(plugin.name)) {
      errors.push({
        code: 'PLUGIN_INVALID_NAME',
        message: `Invalid plugin name format: '${plugin.name}'`
      });
    }

    // Optional but recommended properties
    if (!plugin.description) {
      warnings.push({
        code: 'PLUGIN_MISSING_DESCRIPTION',
        message: 'Plugin should have a description'
      });
    }

    // Validate lifecycle methods
    this.validateLifecycleMethods(plugin, errors, warnings);
  }

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Required fields
    const required = ['name', 'version', 'description', 'author', 'license', 'main'];
    
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        if (field === 'description' || field === 'author' || field === 'license') {
          warnings.push({
            code: 'MANIFEST_MISSING_FIELD',
            message: `Manifest should have a ${field} field`
          });
        } else {
          errors.push({
            code: 'MANIFEST_MISSING_REQUIRED_FIELD',
            message: `Manifest must have a ${field} field`
          });
        }
      }
    }

    // Validate version format
    if (manifest.version && !this.isValidVersion(manifest.version)) {
      errors.push({
        code: 'MANIFEST_INVALID_VERSION',
        message: `Invalid version format in manifest: '${manifest.version}'`
      });
    }

    // Validate license
    if (manifest.license && !this.isValidLicense(manifest.license)) {
      warnings.push({
        code: 'MANIFEST_UNKNOWN_LICENSE',
        message: `Unknown license type: '${manifest.license}'`
      });
    }

    // Validate main entry
    if (manifest.main && !this.isValidMainEntry(manifest.main)) {
      errors.push({
        code: 'MANIFEST_INVALID_MAIN',
        message: `Invalid main entry: '${manifest.main}'`
      });
    }

    // Validate keywords
    if (manifest.keywords && !Array.isArray(manifest.keywords)) {
      errors.push({
        code: 'MANIFEST_INVALID_KEYWORDS',
        message: 'Keywords must be an array'
      });
    }

    // Validate repository
    if (manifest.repository) {
      this.validateRepository(manifest.repository, errors, warnings);
    }
  }

  /**
   * Cross-validate plugin and manifest
   */
  private crossValidate(plugin: IPlugin, manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Name consistency
    if (plugin.name !== manifest.name) {
      errors.push({
        code: 'NAME_MISMATCH',
        message: `Plugin name '${plugin.name}' does not match manifest name '${manifest.name}'`
      });
    }

    // Version consistency
    if (plugin.version !== manifest.version) {
      errors.push({
        code: 'VERSION_MISMATCH',
        message: `Plugin version '${plugin.version}' does not match manifest version '${manifest.version}'`
      });
    }

    // Description consistency
    if (plugin.description && manifest.description && plugin.description !== manifest.description) {
      warnings.push({
        code: 'DESCRIPTION_MISMATCH',
        message: 'Plugin and manifest descriptions differ'
      });
    }
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(dependencies: PluginDependency[], errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    for (const dep of dependencies) {
      // Required fields
      if (!dep.name) {
        errors.push({
          code: 'DEPENDENCY_MISSING_NAME',
          message: 'Dependency must have a name'
        });
        continue;
      }

      if (!dep.version) {
        errors.push({
          code: 'DEPENDENCY_MISSING_VERSION',
          message: `Dependency '${dep.name}' must have a version`
        });
        continue;
      }

      // Validate version format
      if (!this.isValidVersionRange(dep.version)) {
        errors.push({
          code: 'DEPENDENCY_INVALID_VERSION',
          message: `Invalid version range for dependency '${dep.name}': '${dep.version}'`
        });
      }

      // Validate dependency type
      if (dep.type && !['plugin', 'npm', 'framework'].includes(dep.type)) {
        errors.push({
          code: 'DEPENDENCY_INVALID_TYPE',
          message: `Invalid dependency type for '${dep.name}': '${dep.type}'`
        });
      }

      // Check for circular dependencies (basic check)
      if (dep.name === dep.name) { // This would need actual plugin name
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected: '${dep.name}'`
        });
      }
    }
  }

  /**
   * Validate permissions
   */
  private validatePermissions(permissions: PluginPermission[], errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    const validTypes = [
      'filesystem', 'network', 'database', 'environment', 'process',
      'hooks', 'events', 'config', 'logging', 'cache', 'security', 'admin'
    ];

    for (const perm of permissions) {
      // Required fields
      if (!perm.type) {
        errors.push({
          code: 'PERMISSION_MISSING_TYPE',
          message: 'Permission must have a type'
        });
        continue;
      }

      if (!perm.description) {
        warnings.push({
          code: 'PERMISSION_MISSING_DESCRIPTION',
          message: `Permission '${perm.type}' should have a description`
        });
      }

      // Validate permission type
      if (!validTypes.includes(perm.type)) {
        errors.push({
          code: 'PERMISSION_INVALID_TYPE',
          message: `Invalid permission type: '${perm.type}'`
        });
      }

      // Check for dangerous permissions
      if (['admin', 'process', 'filesystem'].includes(perm.type)) {
        warnings.push({
          code: 'PERMISSION_DANGEROUS',
          message: `Permission '${perm.type}' is potentially dangerous`
        });
      }
    }
  }

  /**
   * Validate configuration schema
   */
  private validateConfigSchema(schema: PluginConfigSchema, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    if (!schema.properties) {
      errors.push({
        code: 'CONFIG_SCHEMA_MISSING_PROPERTIES',
        message: 'Configuration schema must have properties'
      });
      return;
    }

    for (const [propName, propDef] of Object.entries(schema.properties)) {
      // Validate property type
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      if (!validTypes.includes(propDef.type)) {
        errors.push({
          code: 'CONFIG_SCHEMA_INVALID_TYPE',
          message: `Invalid type for property '${propName}': '${propDef.type}'`
        });
      }

      // Check for description
      if (!propDef.description) {
        warnings.push({
          code: 'CONFIG_SCHEMA_MISSING_DESCRIPTION',
          message: `Property '${propName}' should have a description`
        });
      }
    }
  }

  /**
   * Validate hooks and events
   */
  private validateHooksAndEvents(manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Validate hooks
    if (manifest.hooks) {
      for (const hook of manifest.hooks) {
        if (!this.isValidHookName(hook)) {
          warnings.push({
            code: 'INVALID_HOOK_NAME',
            message: `Hook name '${hook}' does not follow naming conventions`
          });
        }
      }
    }

    // Validate events
    if (manifest.events) {
      for (const event of manifest.events) {
        if (!this.isValidEventName(event)) {
          warnings.push({
            code: 'INVALID_EVENT_NAME',
            message: `Event name '${event}' does not follow naming conventions`
          });
        }
      }
    }
  }

  /**
   * Validate lifecycle methods
   */
  private validateLifecycleMethods(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    const methods = ['initialize', 'configure', 'destroy', 'onHook', 'onEvent', 'healthCheck'];
    
    for (const method of methods) {
      const func = plugin[method as keyof IPlugin];
      if (func && typeof func !== 'function') {
        errors.push({
          code: 'INVALID_LIFECYCLE_METHOD',
          message: `Plugin method '${method}' must be a function`
        });
      }
    }
  }

  /**
   * Check for dangerous patterns
   */
  private checkDangerousPatterns(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    const pluginStr = plugin.toString();
    
    // Check for eval usage
    if (pluginStr.includes('eval(')) {
      errors.push({
        code: 'DANGEROUS_EVAL',
        message: 'Plugin uses eval() which is dangerous'
      });
    }

    // Check for process exit
    if (pluginStr.includes('process.exit')) {
      warnings.push({
        code: 'DANGEROUS_PROCESS_EXIT',
        message: 'Plugin uses process.exit() which may affect the application'
      });
    }

    // Check for global modifications
    if (pluginStr.includes('global.') || pluginStr.includes('window.')) {
      warnings.push({
        code: 'GLOBAL_MODIFICATION',
        message: 'Plugin modifies global objects'
      });
    }
  }

  /**
   * Validate security permissions
   */
  private validateSecurityPermissions(permissions: PluginPermission[], errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    const dangerousPermissions = ['admin', 'process', 'filesystem'];
    const networkPermissions = ['network'];
    
    for (const perm of permissions) {
      if (dangerousPermissions.includes(perm.type)) {
        if (!perm.description || perm.description.length < 10) {
          errors.push({
            code: 'INSUFFICIENT_PERMISSION_DESCRIPTION',
            message: `Dangerous permission '${perm.type}' needs detailed description`
          });
        }
      }

      if (networkPermissions.includes(perm.type) && !perm.scope) {
        warnings.push({
          code: 'NETWORK_PERMISSION_NO_SCOPE',
          message: 'Network permission should specify scope'
        });
      }
    }
  }

  /**
   * Check for known vulnerabilities
   */
  private checkKnownVulnerabilities(manifest: PluginManifest, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // This would integrate with vulnerability databases
    // For now, basic checks
    
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        // Check for known vulnerable versions
        if (this.isKnownVulnerableVersion(dep.name, dep.version)) {
          warnings.push({
            code: 'VULNERABLE_DEPENDENCY',
            message: `Dependency '${dep.name}@${dep.version}' has known vulnerabilities`
          });
        }
      }
    }
  }

  /**
   * Check performance patterns
   */
  private checkPerformancePatterns(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Basic performance checks
    const methodNames = ['initialize', 'configure', 'onHook', 'onEvent'];
    
    for (const methodName of methodNames) {
      const method = plugin[methodName as keyof IPlugin];
      if (method && typeof method === 'function') {
        const methodStr = method.toString();
        
        // Check for synchronous blocking operations
        if (methodStr.includes('fs.readFileSync') || methodStr.includes('fs.writeFileSync')) {
          warnings.push({
            code: 'SYNC_IO_OPERATION',
            message: `Method '${methodName}' uses synchronous I/O operations`
          });
        }

        // Check for infinite loops
        if (methodStr.includes('while(true)') || methodStr.includes('for(;;)')) {
          warnings.push({
            code: 'POTENTIAL_INFINITE_LOOP',
            message: `Method '${methodName}' may contain infinite loops`
          });
        }
      }
    }
  }

  /**
   * Validate memory usage patterns
   */
  private validateMemoryUsage(plugin: IPlugin, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    // Basic memory usage checks
    // This would be enhanced with actual memory analysis
    
    const pluginStr = plugin.toString();
    
    // Check for potential memory leaks
    if (pluginStr.includes('setInterval') && !pluginStr.includes('clearInterval')) {
      warnings.push({
        code: 'POTENTIAL_MEMORY_LEAK',
        message: 'Plugin uses setInterval without clearInterval'
      });
    }

    if (pluginStr.includes('addEventListener') && !pluginStr.includes('removeEventListener')) {
      warnings.push({
        code: 'POTENTIAL_MEMORY_LEAK',
        message: 'Plugin adds event listeners without removing them'
      });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if version is valid
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+)?(?:\+[a-zA-Z0-9-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Check if version range is valid
   */
  private isValidVersionRange(version: string): boolean {
    // Handle semver ranges
    const rangeRegex = /^[\^~><=\s]*\d+\.\d+\.\d+/;
    return rangeRegex.test(version) || this.isValidVersion(version);
  }

  /**
   * Check if plugin name is valid
   */
  private isValidPluginName(name: string): boolean {
    // Plugin names should follow npm package naming conventions
    const nameRegex = /^[a-z0-9]([a-z0-9-_])*[a-z0-9]$/;
    return nameRegex.test(name) && name.length >= 2 && name.length <= 214;
  }

  /**
   * Check if license is valid
   */
  private isValidLicense(license: string): boolean {
    // Common license identifiers
    const knownLicenses = [
      'MIT', 'ISC', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause',
      'GPL-3.0', 'GPL-2.0', 'LGPL-3.0', 'LGPL-2.1', 'MPL-2.0',
      'CC0-1.0', 'Unlicense', 'WTFPL'
    ];
    
    return knownLicenses.includes(license) || license.startsWith('SEE LICENSE IN');
  }

  /**
   * Check if main entry is valid
   */
  private isValidMainEntry(main: string): boolean {
    // Main entry should be a relative path to a JS/TS file
    return main.endsWith('.js') || main.endsWith('.ts') || main === 'index.js' || main === 'index.ts';
  }

  /**
   * Check if hook name is valid
   */
  private isValidHookName(hook: string): boolean {
    // Hook names should follow namespace:action pattern
    const hookRegex = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
    return hookRegex.test(hook);
  }

  /**
   * Check if event name is valid
   */
  private isValidEventName(event: string): boolean {
    // Event names should follow namespace:action pattern
    const eventRegex = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
    return eventRegex.test(event);
  }

  /**
   * Validate repository information
   */
  private validateRepository(repo: any, errors: PluginValidationError[], warnings: PluginValidationWarning[]): void {
    if (!repo.type) {
      warnings.push({
        code: 'REPOSITORY_MISSING_TYPE',
        message: 'Repository should specify type'
      });
    }

    if (!repo.url) {
      warnings.push({
        code: 'REPOSITORY_MISSING_URL',
        message: 'Repository should specify URL'
      });
    }

    if (repo.url && !this.isValidUrl(repo.url)) {
      errors.push({
        code: 'REPOSITORY_INVALID_URL',
        message: 'Repository URL is invalid'
      });
    }
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if dependency version is known to be vulnerable
   */
  private isKnownVulnerableVersion(name: string, version: string): boolean {
    // This would integrate with actual vulnerability databases
    // For now, return false (no known vulnerabilities)
    return false;
  }
}
