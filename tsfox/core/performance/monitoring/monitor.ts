/**
 * @fileoverview Performance monitoring and dashboard system
 * @module tsfox/core/performance/monitoring
 */

import { PerformanceMetrics, Metric, SystemMetrics, HttpMetrics, ApplicationMetrics } from '../interfaces';
import { BenchmarkResult, LoadTestResult } from '../benchmarking/benchmark';

/**
 * Real-time monitoring configuration
 */
export interface MonitoringConfig {
  /** Sampling interval in milliseconds */
  interval: number;
  
  /** Maximum number of data points to keep */
  maxDataPoints: number;
  
  /** Alert thresholds */
  thresholds: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    requestsPerSecond: number;
  };
  
  /** Enable/disable specific metrics */
  enabledMetrics: {
    cpu: boolean;
    memory: boolean;
    requests: boolean;
    responses: boolean;
    errors: boolean;
    custom: boolean;
  };
}

/**
 * Real-time metric data point
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: number;
  message: string;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: 'line' | 'bar' | 'gauge' | 'number' | 'table' | 'heatmap';
  title: string;
  metric: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

/**
 * Real-time performance monitor
 */
export class PerformanceMonitor {
  private config: MonitoringConfig;
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(data: PerformanceMetrics) => void> = new Set();

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeMetrics();
    this.setupDefaultAlerts();
  }

  /**
   * Initialize metric storage
   */
  private initializeMetrics(): void {
    const metricNames = [
      'cpu.usage',
      'memory.used',
      'memory.heap',
      'requests.total',
      'requests.per_second',
      'response.time.avg',
      'response.time.p95',
      'errors.rate',
      'gc.collections',
      'event_loop.lag'
    ];

    metricNames.forEach(name => {
      this.metrics.set(name, []);
    });
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlerts(): void {
    const defaultAlerts: Alert[] = [
      {
        id: 'high_cpu',
        name: 'High CPU Usage',
        condition: 'cpu.usage > threshold',
        threshold: this.config.thresholds.cpuUsage,
        severity: 'high',
        enabled: true,
        triggered: false,
        message: 'CPU usage is above {threshold}%'
      },
      {
        id: 'high_memory',
        name: 'High Memory Usage',
        condition: 'memory.used > threshold',
        threshold: this.config.thresholds.memoryUsage,
        severity: 'high',
        enabled: true,
        triggered: false,
        message: 'Memory usage is above {threshold}MB'
      },
      {
        id: 'slow_response',
        name: 'Slow Response Time',
        condition: 'response.time.avg > threshold',
        threshold: this.config.thresholds.responseTime,
        severity: 'medium',
        enabled: true,
        triggered: false,
        message: 'Average response time is above {threshold}ms'
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'errors.rate > threshold',
        threshold: this.config.thresholds.errorRate,
        severity: 'critical',
        enabled: true,
        triggered: false,
        message: 'Error rate is above {threshold}%'
      },
      {
        id: 'low_throughput',
        name: 'Low Throughput',
        condition: 'requests.per_second < threshold',
        threshold: this.config.thresholds.requestsPerSecond,
        severity: 'medium',
        enabled: true,
        triggered: false,
        message: 'Request throughput is below {threshold} RPS'
      }
    ];

    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Performance monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting performance monitoring (interval: ${this.config.interval}ms)`);

    this.intervalId = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, this.config.interval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    if (this.config.enabledMetrics.cpu || this.config.enabledMetrics.memory) {
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      
      if (this.config.enabledMetrics.cpu) {
        const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;
        this.addMetricPoint('cpu.usage', timestamp, cpuPercent);
      }
      
      if (this.config.enabledMetrics.memory) {
        this.addMetricPoint('memory.used', timestamp, memoryUsage.rss / 1024 / 1024); // MB
        this.addMetricPoint('memory.heap', timestamp, memoryUsage.heapUsed / 1024 / 1024); // MB
      }
    }

    // Collect event loop lag
    const eventLoopLag = await this.measureEventLoopLag();
    this.addMetricPoint('event_loop.lag', timestamp, eventLoopLag);

    // Check alerts
    this.checkAlerts();

    // Notify listeners
    const currentMetrics = this.getCurrentMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(currentMetrics);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): Promise<number> {
    return new Promise(resolve => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        resolve(lag);
      });
    });
  }

  /**
   * Add metric data point
   */
  private addMetricPoint(metric: string, timestamp: number, value: number, metadata?: Record<string, any>): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const points = this.metrics.get(metric)!;
    points.push({ timestamp, value, metadata });

    // Trim to max data points
    if (points.length > this.config.maxDataPoints) {
      points.splice(0, points.length - this.config.maxDataPoints);
    }
  }

  /**
   * Add custom metric
   */
  addCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    if (this.config.enabledMetrics.custom) {
      this.addMetricPoint(`custom.${name}`, Date.now(), value, metadata);
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, statusCode: number, path: string): void {
    if (!this.config.enabledMetrics.requests && !this.config.enabledMetrics.responses) {
      return;
    }

    const timestamp = Date.now();
    
    if (this.config.enabledMetrics.requests) {
      this.addMetricPoint('requests.total', timestamp, 1, { statusCode, path });
    }
    
    if (this.config.enabledMetrics.responses) {
      this.addMetricPoint('response.time.avg', timestamp, responseTime, { statusCode, path });
    }
    
    if (this.config.enabledMetrics.errors && statusCode >= 400) {
      this.addMetricPoint('errors.total', timestamp, 1, { statusCode, path });
    }
  }

  /**
   * Check alert conditions
   */
  private checkAlerts(): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      const shouldTrigger = this.evaluateAlertCondition(alert);
      
      if (shouldTrigger && !alert.triggered) {
        alert.triggered = true;
        alert.lastTriggered = Date.now();
        this.triggerAlert(alert);
      } else if (!shouldTrigger && alert.triggered) {
        alert.triggered = false;
        this.resolveAlert(alert);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(alert: Alert): boolean {
    const metricName = alert.condition.split(' ')[0];
    const operator = alert.condition.split(' ')[1];
    
    const points = this.metrics.get(metricName);
    if (!points || points.length === 0) return false;
    
    const latestValue = points[points.length - 1].value;
    
    switch (operator) {
      case '>':
        return latestValue > alert.threshold;
      case '<':
        return latestValue < alert.threshold;
      case '>=':
        return latestValue >= alert.threshold;
      case '<=':
        return latestValue <= alert.threshold;
      case '==':
        return latestValue === alert.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: Alert): void {
    const message = alert.message.replace('{threshold}', alert.threshold.toString());
    console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.name} - ${message}`);
    
    // Here you could send notifications, webhooks, etc.
  }

  /**
   * Resolve alert
   */
  private resolveAlert(alert: Alert): void {
    console.log(`✅ RESOLVED: ${alert.name}`);
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): PerformanceMetrics {
    const timestamp = Date.now();
    
    // Calculate current system metrics
    const systemMetrics: SystemMetrics = {
      cpuUsage: this.getLatestValue('cpu.usage'),
      memoryUsage: this.getLatestValue('memory.used') * 1024 * 1024, // Convert MB to bytes
      heapUsed: this.getLatestValue('memory.heap') * 1024 * 1024,
      heapTotal: process.memoryUsage().heapTotal,
      eventLoopLag: this.getLatestValue('event_loop.lag'),
      gc: {
        totalTime: 0,
        frequency: 0,
        averagePause: 0,
        memoryFreed: 0
      },
      uptime: process.uptime()
    };

    // Calculate HTTP metrics
    const httpMetrics: HttpMetrics = {
      requestsPerSecond: this.getLatestValue('requests.per_second'),
      averageResponseTime: this.getLatestValue('response.time.avg'),
      p95ResponseTime: this.getLatestValue('response.time.p95'),
      p99ResponseTime: 0,
      errorRate: this.getLatestValue('errors.rate'),
      totalRequests: this.getLatestValue('requests.total'),
      activeConnections: 0,
      throughput: 0
    };

    // Calculate application metrics
    const applicationMetrics: ApplicationMetrics = {
      cacheHitRatio: 0,
      templateRenderTime: 0,
      databaseQueryTime: 0,
      middlewareExecutionTime: 0,
      routeResolutionTime: 0,
      activeSessions: 0
    };

    return {
      system: systemMetrics,
      http: httpMetrics,
      application: applicationMetrics,
      custom: {},
      timestamp
    };
  }

  /**
   * Get latest value for a metric
   */
  private getLatestValue(metricName: string): number {
    const points = this.metrics.get(metricName);
    if (!points || points.length === 0) return 0;
    return points[points.length - 1].value;
  }

  /**
   * Get metric history
   */
  getMetricHistory(metricName: string, timeRange?: { start: number; end: number }): MetricDataPoint[] {
    const points = this.metrics.get(metricName) || [];
    
    if (!timeRange) {
      return [...points];
    }
    
    return points.filter(point => 
      point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
    );
  }

  /**
   * Subscribe to real-time metrics
   */
  subscribe(listener: (data: PerformanceMetrics) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Update alert configuration
   */
  updateAlert(alertId: string, updates: Partial<Alert>): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      Object.assign(alert, updates);
    }
  }

  /**
   * Add custom alert
   */
  addAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert);
  }

  /**
   * Remove alert
   */
  removeAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Get configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Performance dashboard for visualization
 */
export class PerformanceDashboard {
  private monitor: PerformanceMonitor;
  private widgets: Map<string, DashboardWidget> = new Map();

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.setupDefaultWidgets();
  }

  /**
   * Setup default dashboard widgets
   */
  private setupDefaultWidgets(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'cpu_gauge',
        type: 'gauge',
        title: 'CPU Usage',
        metric: 'cpu.usage',
        position: { x: 0, y: 0, width: 2, height: 2 },
        config: { min: 0, max: 100, unit: '%', colorThresholds: [70, 90] }
      },
      {
        id: 'memory_gauge',
        type: 'gauge',
        title: 'Memory Usage',
        metric: 'memory.used',
        position: { x: 2, y: 0, width: 2, height: 2 },
        config: { min: 0, max: 1000, unit: 'MB', colorThresholds: [700, 900] }
      },
      {
        id: 'rps_number',
        type: 'number',
        title: 'Requests/sec',
        metric: 'requests.per_second',
        position: { x: 4, y: 0, width: 2, height: 1 },
        config: { decimals: 1, trend: true }
      },
      {
        id: 'response_time_line',
        type: 'line',
        title: 'Response Time',
        metric: 'response.time.avg',
        position: { x: 0, y: 2, width: 4, height: 2 },
        config: { timeRange: '1h', yAxis: { min: 0, unit: 'ms' } }
      },
      {
        id: 'error_rate_bar',
        type: 'bar',
        title: 'Error Rate',
        metric: 'errors.rate',
        position: { x: 4, y: 2, width: 2, height: 2 },
        config: { timeRange: '1h', threshold: 5 }
      }
    ];

    defaultWidgets.forEach(widget => {
      this.widgets.set(widget.id, widget);
    });
  }

  /**
   * Generate dashboard data
   */
  getDashboardData(): {
    widgets: DashboardWidget[];
    metrics: Record<string, MetricDataPoint[]>;
    alerts: Alert[];
    lastUpdate: number;
  } {
    const widgets = Array.from(this.widgets.values());
    const metrics: Record<string, MetricDataPoint[]> = {};
    
    // Get data for each widget metric
    widgets.forEach(widget => {
      const timeRange = this.getTimeRangeFromConfig(widget.config.timeRange);
      metrics[widget.metric] = this.monitor.getMetricHistory(widget.metric, timeRange);
    });

    return {
      widgets,
      metrics,
      alerts: this.monitor.getAlerts().filter(alert => alert.triggered),
      lastUpdate: Date.now()
    };
  }

  /**
   * Get time range from configuration
   */
  private getTimeRangeFromConfig(timeRange?: string): { start: number; end: number } | undefined {
    if (!timeRange) return undefined;
    
    const now = Date.now();
    const duration = this.parseDuration(timeRange);
    
    return {
      start: now - duration,
      end: now
    };
  }

  /**
   * Parse duration string (e.g., '1h', '30m', '24h')
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return value * 1000;
    }
  }

  /**
   * Add widget to dashboard
   */
  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
  }

  /**
   * Update widget configuration
   */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (widget) {
      Object.assign(widget, updates);
    }
  }

  /**
   * Remove widget from dashboard
   */
  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
  }

  /**
   * Get all widgets
   */
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Export dashboard configuration
   */
  exportConfig(): {
    widgets: DashboardWidget[];
    monitorConfig: MonitoringConfig;
  } {
    return {
      widgets: this.getWidgets(),
      monitorConfig: this.monitor.getConfig()
    };
  }

  /**
   * Import dashboard configuration
   */
  importConfig(config: {
    widgets?: DashboardWidget[];
    monitorConfig?: Partial<MonitoringConfig>;
  }): void {
    if (config.widgets) {
      this.widgets.clear();
      config.widgets.forEach(widget => {
        this.widgets.set(widget.id, widget);
      });
    }
    
    if (config.monitorConfig) {
      this.monitor.updateConfig(config.monitorConfig);
    }
  }
}

/**
 * Automated reporting system
 */
export class PerformanceReporter {
  private monitor: PerformanceMonitor;

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
  }

  /**
   * Generate performance report
   */
  generateReport(timeRange: { start: number; end: number }): {
    summary: {
      avgCpuUsage: number;
      avgMemoryUsage: number;
      avgResponseTime: number;
      totalRequests: number;
      errorRate: number;
      uptime: number;
    };
    trends: {
      cpuTrend: 'increasing' | 'decreasing' | 'stable';
      memoryTrend: 'increasing' | 'decreasing' | 'stable';
      performanceTrend: 'improving' | 'degrading' | 'stable';
    };
    alerts: {
      total: number;
      byCategory: Record<string, number>;
      topAlerts: Array<{ name: string; count: number }>;
    };
    recommendations: string[];
  } {
    // Get metrics for the time range
    const cpuHistory = this.monitor.getMetricHistory('custom.cpu.usage', timeRange);
    const memoryHistory = this.monitor.getMetricHistory('custom.memory.used', timeRange);
    const responseTimeHistory = this.monitor.getMetricHistory('custom.response.time.avg', timeRange);
    const requestHistory = this.monitor.getMetricHistory('custom.requests.total', timeRange);
    const errorHistory = this.monitor.getMetricHistory('custom.errors.total', timeRange);

    // Calculate summary statistics
    const summary = {
      avgCpuUsage: this.calculateAverage(cpuHistory),
      avgMemoryUsage: this.calculateAverage(memoryHistory),
      avgResponseTime: this.calculateAverage(responseTimeHistory),
      totalRequests: this.calculateSum(requestHistory),
      errorRate: this.calculateErrorRate(requestHistory, errorHistory),
      uptime: timeRange.end - timeRange.start
    };

    // Analyze trends
    const trends = {
      cpuTrend: this.analyzeTrend(cpuHistory),
      memoryTrend: this.analyzeTrend(memoryHistory),
      performanceTrend: this.analyzePerformanceTrend(responseTimeHistory)
    };

    // Alert statistics
    const alerts = this.analyzeAlerts();

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, trends);

    return {
      summary,
      trends,
      alerts,
      recommendations
    };
  }

  /**
   * Calculate average of metric values
   */
  private calculateAverage(points: MetricDataPoint[]): number {
    if (points.length === 0) return 0;
    return points.reduce((sum, point) => sum + point.value, 0) / points.length;
  }

  /**
   * Calculate sum of metric values
   */
  private calculateSum(points: MetricDataPoint[]): number {
    return points.reduce((sum, point) => sum + point.value, 0);
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(requests: MetricDataPoint[], errors: MetricDataPoint[]): number {
    const totalRequests = this.calculateSum(requests);
    const totalErrors = this.calculateSum(errors);
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  /**
   * Analyze metric trend
   */
  private analyzeTrend(points: MetricDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (points.length < 2) return 'stable';
    
    const firstHalf = points.slice(0, Math.floor(points.length / 2));
    const secondHalf = points.slice(Math.floor(points.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze performance trend (inverted for response time)
   */
  private analyzePerformanceTrend(points: MetricDataPoint[]): 'improving' | 'degrading' | 'stable' {
    const trend = this.analyzeTrend(points);
    
    switch (trend) {
      case 'increasing': return 'degrading';
      case 'decreasing': return 'improving';
      default: return 'stable';
    }
  }

  /**
   * Analyze alert statistics
   */
  private analyzeAlerts(): {
    total: number;
    byCategory: Record<string, number>;
    topAlerts: Array<{ name: string; count: number }>;
  } {
    const alerts = this.monitor.getAlerts();
    
    const byCategory: Record<string, number> = {};
    const alertCounts: Record<string, number> = {};
    
    alerts.forEach(alert => {
      if (alert.triggered) {
        byCategory[alert.severity] = (byCategory[alert.severity] || 0) + 1;
        alertCounts[alert.name] = (alertCounts[alert.name] || 0) + 1;
      }
    });
    
    const topAlerts = Object.entries(alertCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      total: Object.values(byCategory).reduce((sum, count) => sum + count, 0),
      byCategory,
      topAlerts
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: any,
    trends: any
  ): string[] {
    const recommendations: string[] = [];
    
    // High CPU usage
    if (summary.avgCpuUsage > 70) {
      recommendations.push('Consider optimizing CPU-intensive operations or scaling horizontally');
    }
    
    // High memory usage
    if (summary.avgMemoryUsage > 700) {
      recommendations.push('Monitor memory leaks and consider garbage collection optimization');
    }
    
    // Slow response times
    if (summary.avgResponseTime > 100) {
      recommendations.push('Optimize slow endpoints and consider implementing caching');
    }
    
    // High error rate
    if (summary.errorRate > 5) {
      recommendations.push('Investigate and fix error sources to improve reliability');
    }
    
    // Memory trend
    if (trends.memoryTrend === 'increasing') {
      recommendations.push('Memory usage is increasing - check for memory leaks');
    }
    
    // Performance degradation
    if (trends.performanceTrend === 'degrading') {
      recommendations.push('Performance is degrading over time - review recent changes');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance metrics look healthy - continue monitoring');
    }
    
    return recommendations;
  }
}
