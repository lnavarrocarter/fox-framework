import request from 'supertest';
import { FoxFactory } from '../core/fox.factory';
import { ServerConfig } from '../core/types';
import { RequestMethod } from '../core/enums/methods.enums';
import { RequestMethodsContext } from '../core/enums/request.enums';

// Mock to prevent actual server startup in tests
jest.mock('../core/features/foxserver.feature', () => {
  return {
    FoxServer: jest.fn().mockImplementation(() => {
      const express = require('express');
      const app = express();
      
      // Configure app with basic middleware
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      
      return {
        create: jest.fn(),
        start: jest.fn(),
        destroy: jest.fn(),
        listen: app.listen.bind(app),
        get: app.get.bind(app),
        post: app.post.bind(app),
        put: app.put.bind(app),
        delete: app.delete.bind(app),
        patch: app.patch.bind(app),
        use: app.use.bind(app),
        set: app.set.bind(app),
        engine: app.engine.bind(app),
        render: jest.fn(),
        _app: app // Expose app for testing
      };
    })
  };
});

describe('Fox Framework Integration Tests', () => {
  let server: any;
  let config: ServerConfig;

  beforeEach(() => {
    // Clear any existing instance
    (FoxFactory as any).instance = null;
    
    config = {
      port: 3000,
      env: 'test',
      jsonSpaces: 2,
      staticFolder: 'public'
    };
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    (FoxFactory as any).instance = null;
    jest.clearAllMocks();
  });

  describe('Server Startup and Basic Routes', () => {
    it('should start server and respond to default route', async () => {
      const instance = FoxFactory.createInstance(config);
      
      // Get the underlying Express app for testing
      const app = (instance as any)._app;
      
      const response = await request(app)
        .get('/api/')
        .expect(200);
      
      expect(response.body).toEqual({ message: 'Hello World!' });
    });

    it('should handle custom GET routes', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/users',
          callback: (req: any, res: any) => {
            res.json({ users: [] });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual({ users: [] });
    });

    it('should handle POST routes with data', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.POST,
          path: '/users',
          callback: (req: any, res: any) => {
            res.status(201).json({ 
              id: 1, 
              name: req.body.name,
              created: true 
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const userData = { name: 'John Doe', email: 'john@example.com' };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        id: 1,
        name: 'John Doe',
        created: true
      });
    });

    it('should handle PUT routes', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.PUT,
          path: '/users/:id',
          callback: (req: any, res: any) => {
            res.json({ 
              id: req.params.id,
              name: req.body.name,
              updated: true 
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const updateData = { name: 'Jane Doe' };

      const response = await request(app)
        .put('/api/users/123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        name: 'Jane Doe',
        updated: true
      });
    });

    it('should handle DELETE routes', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.DELETE,
          path: '/users/:id',
          callback: (req: any, res: any) => {
            res.json({ 
              id: req.params.id,
              deleted: true 
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const response = await request(app)
        .delete('/api/users/123')
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        deleted: true
      });
    });
  });

  describe('Multiple Routes and Complex Scenarios', () => {
    it('should handle multiple routes for the same resource', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/posts',
          callback: (req: any, res: any) => {
            res.json({ posts: [{ id: 1, title: 'Test Post' }] });
          }
        },
        {
          method: RequestMethod.POST,
          path: '/posts',
          callback: (req: any, res: any) => {
            res.status(201).json({ 
              id: 2, 
              title: req.body.title,
              created: true 
            });
          }
        },
        {
          method: RequestMethod.GET,
          path: '/posts/:id',
          callback: (req: any, res: any) => {
            res.json({ 
              id: req.params.id, 
              title: 'Test Post',
              content: 'Test content' 
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      // Test GET all posts
      const getAllResponse = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(getAllResponse.body.posts).toHaveLength(1);

      // Test POST new post
      const postData = { title: 'New Post', content: 'New content' };
      const createResponse = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(createResponse.body.title).toBe('New Post');

      // Test GET specific post
      const getOneResponse = await request(app)
        .get('/api/posts/1')
        .expect(200);

      expect(getOneResponse.body.id).toBe('1');
    });

    it('should handle route parameters correctly', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/users/:userId/posts/:postId',
          callback: (req: any, res: any) => {
            res.json({
              userId: req.params.userId,
              postId: req.params.postId,
              data: 'nested resource'
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const response = await request(app)
        .get('/api/users/123/posts/456')
        .expect(200);

      expect(response.body).toEqual({
        userId: '123',
        postId: '456',
        data: 'nested resource'
      });
    });

    it('should handle query parameters', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/search',
          callback: (req: any, res: any) => {
            res.json({
              query: req.query.q,
              limit: req.query.limit || 10,
              page: req.query.page || 1
            });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      const response = await request(app)
        .get('/api/search?q=test&limit=5&page=2')
        .expect(200);

      expect(response.body).toEqual({
        query: 'test',
        limit: '5',
        page: '2'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const instance = FoxFactory.createInstance(config);
      const app = (instance as any)._app;

      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle errors thrown in route handlers', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/error',
          callback: (req: any, res: any, next: any) => {
            const error = new Error('Test error');
            next(error);
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      const instance = FoxFactory.createInstance(configWithRequests);
      const app = (instance as any)._app;

      // Note: This test may need adjustment based on actual error handling implementation
      await request(app)
        .get('/api/error')
        .expect(500);
    });
  });

  describe('Singleton Behavior', () => {
    it('should return the same instance across multiple calls', () => {
      const instance1 = FoxFactory.createInstance(config);
      const instance2 = FoxFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain routes across getInstance calls', async () => {
      const requests: RequestMethodsContext[] = [
        {
          method: RequestMethod.GET,
          path: '/singleton-test',
          callback: (req: any, res: any) => {
            res.json({ singleton: true });
          }
        }
      ];

      const configWithRequests = { ...config, requests };
      
      // Create instance with routes
      FoxFactory.createInstance(configWithRequests);
      
      // Get instance again
      const instance = FoxFactory.getInstance();
      const app = (instance as any)._app;

      const response = await request(app)
        .get('/api/singleton-test')
        .expect(200);

      expect(response.body).toEqual({ singleton: true });
    });
  });
});
