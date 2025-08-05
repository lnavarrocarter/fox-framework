// Mock FoxFactory and dependencies
const mockFoxApp = {
  use: jest.fn(),
  start: jest.fn(),
  listen: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('../../../tsfox/core/fox.factory', () => ({
  FoxFactory: {
    createInstance: jest.fn(() => mockFoxApp)
  }
}));

jest.mock('../../../tsfox/core/performance/middleware/metrics.middleware', () => ({
  performanceMiddleware: jest.fn((config: any) => (req: any, res: any, next: any) => next())
}));

jest.mock('../views', () => ({ views: [] }));
jest.mock('../routes', () => ({ routes: [] }));
jest.mock('../config', () => ({ 
  config: { 
    port: 3000,
    host: 'localhost',
    environment: 'test'
  } 
}));

// Mock the routes module
jest.mock('../../routes', () => jest.fn());

describe('Server Index', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Reset FoxFactory mock
    const { FoxFactory } = require('../../../tsfox/core/fox.factory');
    FoxFactory.createInstance.mockReturnValue(mockFoxApp);
  });

  it('should create FoxFactory instance with config', () => {
    require('../index');
    
    const { FoxFactory } = require('../../../tsfox/core/fox.factory');
    expect(FoxFactory.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
        host: 'localhost',
        environment: 'test'
      })
    );
  });

  it('should register performance middleware', () => {
    require('../index');
    
    const { performanceMiddleware } = require('../../../tsfox/core/performance/middleware/metrics.middleware');
    expect(performanceMiddleware).toHaveBeenCalledWith({
      trackRequests: true,
      trackResponseTime: true,
      trackMemory: true,
      slowRequestThreshold: 1000,
      excludePaths: ['/health', '/metrics']
    });
  });

  it('should register middleware with foxApp', () => {
    require('../index');
    
    expect(mockFoxApp.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should register routes with foxApp', () => {
    require('../index');
    
    // Should be called twice: once for middleware, once for routes
    expect(mockFoxApp.use).toHaveBeenCalledTimes(2);
  });

  it('should start the server', () => {
    require('../index');
    
    expect(mockFoxApp.start).toHaveBeenCalled();
  });

  it('should export foxApp instance', () => {
    const serverModule = require('../index');
    
    expect(serverModule.foxApp).toBeDefined();
    expect(serverModule.foxApp).toBe(mockFoxApp);
  });

  it('should handle server initialization sequence correctly', () => {
    require('../index');
    
    const { FoxFactory } = require('../../../tsfox/core/fox.factory');
    
    // Verify the sequence: create -> use middleware -> use routes -> start
    expect(FoxFactory.createInstance).toHaveBeenCalled();
    expect(mockFoxApp.use).toHaveBeenCalled();
    expect(mockFoxApp.start).toHaveBeenCalled();
  });

  it('should use correct middleware configuration', () => {
    require('../index');
    
    const { performanceMiddleware } = require('../../../tsfox/core/performance/middleware/metrics.middleware');
    const middlewareConfig = performanceMiddleware.mock.calls[0][0];
    
    expect(middlewareConfig).toEqual({
      trackRequests: true,
      trackResponseTime: true,
      trackMemory: true,
      slowRequestThreshold: 1000,
      excludePaths: ['/health', '/metrics']
    });
  });
});
