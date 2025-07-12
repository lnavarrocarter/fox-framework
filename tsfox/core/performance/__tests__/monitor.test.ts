/**
 * @fileoverview Tests for performance monitoring system
 */

import { 
  PerformanceMonitor, 
  PerformanceDashboard, 
  PerformanceReporter,
  type MonitoringConfig,
  type Alert 
} from '../monitoring/monitor';

describe('PerformanceMonitor', () => {
  let defaultConfig: MonitoringConfig;

  beforeEach(() => {
    defaultConfig = {
      interval: 100, // Fast interval for testing
      maxDataPoints: 100,
      thresholds: {
        cpuUsage: 80,
        memoryUsage: 1000,
        responseTime: 100,
        errorRate: 5,
        requestsPerSecond: 100
      },
      enabledMetrics: {
        cpu: true,
        memory: true,
        requests: true,
        responses: true,
        errors: true,
        custom: true
      }
    };
  });

  describe('initialization', () => {
    it('should create monitor with valid configuration', () => {
      const monitor = new PerformanceMonitor(defaultConfig);
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
      
      const config = monitor.getConfig();
      expect(config).toEqual(defaultConfig);
    });

    it('should initialize with default alerts', () => {
      const monitor = new PerformanceMonitor(defaultConfig);
      const alerts = monitor.getAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.id === 'high_cpu')).toBe(true);
      expect(alerts.some(alert => alert.id === 'high_memory')).toBe(true);
      expect(alerts.some(alert => alert.id === 'slow_response')).toBe(true);
    });
  });

  describe('monitoring lifecycle', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor(defaultConfig);
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should start and stop monitoring', (done) => {
      expect(monitor).toBeDefined();
      
      monitor.start();
      
      setTimeout(() => {
        monitor.stop();
        done();
      }, 150);
    });

    it('should collect metrics when running', (done) => {
      monitor.start();
      
      setTimeout(() => {
        const metrics = monitor.getCurrentMetrics();
        
        expect(metrics).toBeDefined();
        expect(metrics.timestamp).toBeGreaterThan(0);
        expect(metrics.system).toBeDefined();
        expect(metrics.http).toBeDefined();
        expect(metrics.application).toBeDefined();
        
        monitor.stop();
        done();
      }, 150);
    });

    it('should prevent starting when already running', () => {
      monitor.start();
      
      // Starting again should not throw but should warn
      expect(() => monitor.start()).not.toThrow();
      
      monitor.stop();
    });
  });

  describe('custom metrics', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor(defaultConfig);
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should accept custom metrics', () => {
      monitor.addCustomMetric('test.metric', 42.5);
      monitor.addCustomMetric('user.count', 100);
      
      const history = monitor.getMetricHistory('custom.test.metric');
      expect(history.length).toBe(1);
      expect(history[0].value).toBe(42.5);
    });

    it('should record request metrics', () => {
      monitor.recordRequest(25, 200, '/api/test');
      monitor.recordRequest(150, 404, '/api/missing');
      monitor.recordRequest(75, 500, '/api/error');
      
      const responseTimeHistory = monitor.getMetricHistory('response.time.avg');
      const requestHistory = monitor.getMetricHistory('requests.total');
      
      expect(responseTimeHistory.length).toBe(3);
      expect(requestHistory.length).toBe(3);
    });
  });

  describe('metric history', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor({
        ...defaultConfig,
        maxDataPoints: 5 // Small limit for testing
      });
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should limit data points to maxDataPoints', () => {
      // Add more points than the limit
      for (let i = 0; i < 10; i++) {
        monitor.addCustomMetric('test.limit', i);
      }
      
      const history = monitor.getMetricHistory('custom.test.limit');
      expect(history.length).toBe(5);
      
      // Should keep the latest points
      expect(history[history.length - 1].value).toBe(9);
    });

    it('should filter history by time range', () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      monitor.addCustomMetric('test.time', 1);
      
      const recentHistory = monitor.getMetricHistory('custom.test.time', {
        start: oneMinuteAgo,
        end: now + 1000
      });
      
      expect(recentHistory.length).toBe(1);
      
      const futureHistory = monitor.getMetricHistory('custom.test.time', {
        start: now + 10000,
        end: now + 20000
      });
      
      expect(futureHistory.length).toBe(0);
    });
  });

  describe('alerts', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor(defaultConfig);
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should manage custom alerts', () => {
      const customAlert: Alert = {
        id: 'custom_test',
        name: 'Custom Test Alert',
        condition: 'custom.test > threshold',
        threshold: 50,
        severity: 'medium',
        enabled: true,
        triggered: false,
        message: 'Custom test value is too high'
      };

      monitor.addAlert(customAlert);
      
      const alerts = monitor.getAlerts();
      const addedAlert = alerts.find(a => a.id === 'custom_test');
      
      expect(addedAlert).toBeDefined();
      expect(addedAlert?.name).toBe('Custom Test Alert');
    });

    it('should update alert configuration', () => {
      monitor.updateAlert('high_cpu', { threshold: 90 });
      
      const alerts = monitor.getAlerts();
      const cpuAlert = alerts.find(a => a.id === 'high_cpu');
      
      expect(cpuAlert?.threshold).toBe(90);
    });

    it('should remove alerts', () => {
      monitor.removeAlert('high_cpu');
      
      const alerts = monitor.getAlerts();
      const cpuAlert = alerts.find(a => a.id === 'high_cpu');
      
      expect(cpuAlert).toBeUndefined();
    });
  });

  describe('real-time subscriptions', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor(defaultConfig);
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should notify subscribers of metric updates', (done) => {
      let callCount = 0;
      
      const unsubscribe = monitor.subscribe((metrics) => {
        callCount++;
        expect(metrics).toBeDefined();
        expect(metrics.timestamp).toBeGreaterThan(0);
        
        if (callCount >= 2) {
          unsubscribe();
          done();
        }
      });
      
      monitor.start();
    });

    it('should allow unsubscribing', (done) => {
      let callCount = 0;
      
      const unsubscribe = monitor.subscribe(() => {
        callCount++;
      });
      
      monitor.start();
      
      setTimeout(() => {
        unsubscribe();
        const previousCount = callCount;
        
        setTimeout(() => {
          // Should not have increased after unsubscribe
          expect(callCount).toBe(previousCount);
          done();
        }, 100);
      }, 100);
    });
  });
});

describe('PerformanceDashboard', () => {
  let monitor: PerformanceMonitor;
  let dashboard: PerformanceDashboard;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      interval: 100,
      maxDataPoints: 50,
      thresholds: {
        cpuUsage: 80,
        memoryUsage: 1000,
        responseTime: 100,
        errorRate: 5,
        requestsPerSecond: 100
      },
      enabledMetrics: {
        cpu: true,
        memory: true,
        requests: true,
        responses: true,
        errors: true,
        custom: true
      }
    });
    
    dashboard = new PerformanceDashboard(monitor);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('initialization', () => {
    it('should create dashboard with default widgets', () => {
      expect(dashboard).toBeInstanceOf(PerformanceDashboard);
      
      const widgets = dashboard.getWidgets();
      expect(widgets.length).toBeGreaterThan(0);
      
      const cpuWidget = widgets.find(w => w.id === 'cpu_gauge');
      expect(cpuWidget).toBeDefined();
      expect(cpuWidget?.type).toBe('gauge');
    });
  });

  describe('dashboard data', () => {
    it('should generate dashboard data', () => {
      // Add some test metrics
      monitor.addCustomMetric('test.cpu', 65);
      monitor.addCustomMetric('test.memory', 512);
      
      const data = dashboard.getDashboardData();
      
      expect(data.widgets).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.alerts).toBeDefined();
      expect(data.lastUpdate).toBeGreaterThan(0);
    });

    it('should include triggered alerts', () => {
      // Trigger an alert by updating its status
      monitor.updateAlert('high_cpu', { triggered: true });
      
      const data = dashboard.getDashboardData();
      
      expect(data.alerts.length).toBeGreaterThan(0);
      expect(data.alerts.some(alert => alert.id === 'high_cpu')).toBe(true);
    });
  });

  describe('widget management', () => {
    it('should add custom widgets', () => {
      const customWidget = {
        id: 'custom_test',
        type: 'line' as const,
        title: 'Custom Test Widget',
        metric: 'custom.test',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: { timeRange: '1h' }
      };

      dashboard.addWidget(customWidget);
      
      const widgets = dashboard.getWidgets();
      const addedWidget = widgets.find(w => w.id === 'custom_test');
      
      expect(addedWidget).toBeDefined();
      expect(addedWidget?.title).toBe('Custom Test Widget');
    });

    it('should update widget configuration', () => {
      dashboard.updateWidget('cpu_gauge', { title: 'Updated CPU Widget' });
      
      const widgets = dashboard.getWidgets();
      const cpuWidget = widgets.find(w => w.id === 'cpu_gauge');
      
      expect(cpuWidget?.title).toBe('Updated CPU Widget');
    });

    it('should remove widgets', () => {
      dashboard.removeWidget('cpu_gauge');
      
      const widgets = dashboard.getWidgets();
      const cpuWidget = widgets.find(w => w.id === 'cpu_gauge');
      
      expect(cpuWidget).toBeUndefined();
    });
  });

  describe('configuration management', () => {
    it('should export dashboard configuration', () => {
      const config = dashboard.exportConfig();
      
      expect(config.widgets).toBeDefined();
      expect(config.monitorConfig).toBeDefined();
      expect(config.widgets.length).toBeGreaterThan(0);
    });

    it('should import dashboard configuration', () => {
      const newConfig = {
        widgets: [{
          id: 'imported_widget',
          type: 'number' as const,
          title: 'Imported Widget',
          metric: 'imported.metric',
          position: { x: 0, y: 0, width: 1, height: 1 },
          config: {}
        }],
        monitorConfig: {
          interval: 200
        }
      };

      dashboard.importConfig(newConfig);
      
      const widgets = dashboard.getWidgets();
      const importedWidget = widgets.find(w => w.id === 'imported_widget');
      
      expect(importedWidget).toBeDefined();
      expect(monitor.getConfig().interval).toBe(200);
    });
  });
});

describe('PerformanceReporter', () => {
  let monitor: PerformanceMonitor;
  let reporter: PerformanceReporter;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      interval: 100,
      maxDataPoints: 100,
      thresholds: {
        cpuUsage: 80,
        memoryUsage: 1000,
        responseTime: 100,
        errorRate: 5,
        requestsPerSecond: 100
      },
      enabledMetrics: {
        cpu: true,
        memory: true,
        requests: true,
        responses: true,
        errors: true,
        custom: true
      }
    });
    
    reporter = new PerformanceReporter(monitor);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('report generation', () => {
    it('should generate performance report', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      // Add some test data
      monitor.addCustomMetric('cpu.usage', 65);
      monitor.addCustomMetric('memory.used', 512);
      monitor.addCustomMetric('response.time.avg', 45);
      monitor.recordRequest(25, 200, '/api/test');
      monitor.recordRequest(35, 200, '/api/test2');
      
      const report = reporter.generateReport({
        start: oneHourAgo,
        end: now
      });
      
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate summary statistics correctly', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      // Add test metrics
      monitor.addCustomMetric('cpu.usage', 50);
      monitor.addCustomMetric('cpu.usage', 60);
      monitor.addCustomMetric('cpu.usage', 70);
      
      const report = reporter.generateReport({
        start: oneHourAgo,
        end: now
      });
      
      expect(report.summary.avgCpuUsage).toBeCloseTo(60, 1);
    });

    it('should analyze trends correctly', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      // Add increasing CPU usage
      monitor.addCustomMetric('cpu.usage', 30);
      monitor.addCustomMetric('cpu.usage', 40);
      monitor.addCustomMetric('cpu.usage', 50);
      monitor.addCustomMetric('cpu.usage', 60);
      monitor.addCustomMetric('cpu.usage', 70);
      monitor.addCustomMetric('cpu.usage', 80);
      
      const report = reporter.generateReport({
        start: oneHourAgo,
        end: now
      });
      
      expect(report.trends.cpuTrend).toBe('increasing');
    });

    it('should provide appropriate recommendations', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      // Add metrics that should trigger recommendations
      monitor.addCustomMetric('cpu.usage', 85); // High CPU
      monitor.addCustomMetric('memory.used', 800); // High memory
      monitor.addCustomMetric('response.time.avg', 150); // Slow response
      
      const report = reporter.generateReport({
        start: oneHourAgo,
        end: now
      });
      
      expect(report.recommendations.some(r => 
        r.includes('CPU') || r.includes('cpu')
      )).toBe(true);
      
      expect(report.recommendations.some(r => 
        r.includes('memory') || r.includes('Memory')
      )).toBe(true);
      
      expect(report.recommendations.some(r => 
        r.includes('response') || r.includes('endpoint')
      )).toBe(true);
    });
  });
});

// Integration tests
describe('Performance Monitoring Integration', () => {
  it('should work end-to-end for complete monitoring workflow', (done) => {
    const monitor = new PerformanceMonitor({
      interval: 50, // Very fast for testing
      maxDataPoints: 20,
      thresholds: {
        cpuUsage: 70,
        memoryUsage: 500,
        responseTime: 100,
        errorRate: 5,
        requestsPerSecond: 50
      },
      enabledMetrics: {
        cpu: true,
        memory: true,
        requests: true,
        responses: true,
        errors: true,
        custom: true
      }
    });

    const dashboard = new PerformanceDashboard(monitor);
    const reporter = new PerformanceReporter(monitor);

    let updateCount = 0;
    
    const unsubscribe = monitor.subscribe((metrics) => {
      updateCount++;
      
      if (updateCount >= 3) {
        // 1. Check monitoring is working
        expect(metrics).toBeDefined();
        expect(metrics.system.cpuUsage).toBeGreaterThanOrEqual(0);
        
        // 2. Record some requests
        monitor.recordRequest(25, 200, '/test');
        monitor.recordRequest(75, 200, '/test2');
        monitor.recordRequest(150, 500, '/error');
        
        // 3. Add custom metrics
        monitor.addCustomMetric('business.users', 1000);
        monitor.addCustomMetric('business.revenue', 50000);
        
        // 4. Get dashboard data
        const dashboardData = dashboard.getDashboardData();
        expect(dashboardData.widgets.length).toBeGreaterThan(0);
        expect(dashboardData.lastUpdate).toBeGreaterThan(0);
        
        // 5. Generate performance report
        const now = Date.now();
        const report = reporter.generateReport({
          start: now - 10000, // Last 10 seconds
          end: now
        });
        
        expect(report.summary).toBeDefined();
        expect(report.trends).toBeDefined();
        expect(report.recommendations).toBeDefined();
        
        unsubscribe();
        monitor.stop();
        done();
      }
    });

    monitor.start();
  });

  it('should handle high-frequency monitoring without issues', (done) => {
    const monitor = new PerformanceMonitor({
      interval: 10, // Very high frequency
      maxDataPoints: 1000,
      thresholds: {
        cpuUsage: 90,
        memoryUsage: 2000,
        responseTime: 1000,
        errorRate: 50,
        requestsPerSecond: 10
      },
      enabledMetrics: {
        cpu: true,
        memory: true,
        requests: true,
        responses: true,
        errors: true,
        custom: true
      }
    });

    let updateCount = 0;
    
    const unsubscribe = monitor.subscribe(() => {
      updateCount++;
      
      if (updateCount >= 10) {
        expect(updateCount).toBeGreaterThanOrEqual(10);
        
        unsubscribe();
        monitor.stop();
        done();
      }
    });

    monitor.start();
  });
});
