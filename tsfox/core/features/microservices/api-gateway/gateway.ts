/**
 * Fox Framework - API Gateway
 * Centralized API gateway for microservices routing
 */

import { 
  APIGatewayInterface,
  GatewayRequest,
  GatewayResponse,
  RouteDefinition,
  ServiceRegistryInterface,
  LoadBalancerInterface,
  CircuitBreakerInterface
} from '../interfaces';
import { ILogger } from '../../../logging/interfaces';

interface APIGatewayConfig {
  port: number;
  routes: RouteDefinition[];
  serviceRegistry: ServiceRegistryInterface;
  loadBalancer: LoadBalancerInterface;
  circuitBreaker: CircuitBreakerInterface;
}

/**
 * API Gateway implementation for intelligent routing
 */
export class APIGateway implements APIGatewayInterface {
  private routes = new Map<string, RouteDefinition>();

  constructor(
    private config: APIGatewayConfig,
    private logger?: ILogger
  ) {
    this.initializeRoutes();
    this.log('info', `API Gateway initialized on port ${config.port}`);
  }

  /**
   * Routes incoming requests to appropriate services
   */
  async route(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    
    try {
      // Find matching route
      const route = this.findRoute(request.path, request.method);
      if (!route) {
        return {
          statusCode: 404,
          headers: {},
          body: { error: 'Route not found' },
          duration: Date.now() - startTime,
          service: 'gateway'
        };
      }

      // Select service instance
      const service = await this.config.loadBalancer.selectService(route.service);
      
      // Route request through circuit breaker
      const response = await this.config.circuitBreaker.execute(async () => {
        // Mock service call - in real implementation would use HTTP client
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: { message: 'Success from ' + service.name },
          duration: Date.now() - startTime
        };
      });

      return {
        ...response,
        service: service.name
      };

    } catch (error) {
      this.log('error', `Gateway routing failed for ${request.path}: ${error}`);
      
      return {
        statusCode: 500,
        headers: {},
        body: { error: 'Internal server error' },
        duration: Date.now() - startTime,
        service: 'gateway'
      };
    }
  }

  /**
   * Adds a new route definition
   */
  addRoute(route: RouteDefinition): void {
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);
    this.log('info', `Route added: ${route.method} ${route.path} -> ${route.service}`);
  }

  /**
   * Removes a route definition
   */
  removeRoute(routeId: string): void {
    for (const [key, route] of this.routes) {
      if (route.id === routeId) {
        this.routes.delete(key);
        this.log('info', `Route removed: ${routeId}`);
        return;
      }
    }
  }

  /**
   * Gets all route definitions
   */
  getRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  /**
   * Initializes routes from configuration
   */
  private initializeRoutes(): void {
    for (const route of this.config.routes) {
      this.addRoute(route);
    }
  }

  /**
   * Finds matching route for request
   */
  private findRoute(path: string, method: string): RouteDefinition | undefined {
    const key = `${method}:${path}`;
    return this.routes.get(key);
  }

  /**
   * Helper for logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      switch (level) {
        case 'info':
          if ('info' in this.logger) {
            (this.logger as any).info(`[APIGateway] ${message}`, meta);
          }
          break;
        case 'warn':
          if ('warn' in this.logger) {
            (this.logger as any).warn(`[APIGateway] ${message}`, meta);
          }
          break;
        case 'error':
          if ('error' in this.logger) {
            (this.logger as any).error(`[APIGateway] ${message}`, meta);
          }
          break;
      }
    } else {
      console.log(`[${level.toUpperCase()}] [APIGateway] ${message}`, meta || '');
    }
  }
}
