/**
 * Tests for Health Check System
 */

import {
  HealthChecker,
  defaultHealthChecks,
  createDatabaseCheck,
  createExternalServiceCheck,
  createHealthCheckMiddleware,
  type HealthCheckResult,
  type CheckResult
} from '../health-check';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Health Check System', () => {
  describe('HealthChecker', () => {
    let healthChecker: HealthChecker;

    beforeEach(() => {
      healthChecker = new HealthChecker('1.0.0', { env: 'test' });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create health checker with version and metadata', () => {
      const checker = new HealthChecker('2.0.0', { region: 'us-east-1' });
      expect(checker).toBeDefined();
    });

    it('should add and remove health checks', () => {
      const mockCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', mockCheck);
      expect(healthChecker.getRegisteredChecks()).toContain('test');

      const removed = healthChecker.removeCheck('test');
      expect(removed).toBe(true);
      expect(healthChecker.getRegisteredChecks()).not.toContain('test');
    });

    it('should return healthy status when all checks pass', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString(),
        output: 'All good'
      });

      healthChecker.addCheck('test1', passingCheck);
      healthChecker.addCheck('test2', passingCheck);

      const status = await healthChecker.getStatus();

      expect(status.status).toBe('healthy');
      expect(status.checks.test1.status).toBe('pass');
      expect(status.checks.test2.status).toBe('pass');
      expect(status.version).toBe('1.0.0');
      expect(status.metadata).toEqual({ env: 'test' });
    });

    it('should return degraded status when some checks warn', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      const warningCheck = jest.fn().mockResolvedValue({
        status: 'warn',
        time: new Date().toISOString(),
        output: 'High memory usage'
      });

      healthChecker.addCheck('passing', passingCheck);
      healthChecker.addCheck('warning', warningCheck);

      const status = await healthChecker.getStatus();

      expect(status.status).toBe('degraded');
      expect(status.checks.passing.status).toBe('pass');
      expect(status.checks.warning.status).toBe('warn');
    });

    it('should return unhealthy status when any check fails', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      const failingCheck = jest.fn().mockResolvedValue({
        status: 'fail',
        time: new Date().toISOString(),
        error: 'Database unreachable'
      });

      healthChecker.addCheck('passing', passingCheck);
      healthChecker.addCheck('failing', failingCheck);

      const status = await healthChecker.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.checks.passing.status).toBe('pass');
      expect(status.checks.failing.status).toBe('fail');
    });

    it('should handle check timeouts', async () => {
      const slowCheck = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
      );

      healthChecker.setTimeout(100); // 100ms timeout
      healthChecker.addCheck('slow', slowCheck);

      const status = await healthChecker.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.checks.slow.status).toBe('fail');
      expect(status.checks.slow.error).toContain('timeout');
    });

    it('should handle check exceptions', async () => {
      const throwingCheck = jest.fn().mockRejectedValue(new Error('Check failed'));

      healthChecker.addCheck('throwing', throwingCheck);

      const status = await healthChecker.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.checks.throwing.status).toBe('fail');
      expect(status.checks.throwing.error).toBe('Check failed');
    });

    it('should provide simple status', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', passingCheck);

      const simpleStatus = await healthChecker.getSimpleStatus();

      expect(simpleStatus.status).toBe('healthy');
      expect(simpleStatus.timestamp).toBeDefined();
    });

    it('should check if system is healthy', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', passingCheck);

      const isHealthy = await healthChecker.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should track uptime', async () => {
      const status = await healthChecker.getStatus();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include duration in check results', async () => {
      const check = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('timed', check);

      const status = await healthChecker.getStatus();

      expect(status.checks.timed.duration).toBeDefined();
      expect(status.checks.timed.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Default Health Checks', () => {
    it('should provide memory check', async () => {
      const result = await defaultHealthChecks.memory();

      expect(result.status).toMatch(/^(pass|warn|fail)$/);
      expect(result.time).toBeDefined();
      expect(result.output).toContain('Memory usage');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.heapUsed).toBeDefined();
    });

    it('should provide uptime check', async () => {
      const result = await defaultHealthChecks.uptime();

      expect(result.status).toBe('pass');
      expect(result.time).toBeDefined();
      expect(result.output).toContain('Uptime');
      expect(result.metadata?.uptimeSeconds).toBeDefined();
    });

    it('should provide CPU check', async () => {
      const result = await defaultHealthChecks.cpu();

      expect(result.status).toBe('pass');
      expect(result.time).toBeDefined();
      expect(result.output).toContain('CPU usage');
      expect(result.metadata).toBeDefined();
    });

    it('should provide disk check', async () => {
      const result = await defaultHealthChecks.disk();

      expect(result.status).toMatch(/^(pass|fail)$/);
      expect(result.time).toBeDefined();
      expect(result.metadata?.accessible).toBeDefined();
    });

    it('should provide environment check', async () => {
      const result = await defaultHealthChecks.environment();

      expect(result.status).toMatch(/^(pass|warn)$/);
      expect(result.time).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Database Check Factory', () => {
    it('should create passing database check', async () => {
      const mockConnection = jest.fn().mockResolvedValue(true);
      const check = createDatabaseCheck('postgres', mockConnection);

      const result = await check();

      expect(result.status).toBe('pass');
      expect(result.output).toContain('postgres database connection is healthy');
      expect(result.metadata?.connected).toBe(true);
      expect(result.metadata?.database).toBe('postgres');
    });

    it('should create failing database check for connection failure', async () => {
      const mockConnection = jest.fn().mockResolvedValue(false);
      const check = createDatabaseCheck('mysql', mockConnection);

      const result = await check();

      expect(result.status).toBe('fail');
      expect(result.error).toContain('mysql database connection failed');
      expect(result.metadata?.connected).toBe(false);
    });

    it('should handle database check exceptions', async () => {
      const mockConnection = jest.fn().mockRejectedValue(new Error('Connection error'));
      const check = createDatabaseCheck('redis', mockConnection);

      const result = await check();

      expect(result.status).toBe('fail');
      expect(result.error).toBe('Connection error');
      expect(result.metadata?.connected).toBe(false);
    });
  });

  describe('External Service Check Factory', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('should create passing service check', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const check = createExternalServiceCheck('api', 'http://api.example.com/health');

      const result = await check();

      expect(result.status).toBe('pass');
      expect(result.output).toContain('api service is healthy');
      expect(result.metadata?.statusCode).toBe(200);
    });

    it('should create failing service check for non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503
      });

      const check = createExternalServiceCheck('api', 'http://api.example.com/health');

      const result = await check();

      expect(result.status).toBe('fail');
      expect(result.error).toContain('api returned status 503');
      expect(result.metadata?.statusCode).toBe(503);
    });

    it('should handle service check exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const check = createExternalServiceCheck('api', 'http://api.example.com/health');

      const result = await check();

      expect(result.status).toBe('fail');
      expect(result.error).toBe('Network error');
    });
  });

  describe('Health Check Middleware', () => {
    let healthChecker: HealthChecker;
    let middleware: any;
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      healthChecker = new HealthChecker();
      middleware = createHealthCheckMiddleware(healthChecker);
      
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should provide full health check endpoint', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', passingCheck);

      await middleware.full(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.any(Object)
        })
      );
    });

    it('should provide simple health check endpoint', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', passingCheck);

      await middleware.simple(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy'
        })
      );
    });

    it('should provide readiness check endpoint', async () => {
      const passingCheck = jest.fn().mockResolvedValue({
        status: 'pass',
        time: new Date().toISOString()
      });

      healthChecker.addCheck('test', passingCheck);

      await middleware.ready(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready'
        })
      );
    });

    it('should provide liveness check endpoint', async () => {
      await middleware.live(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'alive',
          uptime: expect.any(Number)
        })
      );
    });

    it('should handle health check errors gracefully', async () => {
      const throwingCheck = jest.fn().mockRejectedValue(new Error('Check failed'));
      healthChecker.addCheck('failing', throwingCheck);

      await middleware.full(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy'
        })
      );
    });
  });
});
