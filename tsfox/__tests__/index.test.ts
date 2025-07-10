/**
 * Tests for TSFox Main Module
 * Testing the main exports and startServer function
 */

import { startServer, Router, HttpError, ServerConfig } from '../index';
import { FoxFactory } from '../core/fox.factory';

// Mock the FoxFactory to avoid actual server creation
jest.mock('../core/fox.factory');

describe('TSFox Main Module', () => {
  let mockConfig: ServerConfig;
  let mockApp: any;

  beforeEach(() => {
    mockConfig = {
      port: 3000,
      env: 'test',
      jsonSpaces: 2,
      staticFolder: 'public'
    };

    mockApp = {
      start: jest.fn()
    };

    // Mock FoxFactory.createInstance
    (FoxFactory.createInstance as jest.Mock).mockReturnValue(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startServer', () => {
    it('should create instance with config and start server', () => {
      startServer(mockConfig);

      expect(FoxFactory.createInstance).toHaveBeenCalledWith(mockConfig);
      expect(mockApp.start).toHaveBeenCalled();
    });

    it('should handle different server configurations', () => {
      const customConfig: ServerConfig = {
        port: 8080,
        env: 'production',
        jsonSpaces: 4,
        staticFolder: 'assets',
        middlewares: []
      };

      startServer(customConfig);

      expect(FoxFactory.createInstance).toHaveBeenCalledWith(customConfig);
      expect(mockApp.start).toHaveBeenCalled();
    });

    it('should work with minimal config', () => {
      const minimalConfig: ServerConfig = {
        port: 3000,
        env: 'development',
        jsonSpaces: 2,
        staticFolder: 'public'
      };

      startServer(minimalConfig);

      expect(FoxFactory.createInstance).toHaveBeenCalledWith(minimalConfig);
      expect(mockApp.start).toHaveBeenCalled();
    });
  });

  describe('Exports', () => {
    it('should export startServer function', () => {
      expect(typeof startServer).toBe('function');
    });

    it('should export Router', () => {
      expect(Router).toBeDefined();
    });

    it('should export HttpError', () => {
      expect(HttpError).toBeDefined();
      expect(typeof HttpError).toBe('function');
    });

    it('should export types correctly', () => {
      // Test that we can create an HttpError instance
      const error = new HttpError(404, 'Not found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
    });
  });
});
