/**
 * @fileoverview Performance system interfaces and types
 * @module tsfox/core/performance
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Main performance management interface
 */
export interface IPerformance {
  /** Measure synchronous operation performance */
  measure<T>(name: string, fn: () => T): T;
  
  /** Measure asynchronous operation performance */
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  
  /** Get current performance metrics */
  getMetrics(): PerformanceMetrics;
  
  /** Start performance profiling */
  startProfiling(): void;
  
  /** Stop profiling and get results */
  stopProfiling(): ProfilingResult;
  
  /** Reset all metrics */
  reset(): void;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  /** Collect a single metric */
  collect(metric: Metric): void;
  
  /** Get metrics for a time range */
  getMetrics(timeRange?: TimeRange): MetricsData;
  
  /** Clear all collected metrics */
  clear(): void;
  
  /** Export metrics in specified format */
  export(format: ExportFormat): string;
  
  /** Start automatic collection */
  start(): void;
  
  /** Stop automatic collection */
  stop(): void;
}

/**
 * Optimizer interface for performance improvements
 */
export interface IOptimizer {
  /** Optimize a target object */
  optimize<T>(target: T, options?: OptimizationOptions): T;
  
  /** Analyze performance characteristics */
  analyze(target: any): OptimizationReport;
  
  /** Get optimization recommendations */
  recommendations(): OptimizationRecommendation[];
}

// ============================================================================
// METRIC TYPES
// ============================================================================

/**
 * Complete performance metrics structure
 */
export interface PerformanceMetrics {
  /** HTTP-related metrics */
  http: HttpMetrics;
  
  /** System resource metrics */
  system: SystemMetrics;
  
  /** Application-specific metrics */
  application: ApplicationMetrics;
  
  /** Custom user-defined metrics */
  custom: Record<string, any>;
  
  /** Timestamp when metrics were collected */
  timestamp: number;
}

/**
 * HTTP performance metrics
 */
export interface HttpMetrics {
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Average response time in milliseconds */
  averageResponseTime: number;
  
  /** 95th percentile response time */
  p95ResponseTime: number;
  
  /** 99th percentile response time */
  p99ResponseTime: number;
  
  /** Error rate as percentage */
  errorRate: number;
  
  /** Total request count */
  totalRequests: number;
  
  /** Active connections */
  activeConnections: number;
  
  /** Throughput in bytes per second */
  throughput: number;
}

/**
 * System resource metrics
 */
export interface SystemMetrics {
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Memory usage in bytes */
  memoryUsage: number;
  
  /** Heap memory used in bytes */
  heapUsed: number;
  
  /** Total heap size in bytes */
  heapTotal: number;
  
  /** Event loop lag in milliseconds */
  eventLoopLag: number;
  
  /** Garbage collection metrics */
  gc: GCMetrics;
  
  /** Process uptime in seconds */
  uptime: number;
}

/**
 * Application-specific metrics
 */
export interface ApplicationMetrics {
  /** Cache hit ratio */
  cacheHitRatio: number;
  
  /** Template render time */
  templateRenderTime: number;
  
  /** Database query time */
  databaseQueryTime: number;
  
  /** Middleware execution time */
  middlewareExecutionTime: number;
  
  /** Route resolution time */
  routeResolutionTime: number;
  
  /** Active sessions */
  activeSessions: number;
}

/**
 * Garbage collection metrics
 */
export interface GCMetrics {
  /** Total GC time in milliseconds */
  totalTime: number;
  
  /** GC frequency (collections per minute) */
  frequency: number;
  
  /** Average GC pause time */
  averagePause: number;
  
  /** Memory freed in bytes */
  memoryFreed: number;
}

/**
 * Individual metric data point
 */
export interface Metric {
  /** Metric name/identifier */
  name: string;
  
  /** Metric value */
  value: number;
  
  /** Timestamp when metric was recorded */
  timestamp: number;
  
  /** Optional labels for categorization */
  labels?: Record<string, string>;
  
  /** Type of metric */
  type: MetricType;
  
  /** Optional unit of measurement */
  unit?: string;
}

/**
 * Types of metrics that can be collected
 */
export type MetricType = 
  | 'counter'     // Monotonically increasing value
  | 'gauge'       // Value that can go up or down
  | 'histogram'   // Distribution of values
  | 'timer'       // Duration measurements
  | 'rate';       // Rate of change

/**
 * Time range for metric queries
 */
export interface TimeRange {
  /** Start time (Unix timestamp) */
  start: number;
  
  /** End time (Unix timestamp) */
  end: number;
  
  /** Interval for data aggregation */
  interval?: number;
}

/**
 * Aggregated metrics data
 */
export interface MetricsData {
  /** Time range covered */
  timeRange: TimeRange;
  
  /** Individual data points */
  points: MetricPoint[];
  
  /** Summary statistics */
  summary: MetricSummary;
}

/**
 * Single metric data point with timestamp
 */
export interface MetricPoint {
  /** Timestamp */
  timestamp: number;
  
  /** Metric value */
  value: number;
  
  /** Optional labels */
  labels?: Record<string, string>;
}

/**
 * Summary statistics for metrics
 */
export interface MetricSummary {
  /** Average value */
  average: number;
  
  /** Minimum value */
  min: number;
  
  /** Maximum value */
  max: number;
  
  /** Standard deviation */
  stdDev: number;
  
  /** Total count of data points */
  count: number;
  
  /** Sum of all values */
  sum: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Performance system configuration
 */
export interface PerformanceConfig {
  /** Enable performance profiling */
  enableProfiling: boolean;
  
  /** Metrics collection interval in milliseconds */
  metricsInterval: number;
  
  /** Enable memory optimization features */
  memoryOptimization: boolean;
  
  /** HTTP compression level (0-9) */
  compressionLevel: number;
  
  /** Cache size limit in bytes */
  cacheSize: number;
  
  /** Enable automatic optimization */
  autoOptimization: boolean;
  
  /** Performance targets */
  targets: PerformanceTargets;
  
  /** Monitoring configuration */
  monitoring: MonitoringConfig;
}

/**
 * Performance targets to aim for
 */
export interface PerformanceTargets {
  /** Target requests per second */
  requestsPerSecond: number;
  
  /** Target P95 response time in milliseconds */
  p95ResponseTime: number;
  
  /** Target memory usage in bytes */
  memoryUsage: number;
  
  /** Target CPU usage percentage */
  cpuUsage: number;
  
  /** Target error rate percentage */
  errorRate: number;
}

/**
 * Monitoring system configuration
 */
export interface MonitoringConfig {
  /** Enable real-time monitoring */
  enabled: boolean;
  
  /** Data retention period in seconds */
  retentionPeriod: number;
  
  /** Export format for metrics */
  exportFormat: ExportFormat;
  
  /** Alert thresholds */
  alerts: AlertConfig[];
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Metric name to monitor */
  metric: string;
  
  /** Threshold value */
  threshold: number;
  
  /** Comparison operator */
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  
  /** Alert message template */
  message: string;
  
  /** Alert severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

/**
 * Optimization options
 */
export interface OptimizationOptions {
  /** Optimization level (1-10) */
  level: number;
  
  /** Specific areas to optimize */
  areas: OptimizationArea[];
  
  /** Enable aggressive optimizations */
  aggressive: boolean;
  
  /** Preserve compatibility */
  preserveCompatibility: boolean;
}

/**
 * Areas that can be optimized
 */
export type OptimizationArea = 
  | 'http'
  | 'routing'
  | 'templates'
  | 'memory'
  | 'cache'
  | 'database'
  | 'middleware';

/**
 * Optimization analysis report
 */
export interface OptimizationReport {
  /** Overall performance score (0-100) */
  score: number;
  
  /** Performance bottlenecks identified */
  bottlenecks: Bottleneck[];
  
  /** Optimization opportunities */
  opportunities: OptimizationOpportunity[];
  
  /** Current metrics snapshot */
  currentMetrics: PerformanceMetrics;
  
  /** Estimated improvements */
  estimatedImprovements: Record<string, number>;
}

/**
 * Performance bottleneck description
 */
export interface Bottleneck {
  /** Area where bottleneck occurs */
  area: OptimizationArea;
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Description of the issue */
  description: string;
  
  /** Impact on overall performance */
  impact: number;
  
  /** Suggested solutions */
  solutions: string[];
}

/**
 * Optimization opportunity
 */
export interface OptimizationOpportunity {
  /** Area for optimization */
  area: OptimizationArea;
  
  /** Potential performance gain */
  potentialGain: number;
  
  /** Implementation difficulty */
  difficulty: 'easy' | 'medium' | 'hard';
  
  /** Description of the opportunity */
  description: string;
  
  /** Implementation steps */
  steps: string[];
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  /** Area to optimize */
  area: OptimizationArea;
  
  /** Recommendation title */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Expected performance improvement */
  expectedImprovement: string;
  
  /** Implementation effort required */
  effort: 'low' | 'medium' | 'high';
  
  /** Code examples or configuration */
  implementation?: string;
}

// ============================================================================
// PROFILING TYPES
// ============================================================================

/**
 * Profiling result data
 */
export interface ProfilingResult {
  /** Duration of profiling session */
  duration: number;
  
  /** Function call profile */
  functions: FunctionProfile[];
  
  /** Memory allocation profile */
  memory: MemoryProfile;
  
  /** CPU usage profile */
  cpu: CPUProfile;
  
  /** Summary statistics */
  summary: ProfilingSummary;
}

/**
 * Individual function performance profile
 */
export interface FunctionProfile {
  /** Function name */
  name: string;
  
  /** Total execution time */
  totalTime: number;
  
  /** Average execution time */
  averageTime: number;
  
  /** Number of calls */
  calls: number;
  
  /** Percentage of total execution time */
  percentage: number;
  
  /** Call stack information */
  stack?: string[];
}

/**
 * Memory allocation profile
 */
export interface MemoryProfile {
  /** Total allocations */
  totalAllocations: number;
  
  /** Peak memory usage */
  peakUsage: number;
  
  /** Average memory usage */
  averageUsage: number;
  
  /** Allocation by type */
  allocationsByType: Record<string, number>;
  
  /** Garbage collection events */
  gcEvents: GCEvent[];
}

/**
 * CPU usage profile
 */
export interface CPUProfile {
  /** Average CPU usage percentage */
  averageUsage: number;
  
  /** Peak CPU usage */
  peakUsage: number;
  
  /** CPU usage over time */
  timeline: CPUTimelinePoint[];
}

/**
 * CPU usage at a specific point in time
 */
export interface CPUTimelinePoint {
  /** Timestamp */
  timestamp: number;
  
  /** CPU usage percentage */
  usage: number;
}

/**
 * Garbage collection event
 */
export interface GCEvent {
  /** Timestamp of GC event */
  timestamp: number;
  
  /** Type of garbage collection */
  type: 'minor' | 'major' | 'incremental';
  
  /** Duration of GC pause */
  duration: number;
  
  /** Memory freed */
  memoryFreed: number;
}

/**
 * Profiling session summary
 */
export interface ProfilingSummary {
  /** Total profiling duration */
  totalDuration: number;
  
  /** Number of function calls analyzed */
  totalFunctionCalls: number;
  
  /** Top performance bottlenecks */
  topBottlenecks: string[];
  
  /** Performance recommendations */
  recommendations: string[];
  
  /** Overall performance score */
  performanceScore: number;
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

/**
 * Supported export formats for metrics
 */
export type ExportFormat = 
  | 'json'
  | 'csv'
  | 'prometheus'
  | 'influxdb'
  | 'graphite';

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Performance-related events
 */
export type PerformanceEvent = 
  | 'metric-collected'
  | 'threshold-exceeded'
  | 'optimization-applied'
  | 'profiling-started'
  | 'profiling-stopped'
  | 'alert-triggered';

/**
 * Event data structure
 */
export interface PerformanceEventData {
  /** Event type */
  type: PerformanceEvent;
  
  /** Timestamp when event occurred */
  timestamp: number;
  
  /** Event-specific data */
  data: any;
  
  /** Event severity */
  severity?: 'info' | 'warning' | 'error';
}
