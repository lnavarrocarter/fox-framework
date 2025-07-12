/**
 * @fileoverview Service container implementation
 * @module tsfox/core/plugins/service.container
 */

import {
  IServiceContainer,
  ServiceFactory,
  ServiceOptions
} from './interfaces';

/**
 * Service registration entry
 */
interface ServiceEntry<T = any> {
  factory: ServiceFactory<T>;
  options: ServiceOptions;
  instance?: T;
  created: boolean;
  createdAt?: number;
}

/**
 * Service container implementation
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceEntry>();
  private parent?: ServiceContainer;
  private children = new Set<ServiceContainer>();

  constructor(parent?: ServiceContainer) {
    this.parent = parent;
    if (parent) {
      parent.children.add(this);
    }
  }

  /**
   * Register a service
   */
  register<T>(name: string, factory: ServiceFactory<T>, options: ServiceOptions = {}): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const entry: ServiceEntry<T> = {
      factory,
      options: {
        lifetime: 'singleton',
        dependencies: [],
        ...options
      },
      created: false
    };

    this.services.set(name, entry);
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const entry = this.findService(name);
    if (!entry) {
      throw new Error(`Service '${name}' not found`);
    }

    return this.createOrGetInstance<T>(name, entry);
  }

  /**
   * Check if service exists
   */
  has(name: string): boolean {
    return this.findService(name) !== undefined;
  }

  /**
   * Resolve service dependencies and create instance
   */
  resolve<T>(factory: ServiceFactory<T>): T {
    return factory(this);
  }

  /**
   * Create child container
   */
  createChild(): IServiceContainer {
    return new ServiceContainer(this);
  }

  /**
   * Register singleton service
   */
  singleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, { lifetime: 'singleton' });
  }

  /**
   * Register transient service
   */
  transient<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, { lifetime: 'transient' });
  }

  /**
   * Register scoped service
   */
  scoped<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, { lifetime: 'scoped' });
  }

  /**
   * Register service with dependencies
   */
  registerWithDependencies<T>(
    name: string, 
    factory: ServiceFactory<T>, 
    dependencies: string[]
  ): void {
    this.register(name, factory, { dependencies });
  }

  /**
   * Unregister a service
   */
  unregister(name: string): void {
    const entry = this.services.get(name);
    if (entry && entry.instance && typeof entry.instance === 'object') {
      // Call dispose if available
      const disposable = entry.instance as any;
      if (typeof disposable.dispose === 'function') {
        try {
          disposable.dispose();
        } catch (error) {
          console.error(`Error disposing service '${name}':`, error);
        }
      }
    }

    this.services.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    // Dispose all services
    for (const [name] of this.services) {
      this.unregister(name);
    }
    this.services.clear();
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    const names = new Set<string>();
    
    // Add local services
    for (const name of this.services.keys()) {
      names.add(name);
    }
    
    // Add parent services
    if (this.parent) {
      for (const name of this.parent.getServiceNames()) {
        names.add(name);
      }
    }
    
    return Array.from(names);
  }

  /**
   * Get service information
   */
  getServiceInfo(name: string): ServiceInfo | undefined {
    const entry = this.findService(name);
    if (!entry) return undefined;

    return {
      name,
      lifetime: entry.options.lifetime || 'singleton',
      dependencies: entry.options.dependencies || [],
      created: entry.created,
      createdAt: entry.createdAt,
      hasInstance: !!entry.instance
    };
  }

  /**
   * Get all service information
   */
  getAllServiceInfo(): ServiceInfo[] {
    const serviceNames = this.getServiceNames();
    return serviceNames
      .map(name => this.getServiceInfo(name))
      .filter((info): info is ServiceInfo => info !== undefined);
  }

  /**
   * Validate service dependencies
   */
  validateDependencies(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const validateService = (name: string): void => {
      if (visited.has(name)) return;
      
      if (visiting.has(name)) {
        errors.push(`Circular dependency detected: ${name}`);
        return;
      }

      const entry = this.findService(name);
      if (!entry) {
        errors.push(`Service '${name}' not found`);
        return;
      }

      visiting.add(name);

      for (const dep of entry.options.dependencies || []) {
        if (!this.has(dep)) {
          errors.push(`Dependency '${dep}' for service '${name}' not found`);
        } else {
          validateService(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
    };

    for (const name of this.services.keys()) {
      validateService(name);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: [],
      edges: []
    };

    for (const [name, entry] of this.services) {
      graph.nodes.push({
        name,
        lifetime: entry.options.lifetime || 'singleton',
        created: entry.created
      });

      for (const dep of entry.options.dependencies || []) {
        graph.edges.push({
          from: name,
          to: dep
        });
      }
    }

    return graph;
  }

  /**
   * Get container statistics
   */
  getStats(): ContainerStats {
    const allServices = this.getAllServiceInfo();
    const createdServices = allServices.filter(s => s.created);
    
    return {
      totalServices: allServices.length,
      createdServices: createdServices.length,
      singletonServices: allServices.filter(s => s.lifetime === 'singleton').length,
      transientServices: allServices.filter(s => s.lifetime === 'transient').length,
      scopedServices: allServices.filter(s => s.lifetime === 'scoped').length,
      hasChildren: this.children.size > 0,
      childrenCount: this.children.size
    };
  }

  /**
   * Dispose container and all services
   */
  dispose(): void {
    // Dispose all child containers
    for (const child of this.children) {
      child.dispose();
    }
    this.children.clear();

    // Clear all services
    this.clear();

    // Remove from parent
    if (this.parent) {
      this.parent.children.delete(this);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Find service in this container or parent containers
   */
  private findService(name: string): ServiceEntry | undefined {
    // Check local services first
    const local = this.services.get(name);
    if (local) return local;

    // Check parent if available
    if (this.parent) {
      return this.parent.findService(name);
    }

    return undefined;
  }

  /**
   * Create or get service instance based on lifetime
   */
  private createOrGetInstance<T>(name: string, entry: ServiceEntry<T>): T {
    const lifetime = entry.options.lifetime || 'singleton';

    switch (lifetime) {
      case 'singleton':
        return this.getSingletonInstance(name, entry);
      
      case 'transient':
        return this.createTransientInstance(entry);
      
      case 'scoped':
        return this.getScopedInstance(name, entry);
      
      default:
        throw new Error(`Unknown service lifetime: ${lifetime}`);
    }
  }

  /**
   * Get singleton instance (create if needed)
   */
  private getSingletonInstance<T>(name: string, entry: ServiceEntry<T>): T {
    if (!entry.instance) {
      entry.instance = this.createInstance(entry);
      entry.created = true;
      entry.createdAt = Date.now();
    }
    return entry.instance;
  }

  /**
   * Create transient instance (always new)
   */
  private createTransientInstance<T>(entry: ServiceEntry<T>): T {
    return this.createInstance(entry);
  }

  /**
   * Get scoped instance (singleton within container scope)
   */
  private getScopedInstance<T>(name: string, entry: ServiceEntry<T>): T {
    // For scoped services, we treat them as singletons within this container
    return this.getSingletonInstance(name, entry);
  }

  /**
   * Create service instance
   */
  private createInstance<T>(entry: ServiceEntry<T>): T {
    try {
      // Validate dependencies first
      this.validateServiceDependencies(entry);
      
      // Create instance
      return entry.factory(this);
      
    } catch (error) {
      throw new Error(`Failed to create service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate service dependencies before creation
   */
  private validateServiceDependencies(entry: ServiceEntry): void {
    for (const dep of entry.options.dependencies || []) {
      if (!this.has(dep)) {
        throw new Error(`Dependency '${dep}' not found`);
      }
    }
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Service information
 */
export interface ServiceInfo {
  name: string;
  lifetime: 'singleton' | 'transient' | 'scoped';
  dependencies: string[];
  created: boolean;
  createdAt?: number;
  hasInstance: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Graph node
 */
export interface GraphNode {
  name: string;
  lifetime: string;
  created: boolean;
}

/**
 * Graph edge
 */
export interface GraphEdge {
  from: string;
  to: string;
}

/**
 * Container statistics
 */
export interface ContainerStats {
  totalServices: number;
  createdServices: number;
  singletonServices: number;
  transientServices: number;
  scopedServices: number;
  hasChildren: boolean;
  childrenCount: number;
}
