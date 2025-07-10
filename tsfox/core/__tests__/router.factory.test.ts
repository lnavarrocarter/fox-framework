import { Router } from '../router.factory';
import { Route } from '../types';

// Mock Express
jest.mock('express', () => ({
  Router: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    use: jest.fn()
  }))
}));

describe('Router', () => {
  let router: Router;
  let mockApp: any;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new Router();
    
    // Mock Express app
    mockApp = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      use: jest.fn()
    };
  });

  describe('register', () => {
    it('should register a GET route', () => {
      const route: Route = {
        path: '/users',
        method: 'GET',
        handler: jest.fn()
      };

      router.register(route);
      
      // Access private routes property for testing
      const routes = (router as any).routes;
      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual(route);
    });

    it('should register multiple routes', () => {
      const routes: Route[] = [
        { path: '/users', method: 'GET', handler: jest.fn() },
        { path: '/users', method: 'POST', handler: jest.fn() },
        { path: '/users/:id', method: 'PUT', handler: jest.fn() }
      ];

      routes.forEach(route => router.register(route));
      
      const registeredRoutes = (router as any).routes;
      expect(registeredRoutes).toHaveLength(3);
    });

    it('should register routes with different methods', () => {
      const getRoute: Route = { path: '/test', method: 'GET', handler: jest.fn() };
      const postRoute: Route = { path: '/test', method: 'POST', handler: jest.fn() };
      const putRoute: Route = { path: '/test', method: 'PUT', handler: jest.fn() };
      const deleteRoute: Route = { path: '/test', method: 'DELETE', handler: jest.fn() };

      router.register(getRoute);
      router.register(postRoute);
      router.register(putRoute);
      router.register(deleteRoute);

      const routes = (router as any).routes;
      expect(routes).toHaveLength(4);
      expect(routes.map((r: Route) => r.method)).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    });
  });

  describe('applyRoutes', () => {
    it('should apply GET routes to Express app', () => {
      const handler = jest.fn();
      const route: Route = {
        path: '/users',
        method: 'GET',
        handler
      };

      router.register(route);
      router.applyRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/users', handler);
    });

    it('should apply POST routes to Express app', () => {
      const handler = jest.fn();
      const route: Route = {
        path: '/users',
        method: 'POST',
        handler
      };

      router.register(route);
      router.applyRoutes(mockApp);

      expect(mockApp.post).toHaveBeenCalledWith('/users', handler);
    });

    it('should apply multiple routes to Express app', () => {
      const getHandler = jest.fn();
      const postHandler = jest.fn();
      
      const routes: Route[] = [
        { path: '/users', method: 'GET', handler: getHandler },
        { path: '/users', method: 'POST', handler: postHandler }
      ];

      routes.forEach(route => router.register(route));
      router.applyRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/users', getHandler);
      expect(mockApp.post).toHaveBeenCalledWith('/users', postHandler);
    });

    it('should handle PUT and DELETE routes', () => {
      const putHandler = jest.fn();
      const deleteHandler = jest.fn();
      
      const routes: Route[] = [
        { path: '/users/:id', method: 'PUT', handler: putHandler },
        { path: '/users/:id', method: 'DELETE', handler: deleteHandler }
      ];

      routes.forEach(route => router.register(route));
      router.applyRoutes(mockApp);

      expect(mockApp.put).toHaveBeenCalledWith('/users/:id', putHandler);
      expect(mockApp.delete).toHaveBeenCalledWith('/users/:id', deleteHandler);
    });

    it('should handle empty routes gracefully', () => {
      router.applyRoutes(mockApp);

      expect(mockApp.get).not.toHaveBeenCalled();
      expect(mockApp.post).not.toHaveBeenCalled();
      expect(mockApp.put).not.toHaveBeenCalled();
      expect(mockApp.delete).not.toHaveBeenCalled();
    });

    it('should handle complex route paths', () => {
      const handler = jest.fn();
      const complexRoutes: Route[] = [
        { path: '/api/v1/users/:id/posts', method: 'GET', handler },
        { path: '/api/v1/users/:userId/posts/:postId', method: 'PUT', handler }
      ];

      complexRoutes.forEach(route => router.register(route));
      router.applyRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/api/v1/users/:id/posts', handler);
      expect(mockApp.put).toHaveBeenCalledWith('/api/v1/users/:userId/posts/:postId', handler);
    });
  });

  describe('Router Integration', () => {
    it('should maintain route order', () => {
      const routes: Route[] = [
        { path: '/first', method: 'GET', handler: jest.fn() },
        { path: '/second', method: 'GET', handler: jest.fn() },
        { path: '/third', method: 'GET', handler: jest.fn() }
      ];

      routes.forEach(route => router.register(route));
      
      const registeredRoutes = (router as any).routes;
      expect(registeredRoutes[0].path).toBe('/first');
      expect(registeredRoutes[1].path).toBe('/second');
      expect(registeredRoutes[2].path).toBe('/third');
    });

    it('should preserve handler functions', () => {
      const originalHandler = jest.fn();
      const route: Route = {
        path: '/test',
        method: 'GET',
        handler: originalHandler
      };

      router.register(route);
      router.applyRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/test', originalHandler);
    });
  });
});
