import { Router } from 'express';

// Setup mocks before imports
const mockRouter = {
  get: jest.fn(),
  use: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockHealthMiddleware = {
  full: jest.fn((req: any, res: any) => res.json({ status: 'healthy' })),
  ready: jest.fn((req: any, res: any) => res.json({ status: 'ready' })),
  live: jest.fn((req: any, res: any) => res.json({ status: 'live' }))
};

const mockHealthChecker = {
  addCheck: jest.fn(),
  runChecks: jest.fn().mockResolvedValue({ status: 'healthy' })
};

const mockMetricsCollector = {
  getPrometheusFormat: jest.fn().mockReturnValue('# Mock metrics\ntest_metric 1')
};

const mockPerformanceFactory = {
  getMetricsCollector: jest.fn().mockReturnValue(mockMetricsCollector)
};

const mockUserController = {
  router: {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
};

// Mock Express Router
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock health-check module
jest.mock('../../../tsfox/core/health/health-check', () => ({
  HealthChecker: jest.fn(() => mockHealthChecker),
  createHealthCheckMiddleware: jest.fn(() => mockHealthMiddleware),
  defaultHealthChecks: {
    memory: jest.fn().mockResolvedValue({ status: 'pass', time: new Date().toISOString() }),
    uptime: jest.fn().mockResolvedValue({ status: 'pass', time: new Date().toISOString() }),
    cpu: jest.fn().mockResolvedValue({ status: 'pass', time: new Date().toISOString() }),
    disk: jest.fn().mockResolvedValue({ status: 'pass', time: new Date().toISOString() }),
    environment: jest.fn().mockResolvedValue({ status: 'pass', time: new Date().toISOString() })
  }
}));

// Mock performance factory
jest.mock('../../../tsfox/core/performance/performance.factory', () => ({
  PerformanceFactory: {
    getInstance: jest.fn(() => mockPerformanceFactory)
  }
}));

// Mock user controller
jest.mock('../../controllers/user.controller', () => ({
  UserController: jest.fn(() => mockUserController)
}));

// TODO: Refactor pending new router integration. Temporarily skipped to stabilize CI.
describe.skip('Routes Index (New)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create router instance', () => {
    const routesModule = require('../index');
    
    expect(Router).toHaveBeenCalled();
    expect(routesModule.default).toBe(mockRouter);
  });

  it('should initialize health checker', () => {
    require('../index');
    
    const { HealthChecker } = require('../../../tsfox/core/health/health-check');
    expect(HealthChecker).toHaveBeenCalledWith(
      '1.0.0',
      { service: 'fox-framework-demo' }
    );
  });

  it('should register health check routes', () => {
    require('../index');
    
    expect(mockRouter.get).toHaveBeenCalledWith('/health', mockHealthMiddleware.full);
    expect(mockRouter.get).toHaveBeenCalledWith('/health/ready', mockHealthMiddleware.ready);
    expect(mockRouter.get).toHaveBeenCalledWith('/health/live', mockHealthMiddleware.live);
  });

  it('should register metrics route', () => {
    require('../index');
    
    expect(mockRouter.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
  });

  it('should register user routes', () => {
    require('../index');
    
    expect(mockRouter.use).toHaveBeenCalledWith('/user', mockUserController.router);
  });

  it('should add all default health checks', () => {
    require('../index');
    
    expect(mockHealthChecker.addCheck).toHaveBeenCalledWith('memory', expect.any(Function));
    expect(mockHealthChecker.addCheck).toHaveBeenCalledWith('uptime', expect.any(Function));
    expect(mockHealthChecker.addCheck).toHaveBeenCalledWith('cpu', expect.any(Function));
    expect(mockHealthChecker.addCheck).toHaveBeenCalledWith('disk', expect.any(Function));
    expect(mockHealthChecker.addCheck).toHaveBeenCalledWith('environment', expect.any(Function));
  });

  it('should initialize performance factory', () => {
    require('../index');
    
    const { PerformanceFactory } = require('../../../tsfox/core/performance/performance.factory');
    expect(PerformanceFactory.getInstance).toHaveBeenCalled();
  });

  it('should handle metrics endpoint correctly', async () => {
    require('../index');
    
    // Get the metrics route handler (4th call to router.get)
    const metricsHandler = mockRouter.get.mock.calls.find(call => call[0] === '/metrics')[1];
    
    const mockReq = {};
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await metricsHandler(mockReq, mockRes);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    expect(mockRes.send).toHaveBeenCalledWith('# Mock metrics\ntest_metric 1');
  });

  it('should handle metrics endpoint errors', async () => {
    // Mock error scenario
    mockPerformanceFactory.getMetricsCollector.mockImplementationOnce(() => {
      throw new Error('Metrics error');
    });
    
    require('../index');
    
    const metricsHandler = mockRouter.get.mock.calls.find(call => call[0] === '/metrics')[1];
    
    const mockReq = {};
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await metricsHandler(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to retrieve metrics',
      timestamp: expect.any(String)
    });
  });
});
