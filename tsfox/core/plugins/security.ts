/**
 * @fileoverview Plugin security implementation
 * @module tsfox/core/plugins/security
 */

import {
  IPlugin,
  PluginManifest,
  PluginPermission,
  PluginPermissionType
} from './interfaces';

/**
 * Security context for plugin execution
 */
interface SecurityContext {
  plugin: string;
  permissions: PluginPermissionType[];
  sandbox: boolean;
  isolation: boolean;
  restrictions: SecurityRestriction[];
}

/**
 * Security restriction
 */
interface SecurityRestriction {
  type: 'api' | 'filesystem' | 'network' | 'process';
  pattern: string;
  allowed: boolean;
  description: string;
}

/**
 * Plugin security implementation
 */
export class PluginSecurity {
  private contexts = new Map<string, SecurityContext>();
  private globalRestrictions: SecurityRestriction[] = [];
  private securityOptions: any;

  constructor(securityOptions?: any) {
    this.securityOptions = securityOptions || {};
    this.initializeGlobalRestrictions();
  }

  /**
   * Validate plugin permissions
   */
  async validatePermissions(plugin: IPlugin, manifest: PluginManifest): Promise<void> {
    const permissions = manifest.permissions || [];
    
    for (const permission of permissions) {
      await this.validatePermission(plugin.name, permission);
    }
  }

  /**
   * Validate a single permission
   */
  async validatePermission(pluginName: string, permission: PluginPermission): Promise<void> {
    // Check if permission is allowed
    if (!this.isPermissionAllowed(permission.type)) {
      throw new Error(`Permission '${permission.type}' is not allowed for plugin '${pluginName}'`);
    }

    // Check permission scope
    if (permission.scope) {
      await this.validatePermissionScope(pluginName, permission);
    }

    // Check if permission requires explicit user consent
    if (this.requiresUserConsent(permission.type)) {
      await this.requestUserConsent(pluginName, permission);
    }
  }

  /**
   * Validate plugin against security policies
   */
  async validatePlugin(plugin: IPlugin, manifest: PluginManifest): Promise<void> {
    // Create security context
    const context = this.createSecurityContext(plugin, manifest);
    this.contexts.set(plugin.name, context);

    // Validate against security policies
    await this.validateSecurityPolicies(plugin, manifest, context);

    // Setup sandbox if enabled
    if (context.sandbox) {
      await this.setupSandbox(plugin.name, context);
    }
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginName: string, permission: PluginPermissionType): boolean {
    const context = this.contexts.get(pluginName);
    return context ? context.permissions.includes(permission) : false;
  }

  /**
   * Check API access
   */
  checkApiAccess(pluginName: string, apiPath: string): boolean {
    const context = this.contexts.get(pluginName);
    if (!context) return false;

    // Check against restrictions
    for (const restriction of context.restrictions) {
      if (restriction.type === 'api' && this.matchesPattern(apiPath, restriction.pattern)) {
        return restriction.allowed;
      }
    }

    // Check against global restrictions
    for (const restriction of this.globalRestrictions) {
      if (restriction.type === 'api' && this.matchesPattern(apiPath, restriction.pattern)) {
        return restriction.allowed;
      }
    }

    return true; // Allow by default
  }

  /**
   * Check filesystem access
   */
  checkFilesystemAccess(pluginName: string, path: string, operation: 'read' | 'write' | 'delete'): boolean {
    const context = this.contexts.get(pluginName);
    if (!context) return false;

    // Check if plugin has filesystem permission
    if (!context.permissions.includes('filesystem')) {
      return false;
    }

    // Check path restrictions
    return this.isPathAllowed(path, operation);
  }

  /**
   * Check network access
   */
  checkNetworkAccess(pluginName: string, url: string, method: string): boolean {
    const context = this.contexts.get(pluginName);
    if (!context) return false;

    // Check if plugin has network permission
    if (!context.permissions.includes('network')) {
      return false;
    }

    // Check URL restrictions
    return this.isUrlAllowed(url, method);
  }

  /**
   * Check process access
   */
  checkProcessAccess(pluginName: string, operation: string): boolean {
    const context = this.contexts.get(pluginName);
    if (!context) return false;

    // Check if plugin has process permission
    if (!context.permissions.includes('process')) {
      return false;
    }

    // Check operation restrictions
    return this.isProcessOperationAllowed(operation);
  }

  /**
   * Create security sandbox for plugin
   */
  async setupSandbox(pluginName: string, context: SecurityContext): Promise<void> {
    if (!this.securityOptions.sandbox) return;

    // This would setup a proper sandbox environment
    // For now, it's a placeholder for the concept
    console.log(`Setting up sandbox for plugin: ${pluginName}`);
  }

  /**
   * Remove plugin security context
   */
  removeSecurityContext(pluginName: string): void {
    this.contexts.delete(pluginName);
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const totalPlugins = this.contexts.size;
    const sandboxedPlugins = Array.from(this.contexts.values())
      .filter(ctx => ctx.sandbox).length;
    const isolatedPlugins = Array.from(this.contexts.values())
      .filter(ctx => ctx.isolation).length;

    const permissionCounts = new Map<PluginPermissionType, number>();
    for (const context of this.contexts.values()) {
      for (const permission of context.permissions) {
        const count = permissionCounts.get(permission) || 0;
        permissionCounts.set(permission, count + 1);
      }
    }

    return {
      totalPlugins,
      sandboxedPlugins,
      isolatedPlugins,
      permissionCounts: Object.fromEntries(permissionCounts),
      totalRestrictions: this.globalRestrictions.length
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize global security restrictions
   */
  private initializeGlobalRestrictions(): void {
    // Default security restrictions
    this.globalRestrictions = [
      {
        type: 'filesystem',
        pattern: '/etc/*',
        allowed: false,
        description: 'System configuration files'
      },
      {
        type: 'filesystem',
        pattern: '/sys/*',
        allowed: false,
        description: 'System files'
      },
      {
        type: 'filesystem',
        pattern: '/proc/*',
        allowed: false,
        description: 'Process information'
      },
      {
        type: 'network',
        pattern: 'localhost:*',
        allowed: true,
        description: 'Local development'
      },
      {
        type: 'process',
        pattern: 'exec',
        allowed: false,
        description: 'Process execution'
      },
      {
        type: 'api',
        pattern: 'system:*',
        allowed: false,
        description: 'System APIs'
      }
    ];
  }

  /**
   * Create security context for plugin
   */
  private createSecurityContext(plugin: IPlugin, manifest: PluginManifest): SecurityContext {
    const permissions = (manifest.permissions || []).map(p => p.type);
    
    return {
      plugin: plugin.name,
      permissions,
      sandbox: this.securityOptions.sandbox || false,
      isolation: this.securityOptions.isolation || false,
      restrictions: this.createPluginRestrictions(manifest)
    };
  }

  /**
   * Create plugin-specific restrictions
   */
  private createPluginRestrictions(manifest: PluginManifest): SecurityRestriction[] {
    const restrictions: SecurityRestriction[] = [];
    
    // Add restrictions based on permissions
    for (const permission of manifest.permissions || []) {
      if (permission.scope) {
        for (const scope of permission.scope) {
          restrictions.push({
            type: this.getRestrictionType(permission.type),
            pattern: scope,
            allowed: true,
            description: permission.description
          });
        }
      }
    }
    
    return restrictions;
  }

  /**
   * Get restriction type from permission type
   */
  private getRestrictionType(permissionType: PluginPermissionType): SecurityRestriction['type'] {
    switch (permissionType) {
      case 'filesystem':
        return 'filesystem';
      case 'network':
        return 'network';
      case 'process':
        return 'process';
      default:
        return 'api';
    }
  }

  /**
   * Validate security policies
   */
  private async validateSecurityPolicies(
    plugin: IPlugin, 
    manifest: PluginManifest, 
    context: SecurityContext
  ): Promise<void> {
    // Check for dangerous permission combinations
    const dangerousPerms = ['admin', 'process', 'filesystem'];
    const pluginDangerousPerms = context.permissions.filter(p => dangerousPerms.includes(p));
    
    if (pluginDangerousPerms.length > 1) {
      throw new Error(
        `Plugin '${plugin.name}' has dangerous permission combination: ${pluginDangerousPerms.join(', ')}`
      );
    }

    // Check for admin permission requirements
    if (context.permissions.includes('admin')) {
      if (!manifest.permissions?.find(p => p.type === 'admin' && p.required)) {
        throw new Error(`Plugin '${plugin.name}' requests admin permission but doesn't mark it as required`);
      }
    }
  }

  /**
   * Validate permission scope
   */
  private async validatePermissionScope(pluginName: string, permission: PluginPermission): Promise<void> {
    if (!permission.scope) return;

    for (const scope of permission.scope) {
      switch (permission.type) {
        case 'filesystem':
          if (!this.isValidFilesystemScope(scope)) {
            throw new Error(`Invalid filesystem scope for plugin '${pluginName}': ${scope}`);
          }
          break;
        
        case 'network':
          if (!this.isValidNetworkScope(scope)) {
            throw new Error(`Invalid network scope for plugin '${pluginName}': ${scope}`);
          }
          break;
        
        case 'database':
          if (!this.isValidDatabaseScope(scope)) {
            throw new Error(`Invalid database scope for plugin '${pluginName}': ${scope}`);
          }
          break;
      }
    }
  }

  /**
   * Check if permission is allowed
   */
  private isPermissionAllowed(permission: PluginPermissionType): boolean {
    if (!this.securityOptions.enabled) return true;

    const allowedPermissions = this.securityOptions.permissions || [];
    return allowedPermissions.length === 0 || allowedPermissions.includes(permission);
  }

  /**
   * Check if permission requires user consent
   */
  private requiresUserConsent(permission: PluginPermissionType): boolean {
    const consentRequired = ['admin', 'process', 'filesystem', 'network'];
    return consentRequired.includes(permission);
  }

  /**
   * Request user consent for permission
   */
  private async requestUserConsent(pluginName: string, permission: PluginPermission): Promise<void> {
    // This would show a user consent dialog
    // For now, log the request
    console.log(`Plugin '${pluginName}' requests permission: ${permission.type} - ${permission.description}`);
  }

  /**
   * Check if pattern matches
   */
  private matchesPattern(value: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(value);
  }

  /**
   * Check if filesystem path is allowed
   */
  private isPathAllowed(path: string, operation: string): boolean {
    // Check against global restrictions
    for (const restriction of this.globalRestrictions) {
      if (restriction.type === 'filesystem' && this.matchesPattern(path, restriction.pattern)) {
        return restriction.allowed;
      }
    }

    // Additional checks based on operation
    if (operation === 'write' || operation === 'delete') {
      // More restrictive for write/delete operations
      const dangerousPaths = ['/bin', '/usr/bin', '/sbin', '/usr/sbin'];
      for (const dangerousPath of dangerousPaths) {
        if (path.startsWith(dangerousPath)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if URL is allowed
   */
  private isUrlAllowed(url: string, method: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Block local network ranges for security
      const hostname = urlObj.hostname;
      if (this.isPrivateIP(hostname)) {
        return false;
      }

      // Check against restrictions
      for (const restriction of this.globalRestrictions) {
        if (restriction.type === 'network' && this.matchesPattern(url, restriction.pattern)) {
          return restriction.allowed;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if process operation is allowed
   */
  private isProcessOperationAllowed(operation: string): boolean {
    const allowedOperations = ['spawn', 'fork'];
    const blockedOperations = ['exec', 'execSync'];
    
    if (blockedOperations.includes(operation)) {
      return false;
    }
    
    return allowedOperations.includes(operation);
  }

  /**
   * Validate filesystem scope
   */
  private isValidFilesystemScope(scope: string): boolean {
    // Scope should be a valid path pattern
    return scope.startsWith('/') || scope.startsWith('./') || scope.startsWith('../');
  }

  /**
   * Validate network scope
   */
  private isValidNetworkScope(scope: string): boolean {
    // Scope should be a valid URL pattern or domain
    return scope.includes(':') || scope.includes('.');
  }

  /**
   * Validate database scope
   */
  private isValidDatabaseScope(scope: string): boolean {
    // Scope should be a database name or table pattern
    return scope.length > 0 && !/[;'"]/.test(scope);
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(hostname: string): boolean {
    // Basic check for private IP ranges
    const privateRanges = [
      /^127\./, // 127.x.x.x
      /^10\./, // 10.x.x.x
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x - 172.31.x.x
      /^192\.168\./, // 192.168.x.x
      /^localhost$/i,
      /^::1$/, // IPv6 localhost
      /^fe80::/i // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(hostname));
  }
}
