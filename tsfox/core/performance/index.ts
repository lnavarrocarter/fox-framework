/**
 * @fileoverview Performance optimization system
 * @module tsfox/core/performance
 */

// Core interfaces and types
export * from './interfaces';

// Performance factory and main implementation
export { PerformanceFactory } from './performance.factory';

// Metrics collection system (TODO: implement)
// export { MetricsCollector, Profiler } from './metrics';

// Performance optimizers
export * from './optimization';

// Benchmarking and testing
export * from './benchmarking';

// Real-time monitoring and dashboard
export * from './monitoring';

// Re-export key interfaces for convenience
export type {
  IPerformance,
  PerformanceMetrics,
  SystemMetrics,
  HttpMetrics,
  ApplicationMetrics,
  Metric
} from './interfaces';

// Re-export benchmarking types
export type {
  BenchmarkResult,
  BenchmarkConfig
} from './benchmarking';

// Re-export monitoring types
export type {
  MonitoringConfig,
  Alert,
  DashboardWidget
} from './monitoring';
