/**
 * @fileoverview Metrics collector for performance monitoring
 * @module tsfox/core/performance/monitoring
 */

import { 
  IMetricsCollector, 
  Metric, 
  MetricsData, 
  TimeRange, 
  ExportFormat,
  MetricPoint,
  MetricSummary,
  MetricType
} from '../interfaces';

/**
 * High-performance metrics collector with efficient storage and retrieval
 */
export class MetricsCollector implements IMetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private isCollecting: boolean = false;
  private collectionInterval?: NodeJS.Timeout;
  private readonly maxDataPoints: number = 10000;
  private readonly retentionPeriod: number = 86400000; // 24 hours in ms

  constructor(
    private readonly interval: number = 1000,
    private readonly autoStart: boolean = true
  ) {
    if (autoStart) {
      this.start();
    }
  }

  /**
   * Collect a single metric data point
   */
  collect(metric: Metric): void {
    const key = this.getMetricKey(metric);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricData = this.metrics.get(key)!;
    
    // Add new data point
    metricData.push({
      ...metric,
      timestamp: metric.timestamp || Date.now()
    });

    // Maintain size limits
    if (metricData.length > this.maxDataPoints) {
      metricData.shift(); // Remove oldest data point
    }

    // Remove expired data points
    this.cleanupExpiredData(metricData);
  }

  /**
   * Get metrics for specified time range
   */
  getMetrics(timeRange?: TimeRange): MetricsData {
    const now = Date.now();
    const range = timeRange || {
      start: now - 3600000, // Last hour
      end: now
    };

    const points: MetricPoint[] = [];
    const allValues: number[] = [];

    // Collect all metrics within time range
    for (const [key, metricData] of this.metrics.entries()) {
      const filteredMetrics = metricData.filter(
        m => m.timestamp >= range.start && m.timestamp <= range.end
      );

      filteredMetrics.forEach(metric => {
        points.push({
          timestamp: metric.timestamp,
          value: metric.value,
          labels: {
            metric: metric.name,
            type: metric.type,
            ...metric.labels
          }
        });
        allValues.push(metric.value);
      });
    }

    // Sort points by timestamp
    points.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate summary statistics
    const summary = this.calculateSummary(allValues);

    return {
      timeRange: range,
      points,
      summary
    };
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetricData(metricName: string, timeRange?: TimeRange): MetricPoint[] {
    const now = Date.now();
    const range = timeRange || {
      start: now - 3600000,
      end: now
    };

    const points: MetricPoint[] = [];

    for (const [key, metricData] of this.metrics.entries()) {
      if (key.includes(metricName)) {
        const filteredMetrics = metricData.filter(
          m => m.timestamp >= range.start && m.timestamp <= range.end
        );

        filteredMetrics.forEach(metric => {
          points.push({
            timestamp: metric.timestamp,
            value: metric.value,
            labels: metric.labels
          });
        });
      }
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics in specified format
   */
  export(format: ExportFormat): string {
    const allMetrics = this.getAllMetrics();

    switch (format) {
      case 'json':
        return this.exportJSON(allMetrics);
      case 'csv':
        return this.exportCSV(allMetrics);
      case 'prometheus':
        return this.exportPrometheus(allMetrics);
      case 'influxdb':
        return this.exportInfluxDB(allMetrics);
      case 'graphite':
        return this.exportGraphite(allMetrics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Start automatic metrics collection
   */
  start(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.interval);
  }

  /**
   * Stop automatic metrics collection
   */
  stop(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }

  /**
   * Get current collection status
   */
  isActive(): boolean {
    return this.isCollecting;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { usedMemory: number; totalMetrics: number; dataPoints: number } {
    let totalDataPoints = 0;
    for (const metricData of this.metrics.values()) {
      totalDataPoints += metricData.length;
    }

    const usedMemory = process.memoryUsage().heapUsed;

    return {
      usedMemory,
      totalMetrics: this.metrics.size,
      dataPoints: totalDataPoints
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getMetricKey(metric: Metric): string {
    const labels = metric.labels ? 
      Object.entries(metric.labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(',') : '';
    
    return `${metric.name}:${metric.type}${labels ? `:${labels}` : ''}`;
  }

  private cleanupExpiredData(metricData: Metric[]): void {
    const cutoff = Date.now() - this.retentionPeriod;
    
    // Remove expired data points
    let i = 0;
    while (i < metricData.length && metricData[i].timestamp < cutoff) {
      i++;
    }
    
    if (i > 0) {
      metricData.splice(0, i);
    }
  }

  private calculateSummary(values: number[]): MetricSummary {
    if (values.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        count: 0,
        sum: 0
      };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      average,
      min,
      max,
      stdDev,
      count: values.length,
      sum
    };
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const timestamp = Date.now();

    // Memory metrics
    this.collect({
      name: 'system.memory.heap_used',
      value: memUsage.heapUsed,
      timestamp,
      type: 'gauge',
      unit: 'bytes'
    });

    this.collect({
      name: 'system.memory.heap_total',
      value: memUsage.heapTotal,
      timestamp,
      type: 'gauge',
      unit: 'bytes'
    });

    this.collect({
      name: 'system.memory.external',
      value: memUsage.external,
      timestamp,
      type: 'gauge',
      unit: 'bytes'
    });

    // CPU metrics (if available)
    if (cpuUsage) {
      this.collect({
        name: 'system.cpu.user',
        value: cpuUsage.user,
        timestamp,
        type: 'counter',
        unit: 'microseconds'
      });

      this.collect({
        name: 'system.cpu.system',
        value: cpuUsage.system,
        timestamp,
        type: 'counter',
        unit: 'microseconds'
      });
    }

    // Process uptime
    this.collect({
      name: 'system.process.uptime',
      value: process.uptime(),
      timestamp,
      type: 'gauge',
      unit: 'seconds'
    });
  }

  private getAllMetrics(): Metric[] {
    const allMetrics: Metric[] = [];
    for (const metricData of this.metrics.values()) {
      allMetrics.push(...metricData);
    }
    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  private exportJSON(metrics: Metric[]): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics,
      summary: this.getMemoryStats()
    }, null, 2);
  }

  private exportCSV(metrics: Metric[]): string {
    const headers = ['timestamp', 'name', 'value', 'type', 'unit', 'labels'];
    const rows = [headers.join(',')];

    metrics.forEach(metric => {
      const labels = metric.labels ? JSON.stringify(metric.labels) : '';
      const row = [
        metric.timestamp,
        `"${metric.name}"`,
        metric.value,
        metric.type,
        metric.unit || '',
        `"${labels}"`
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  private exportPrometheus(metrics: Metric[]): string {
    const lines: string[] = [];
    const metricGroups = new Map<string, Metric[]>();

    // Group metrics by name
    metrics.forEach(metric => {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    });

    // Convert to Prometheus format
    metricGroups.forEach((metricGroup, name) => {
      const latestMetric = metricGroup[metricGroup.length - 1];
      const promName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      lines.push(`# TYPE ${promName} ${latestMetric.type}`);
      
      if (latestMetric.labels) {
        const labelStr = Object.entries(latestMetric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${promName}{${labelStr}} ${latestMetric.value}`);
      } else {
        lines.push(`${promName} ${latestMetric.value}`);
      }
    });

    return lines.join('\n');
  }

  private exportInfluxDB(metrics: Metric[]): string {
    const lines: string[] = [];

    metrics.forEach(metric => {
      const measurement = metric.name.replace(/\./g, '_');
      const timestamp = metric.timestamp * 1000000; // Convert to nanoseconds
      
      let line = measurement;
      
      if (metric.labels) {
        const tags = Object.entries(metric.labels)
          .map(([k, v]) => `${k}=${v}`)
          .join(',');
        line += `,${tags}`;
      }
      
      line += ` value=${metric.value} ${timestamp}`;
      lines.push(line);
    });

    return lines.join('\n');
  }

  private exportGraphite(metrics: Metric[]): string {
    const lines: string[] = [];

    metrics.forEach(metric => {
      const timestamp = Math.floor(metric.timestamp / 1000);
      lines.push(`${metric.name} ${metric.value} ${timestamp}`);
    });

    return lines.join('\n');
  }
}
