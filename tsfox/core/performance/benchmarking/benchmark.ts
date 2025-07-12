/**
 * @fileoverview Performance benchmarking system
 * @module tsfox/core/performance/benchmarking
 */

import { PerformanceMetrics, Metric } from '../interfaces';

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Duration of benchmark in milliseconds */
  duration: number;
  
  /** Number of concurrent connections */
  concurrency: number;
  
  /** Requests per second to target */
  targetRPS: number;
  
  /** Warm-up duration in milliseconds */
  warmupDuration: number;
  
  /** URLs to benchmark */
  urls: string[];
  
  /** HTTP method to use */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  
  /** Request headers */
  headers: Record<string, string>;
  
  /** Request body for POST/PUT */
  body?: string;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  /** Total requests made */
  totalRequests: number;
  
  /** Successful requests */
  successfulRequests: number;
  
  /** Failed requests */
  failedRequests: number;
  
  /** Requests per second achieved */
  requestsPerSecond: number;
  
  /** Response time statistics */
  responseTime: {
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  
  /** Error rate percentage */
  errorRate: number;
  
  /** Throughput in bytes per second */
  throughput: number;
  
  /** Duration of benchmark */
  duration: number;
  
  /** Status code distribution */
  statusCodes: Record<number, number>;
  
  /** Error distribution */
  errors: Record<string, number>;
}

/**
 * Load test result for sustained performance testing
 */
export interface LoadTestResult {
  /** Benchmark configuration used */
  config: BenchmarkConfig;
  
  /** Results by time interval */
  intervals: Array<{
    timestamp: number;
    rps: number;
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  }>;
  
  /** Overall benchmark result */
  overall: BenchmarkResult;
  
  /** Performance degradation analysis */
  degradation: {
    memoryGrowth: number;
    performanceDecline: number;
    stabilityScore: number;
  };
}

/**
 * Performance benchmarking suite
 */
export class PerformanceBenchmark {
  private config: BenchmarkConfig;
  private results: BenchmarkResult | null = null;
  private isRunning = false;

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Run benchmark
   */
  async run(): Promise<BenchmarkResult> {
    if (this.isRunning) {
      throw new Error('Benchmark is already running');
    }

    this.isRunning = true;
    
    try {
      console.log(`Starting benchmark with ${this.config.concurrency} concurrent connections...`);
      
      // Warm-up phase
      if (this.config.warmupDuration > 0) {
        console.log(`Warming up for ${this.config.warmupDuration}ms...`);
        await this.warmup();
      }

      // Main benchmark phase
      console.log(`Running benchmark for ${this.config.duration}ms...`);
      this.results = await this.runBenchmark();
      
      console.log('Benchmark completed!');
      return this.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Warm-up phase to stabilize performance
   */
  private async warmup(): Promise<void> {
    const warmupConfig = {
      ...this.config,
      duration: this.config.warmupDuration,
      concurrency: Math.min(this.config.concurrency, 10)
    };

    await this.runBenchmark(warmupConfig);
  }

  /**
   * Run the actual benchmark
   */
  private async runBenchmark(config: BenchmarkConfig = this.config): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const interval = 1000 / config.targetRPS * config.concurrency;
    
    const results = {
      responseTimes: [] as number[],
      statusCodes: {} as Record<number, number>,
      errors: {} as Record<string, number>,
      totalBytes: 0,
      requests: 0,
      failures: 0
    };

    const workers: Promise<void>[] = [];

    // Start concurrent workers
    for (let i = 0; i < config.concurrency; i++) {
      workers.push(this.runWorker(config, endTime, results, interval));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const actualDuration = Date.now() - startTime;
    
    return this.calculateResults(results, actualDuration);
  }

  /**
   * Run individual worker
   */
  private async runWorker(
    config: BenchmarkConfig,
    endTime: number,
    results: any,
    interval: number
  ): Promise<void> {
    while (Date.now() < endTime) {
      const url = config.urls[Math.floor(Math.random() * config.urls.length)];
      
      try {
        const requestStart = Date.now();
        const response = await this.makeRequest(url, config);
        const requestEnd = Date.now();
        
        const responseTime = requestEnd - requestStart;
        
        // Update results (thread-safe operations)
        results.responseTimes.push(responseTime);
        results.statusCodes[response.status] = (results.statusCodes[response.status] || 0) + 1;
        results.totalBytes += response.size;
        results.requests++;
        
        if (response.status >= 400) {
          results.failures++;
        }
        
      } catch (error: any) {
        results.failures++;
        const errorType = error.code || error.name || 'Unknown';
        results.errors[errorType] = (results.errors[errorType] || 0) + 1;
      }

      // Rate limiting
      if (interval > 0) {
        await this.sleep(interval);
      }
    }
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(url: string, config: BenchmarkConfig): Promise<{
    status: number;
    size: number;
  }> {
    // Simulate HTTP request (in real implementation, use http/https modules)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      // Simulate network delay
      const delay = Math.random() * 50 + 10; // 10-60ms
      
      setTimeout(() => {
        clearTimeout(timeout);
        
        // Simulate response
        const status = Math.random() < 0.95 ? 200 : (Math.random() < 0.7 ? 404 : 500);
        const size = Math.floor(Math.random() * 10000) + 1000; // 1-11KB
        
        resolve({ status, size });
      }, delay);
    });
  }

  /**
   * Calculate benchmark results
   */
  private calculateResults(data: any, duration: number): BenchmarkResult {
    const { responseTimes, statusCodes, errors, totalBytes, requests, failures } = data;
    
    // Sort response times for percentile calculations
    responseTimes.sort((a: number, b: number) => a - b);
    
    const responseTime = {
      min: responseTimes.length > 0 ? responseTimes[0] : 0,
      max: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      average: responseTimes.length > 0 ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length : 0,
      median: responseTimes.length > 0 ? this.getPercentile(responseTimes, 50) : 0,
      p95: responseTimes.length > 0 ? this.getPercentile(responseTimes, 95) : 0,
      p99: responseTimes.length > 0 ? this.getPercentile(responseTimes, 99) : 0
    };

    return {
      totalRequests: requests,
      successfulRequests: requests - failures,
      failedRequests: failures,
      requestsPerSecond: (requests / duration) * 1000,
      responseTime,
      errorRate: requests > 0 ? (failures / requests) * 100 : 0,
      throughput: (totalBytes / duration) * 1000, // bytes per second
      duration,
      statusCodes,
      errors
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current results
   */
  getResults(): BenchmarkResult | null {
    return this.results;
  }

  /**
   * Check if benchmark is running
   */
  isRunningBenchmark(): boolean {
    return this.isRunning;
  }
}

/**
 * Load testing for sustained performance analysis
 */
export class LoadTester {
  private config: BenchmarkConfig;
  private intervals: LoadTestResult['intervals'] = [];

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Run sustained load test
   */
  async runLoadTest(): Promise<LoadTestResult> {
    console.log(`Starting load test for ${this.config.duration}ms...`);
    
    const startTime = Date.now();
    const endTime = startTime + this.config.duration;
    const intervalDuration = 10000; // 10 seconds
    
    let overallResults: any = {
      responseTimes: [],
      statusCodes: {},
      errors: {},
      totalBytes: 0,
      requests: 0,
      failures: 0
    };

    while (Date.now() < endTime) {
      const intervalStart = Date.now();
      const intervalEnd = Math.min(intervalStart + intervalDuration, endTime);
      
      // Run benchmark for this interval
      const intervalConfig = {
        ...this.config,
        duration: intervalEnd - intervalStart
      };
      
      const benchmark = new PerformanceBenchmark(intervalConfig);
      const result = await benchmark.run();
      
      // Collect system metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Store interval data
      this.intervals.push({
        timestamp: intervalStart,
        rps: result.requestsPerSecond,
        responseTime: result.responseTime.average,
        errorRate: result.errorRate,
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
      });

      // Accumulate overall results
      overallResults.requests += result.totalRequests;
      overallResults.failures += result.failedRequests;
      overallResults.totalBytes += result.throughput * (result.duration / 1000);
      overallResults.responseTimes.push(...Array(result.totalRequests).fill(result.responseTime.average));
      
      // Merge status codes and errors
      for (const [code, count] of Object.entries(result.statusCodes)) {
        overallResults.statusCodes[code] = (overallResults.statusCodes[code] || 0) + count;
      }
      
      for (const [error, count] of Object.entries(result.errors)) {
        overallResults.errors[error] = (overallResults.errors[error] || 0) + count;
      }
      
      console.log(`Interval completed: ${result.requestsPerSecond.toFixed(2)} RPS, ${result.responseTime.average.toFixed(2)}ms avg`);
    }

    const actualDuration = Date.now() - startTime;
    const benchmark = new PerformanceBenchmark(this.config);
    const overall = (benchmark as any).calculateResults(overallResults, actualDuration);
    
    const degradation = this.analyzeDegradation();
    
    return {
      config: this.config,
      intervals: this.intervals,
      overall,
      degradation
    };
  }

  /**
   * Analyze performance degradation over time
   */
  private analyzeDegradation(): LoadTestResult['degradation'] {
    if (this.intervals.length < 2) {
      return {
        memoryGrowth: 0,
        performanceDecline: 0,
        stabilityScore: 100
      };
    }

    const first = this.intervals[0];
    const last = this.intervals[this.intervals.length - 1];
    
    // Calculate memory growth
    const memoryGrowth = ((last.memoryUsage - first.memoryUsage) / first.memoryUsage) * 100;
    
    // Calculate performance decline
    const performanceDecline = ((first.rps - last.rps) / first.rps) * 100;
    
    // Calculate stability score based on variance
    const rpsValues = this.intervals.map(i => i.rps);
    const avgRps = rpsValues.reduce((a, b) => a + b, 0) / rpsValues.length;
    const variance = rpsValues.reduce((acc, rps) => acc + Math.pow(rps - avgRps, 2), 0) / rpsValues.length;
    const stabilityScore = Math.max(0, 100 - (Math.sqrt(variance) / avgRps) * 100);
    
    return {
      memoryGrowth,
      performanceDecline,
      stabilityScore
    };
  }

  /**
   * Get interval results
   */
  getIntervals(): LoadTestResult['intervals'] {
    return this.intervals;
  }
}

/**
 * Automated performance regression testing
 */
export class RegressionTester {
  private baselineResults: Map<string, BenchmarkResult> = new Map();

  /**
   * Set baseline performance results
   */
  setBaseline(testName: string, result: BenchmarkResult): void {
    this.baselineResults.set(testName, result);
  }

  /**
   * Run regression test against baseline
   */
  async runRegressionTest(testName: string, config: BenchmarkConfig): Promise<{
    current: BenchmarkResult;
    baseline: BenchmarkResult | null;
    regression: boolean;
    differences: {
      rpsChange: number;
      responseTimeChange: number;
      errorRateChange: number;
    };
  }> {
    const benchmark = new PerformanceBenchmark(config);
    const current = await benchmark.run();
    const baseline = this.baselineResults.get(testName);
    
    if (!baseline) {
      return {
        current,
        baseline: null,
        regression: false,
        differences: {
          rpsChange: 0,
          responseTimeChange: 0,
          errorRateChange: 0
        }
      };
    }

    const differences = {
      rpsChange: ((current.requestsPerSecond - baseline.requestsPerSecond) / baseline.requestsPerSecond) * 100,
      responseTimeChange: ((current.responseTime.average - baseline.responseTime.average) / baseline.responseTime.average) * 100,
      errorRateChange: current.errorRate - baseline.errorRate
    };

    // Detect regression (>10% performance drop or >5% error rate increase)
    const regression = 
      differences.rpsChange < -10 ||
      differences.responseTimeChange > 10 ||
      differences.errorRateChange > 5;

    return {
      current,
      baseline,
      regression,
      differences
    };
  }

  /**
   * Get all baseline results
   */
  getBaselines(): Map<string, BenchmarkResult> {
    return new Map(this.baselineResults);
  }

  /**
   * Clear all baselines
   */
  clearBaselines(): void {
    this.baselineResults.clear();
  }
}
