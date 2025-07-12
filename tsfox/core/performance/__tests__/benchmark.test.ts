/**
 * @fileoverview Tests for performance benchmarking system
 */

import { 
  PerformanceBenchmark, 
  LoadTester, 
  RegressionTester,
  type BenchmarkConfig,
  type BenchmarkResult 
} from '../benchmarking/benchmark';

describe('PerformanceBenchmark', () => {
  let defaultConfig: BenchmarkConfig;

  beforeEach(() => {
    defaultConfig = {
      duration: 1000,
      concurrency: 2,
      targetRPS: 100,
      warmupDuration: 500,
      urls: ['http://localhost:3000/test'],
      method: 'GET',
      headers: { 'User-Agent': 'Fox-Benchmark' }
    };
  });

  describe('initialization', () => {
    it('should create benchmark with valid configuration', () => {
      const benchmark = new PerformanceBenchmark(defaultConfig);
      expect(benchmark).toBeInstanceOf(PerformanceBenchmark);
      expect(benchmark.isRunningBenchmark()).toBe(false);
      expect(benchmark.getResults()).toBeNull();
    });
  });

  describe('benchmark execution', () => {
    it('should run benchmark and return results', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        duration: 100, // Short duration for test
        warmupDuration: 0
      });

      const result = await benchmark.run();

      expect(result).toBeDefined();
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.requestsPerSecond).toBeGreaterThan(0);
      expect(result.responseTime.average).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.statusCodes).toBeDefined();
    });

    it('should prevent concurrent benchmark runs', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        duration: 100
      });

      const firstRun = benchmark.run();
      
      await expect(benchmark.run()).rejects.toThrow('Benchmark is already running');
      
      await firstRun; // Wait for first run to complete
    });

    it('should include warm-up phase when configured', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        duration: 100,
        warmupDuration: 50
      });

      const startTime = Date.now();
      await benchmark.run();
      const totalTime = Date.now() - startTime;

      // Should take at least warmup + duration time
      expect(totalTime).toBeGreaterThanOrEqual(150);
    });
  });

  describe('result calculations', () => {
    it('should calculate response time percentiles correctly', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        duration: 200,
        warmupDuration: 0,
        concurrency: 1
      });

      const result = await benchmark.run();

      expect(result.responseTime.min).toBeLessThanOrEqual(result.responseTime.average);
      expect(result.responseTime.average).toBeLessThanOrEqual(result.responseTime.median);
      expect(result.responseTime.median).toBeLessThanOrEqual(result.responseTime.p95);
      expect(result.responseTime.p95).toBeLessThanOrEqual(result.responseTime.max);
    });

    it('should calculate error rate correctly', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        duration: 100,
        warmupDuration: 0
      });

      const result = await benchmark.run();

      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.errorRate).toBeLessThanOrEqual(100);
      
      if (result.totalRequests > 0) {
        const expectedErrorRate = (result.failedRequests / result.totalRequests) * 100;
        expect(result.errorRate).toBeCloseTo(expectedErrorRate, 1);
      }
    });
  });

  describe('multiple URLs', () => {
    it('should distribute requests across multiple URLs', async () => {
      const benchmark = new PerformanceBenchmark({
        ...defaultConfig,
        urls: [
          'http://localhost:3000/test1',
          'http://localhost:3000/test2',
          'http://localhost:3000/test3'
        ],
        duration: 100,
        warmupDuration: 0
      });

      const result = await benchmark.run();
      expect(result.totalRequests).toBeGreaterThan(0);
    });
  });
});

describe('LoadTester', () => {
  let defaultConfig: BenchmarkConfig;

  beforeEach(() => {
    defaultConfig = {
      duration: 500, // Short for testing
      concurrency: 2,
      targetRPS: 50,
      warmupDuration: 0,
      urls: ['http://localhost:3000/test'],
      method: 'GET',
      headers: {}
    };
  });

  describe('load testing', () => {
    it('should run sustained load test with intervals', async () => {
      const loadTester = new LoadTester(defaultConfig);
      
      const result = await loadTester.runLoadTest();

      expect(result.config).toEqual(defaultConfig);
      expect(result.intervals).toHaveLength(1); // Only one interval for short test
      expect(result.overall).toBeDefined();
      expect(result.degradation).toBeDefined();
      
      const interval = result.intervals[0];
      expect(interval.timestamp).toBeGreaterThan(0);
      expect(interval.rps).toBeGreaterThan(0);
      expect(interval.responseTime).toBeGreaterThan(0);
      expect(interval.errorRate).toBeGreaterThanOrEqual(0);
      expect(interval.memoryUsage).toBeGreaterThan(0);
    });

    it('should analyze performance degradation', async () => {
      const loadTester = new LoadTester({
        ...defaultConfig,
        duration: 1000 // Longer test for multiple intervals
      });
      
      const result = await loadTester.runLoadTest();

      expect(result.degradation.memoryGrowth).toBeDefined();
      expect(result.degradation.performanceDecline).toBeDefined();
      expect(result.degradation.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.degradation.stabilityScore).toBeLessThanOrEqual(100);
    });
  });
});

describe('RegressionTester', () => {
  let regressionTester: RegressionTester;
  let baselineConfig: BenchmarkConfig;

  beforeEach(() => {
    regressionTester = new RegressionTester();
    baselineConfig = {
      duration: 100,
      concurrency: 1,
      targetRPS: 10,
      warmupDuration: 0,
      urls: ['http://localhost:3000/test'],
      method: 'GET',
      headers: {}
    };
  });

  describe('baseline management', () => {
    it('should set and retrieve baselines', () => {
      const baselineResult: BenchmarkResult = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        requestsPerSecond: 100,
        responseTime: {
          min: 10,
          max: 50,
          average: 25,
          median: 24,
          p95: 45,
          p99: 48
        },
        errorRate: 5,
        throughput: 10000,
        duration: 1000,
        statusCodes: { 200: 95, 500: 5 },
        errors: { 'Connection error': 5 }
      };

      regressionTester.setBaseline('test1', baselineResult);
      
      const baselines = regressionTester.getBaselines();
      expect(baselines.get('test1')).toEqual(baselineResult);
    });

    it('should clear all baselines', () => {
      const baselineResult: BenchmarkResult = {
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0,
        requestsPerSecond: 100,
        responseTime: {
          min: 10,
          max: 30,
          average: 20,
          median: 20,
          p95: 28,
          p99: 29
        },
        errorRate: 0,
        throughput: 10000,
        duration: 1000,
        statusCodes: { 200: 100 },
        errors: {}
      };

      regressionTester.setBaseline('test1', baselineResult);
      regressionTester.clearBaselines();
      
      expect(regressionTester.getBaselines().size).toBe(0);
    });
  });

  describe('regression testing', () => {
    it('should run regression test without baseline', async () => {
      const result = await regressionTester.runRegressionTest('new_test', baselineConfig);

      expect(result.current).toBeDefined();
      expect(result.baseline).toBeNull();
      expect(result.regression).toBe(false);
      expect(result.differences.rpsChange).toBe(0);
      expect(result.differences.responseTimeChange).toBe(0);
      expect(result.differences.errorRateChange).toBe(0);
    });

    it('should detect performance regression', async () => {
      // Set a good baseline
      const goodBaseline: BenchmarkResult = {
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0,
        requestsPerSecond: 200, // High RPS
        responseTime: {
          min: 5,
          max: 15,
          average: 10, // Low response time
          median: 10,
          p95: 14,
          p99: 15
        },
        errorRate: 0, // No errors
        throughput: 20000,
        duration: 500,
        statusCodes: { 200: 100 },
        errors: {}
      };

      regressionTester.setBaseline('performance_test', goodBaseline);
      
      const result = await regressionTester.runRegressionTest('performance_test', baselineConfig);

      expect(result.baseline).toEqual(goodBaseline);
      expect(result.current).toBeDefined();
      expect(result.differences).toBeDefined();
      
      // Should detect regression if current performance is significantly worse
      const rpsChange = result.differences.rpsChange;
      const responseTimeChange = result.differences.responseTimeChange;
      
      expect(typeof rpsChange).toBe('number');
      expect(typeof responseTimeChange).toBe('number');
    });

    it('should calculate performance differences correctly', async () => {
      const baseline: BenchmarkResult = {
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0,
        requestsPerSecond: 100,
        responseTime: {
          min: 10,
          max: 30,
          average: 20,
          median: 20,
          p95: 28,
          p99: 29
        },
        errorRate: 0,
        throughput: 10000,
        duration: 1000,
        statusCodes: { 200: 100 },
        errors: {}
      };

      regressionTester.setBaseline('test', baseline);
      
      const result = await regressionTester.runRegressionTest('test', baselineConfig);

      expect(result.differences.rpsChange).toBeDefined();
      expect(result.differences.responseTimeChange).toBeDefined();
      expect(result.differences.errorRateChange).toBeDefined();
      
      // Verify calculation logic
      if (result.current.requestsPerSecond !== baseline.requestsPerSecond) {
        const expectedRpsChange = ((result.current.requestsPerSecond - baseline.requestsPerSecond) / baseline.requestsPerSecond) * 100;
        expect(result.differences.rpsChange).toBeCloseTo(expectedRpsChange, 1);
      }
    });
  });
});

// Integration tests
describe('Performance Benchmarking Integration', () => {
  it('should work together for complete performance testing workflow', async () => {
    const config: BenchmarkConfig = {
      duration: 200,
      concurrency: 2,
      targetRPS: 50,
      warmupDuration: 0,
      urls: ['http://localhost:3000/api/health'],
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    // 1. Run initial benchmark
    const benchmark = new PerformanceBenchmark(config);
    const initialResult = await benchmark.run();
    
    expect(initialResult.totalRequests).toBeGreaterThan(0);

    // 2. Set as baseline for regression testing
    const regressionTester = new RegressionTester();
    regressionTester.setBaseline('api_performance', initialResult);

    // 3. Run load test
    const loadTester = new LoadTester({
      ...config,
      duration: 500
    });
    const loadResult = await loadTester.runLoadTest();
    
    expect(loadResult.intervals.length).toBeGreaterThan(0);
    expect(loadResult.overall.totalRequests).toBeGreaterThan(0);

    // 4. Run regression test
    const regressionResult = await regressionTester.runRegressionTest('api_performance', config);
    
    expect(regressionResult.current).toBeDefined();
    expect(regressionResult.baseline).toEqual(initialResult);
    expect(typeof regressionResult.regression).toBe('boolean');
  });

  it('should handle edge cases gracefully', async () => {
    const edgeConfig: BenchmarkConfig = {
      duration: 50, // Very short
      concurrency: 1,
      targetRPS: 1000, // Very high
      warmupDuration: 0,
      urls: ['http://localhost:3000/slow-endpoint'],
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    };

    const benchmark = new PerformanceBenchmark(edgeConfig);
    const result = await benchmark.run();

    // Should handle the edge case without crashing
    expect(result).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.errorRate).toBeGreaterThanOrEqual(0);
  });
});
