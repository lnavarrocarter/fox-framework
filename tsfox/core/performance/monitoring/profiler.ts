/**
 * @fileoverview Performance profiler for detailed analysis
 * @module tsfox/core/performance/monitoring
 */

import { 
  ProfilingResult, 
  FunctionProfile, 
  MemoryProfile, 
  CPUProfile, 
  ProfilingSummary,
  GCEvent,
  CPUTimelinePoint
} from '../interfaces';

/**
 * High-precision performance profiler
 */
export class Profiler {
  private isActive: boolean = false;
  private startTime: bigint = 0n;
  private functionCalls: Map<string, FunctionCallData> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private cpuTimeline: CPUTimelinePoint[] = [];
  private gcEvents: GCEvent[] = [];
  private profilingInterval?: NodeJS.Timeout;

  /**
   * Start profiling session
   */
  start(): void {
    if (this.isActive) {
      throw new Error('Profiling session already active');
    }

    this.isActive = true;
    this.startTime = process.hrtime.bigint();
    this.functionCalls.clear();
    this.memorySnapshots = [];
    this.cpuTimeline = [];
    this.gcEvents = [];

    // Start periodic data collection
    this.profilingInterval = setInterval(() => {
      this.collectPerformanceData();
    }, 100); // Collect data every 100ms

    // Set up GC event listeners if available
    this.setupGCListeners();
  }

  /**
   * Stop profiling and return results
   */
  stop(): ProfilingResult {
    if (!this.isActive) {
      throw new Error('No active profiling session');
    }

    this.isActive = false;
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - this.startTime) / 1e6; // Convert to milliseconds

    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = undefined;
    }

    // Generate profiling result
    const result: ProfilingResult = {
      duration,
      functions: this.generateFunctionProfiles(),
      memory: this.generateMemoryProfile(),
      cpu: this.generateCPUProfile(),
      summary: this.generateSummary(duration)
    };

    return result;
  }

  /**
   * Profile a synchronous function execution
   */
  profileFunction<T>(name: string, fn: () => T): T {
    if (!this.isActive) {
      return fn();
    }

    const start = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = fn();
      
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;
      const executionTime = Number(end - start) / 1e6;
      const memoryDelta = endMemory - startMemory;

      this.recordFunctionCall(name, executionTime, memoryDelta);
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const executionTime = Number(end - start) / 1e6;
      
      this.recordFunctionCall(name, executionTime, 0, error);
      throw error;
    }
  }

  /**
   * Profile an asynchronous function execution
   */
  async profileAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isActive) {
      return fn();
    }

    const start = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;
      const executionTime = Number(end - start) / 1e6;
      const memoryDelta = endMemory - startMemory;

      this.recordFunctionCall(name, executionTime, memoryDelta);
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const executionTime = Number(end - start) / 1e6;
      
      this.recordFunctionCall(name, executionTime, 0, error);
      throw error;
    }
  }

  /**
   * Check if profiler is currently active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current profiling duration
   */
  getCurrentDuration(): number {
    if (!this.isActive) {
      return 0;
    }
    
    const currentTime = process.hrtime.bigint();
    return Number(currentTime - this.startTime) / 1e6;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private recordFunctionCall(
    name: string, 
    executionTime: number, 
    memoryDelta: number, 
    error?: any
  ): void {
    if (!this.functionCalls.has(name)) {
      this.functionCalls.set(name, {
        name,
        totalTime: 0,
        calls: 0,
        errors: 0,
        totalMemoryDelta: 0,
        maxTime: 0,
        minTime: Number.MAX_VALUE
      });
    }

    const callData = this.functionCalls.get(name)!;
    callData.totalTime += executionTime;
    callData.calls += 1;
    callData.totalMemoryDelta += memoryDelta;
    callData.maxTime = Math.max(callData.maxTime, executionTime);
    callData.minTime = Math.min(callData.minTime, executionTime);

    if (error) {
      callData.errors += 1;
    }
  }

  private collectPerformanceData(): void {
    const timestamp = Date.now();
    const memUsage = process.memoryUsage();

    // Collect memory snapshot
    this.memorySnapshots.push({
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0
    });

    // Collect CPU data (simplified)
    const cpuUsage = this.calculateCPUUsage();
    this.cpuTimeline.push({
      timestamp,
      usage: cpuUsage
    });

    // Limit memory usage by keeping only recent data
    const maxSnapshots = 1000;
    if (this.memorySnapshots.length > maxSnapshots) {
      this.memorySnapshots = this.memorySnapshots.slice(-maxSnapshots);
    }
    if (this.cpuTimeline.length > maxSnapshots) {
      this.cpuTimeline = this.cpuTimeline.slice(-maxSnapshots);
    }
  }

  private calculateCPUUsage(): number {
    // Simplified CPU usage calculation
    // In a real implementation, you might use more sophisticated methods
    const usage = process.cpuUsage();
    const total = usage.user + usage.system;
    return Math.min(100, (total / 1000000) * 100); // Convert to percentage
  }

  private setupGCListeners(): void {
    // Set up garbage collection event listeners if available
    // This is a simplified version - in practice you might use gc-stats or similar
    if (typeof global !== 'undefined' && 'gc' in global && typeof global.gc === 'function') {
      const originalGC = global.gc;
      
      // Override gc function to track events
      (global as any).gc = (...args: any[]) => {
        const start = Date.now();
        const memBefore = process.memoryUsage().heapUsed;
        
        const result = originalGC.apply(global, args as [any]);
        
        const duration = Date.now() - start;
        const memAfter = process.memoryUsage().heapUsed;
        const memoryFreed = memBefore - memAfter;

        this.gcEvents.push({
          timestamp: start,
          type: 'major', // Simplified - could detect minor/major/incremental
          duration,
          memoryFreed: Math.max(0, memoryFreed)
        });

        return result;
      };
    }
  }

  private generateFunctionProfiles(): FunctionProfile[] {
    const profiles: FunctionProfile[] = [];
    const totalExecutionTime = Array.from(this.functionCalls.values())
      .reduce((sum, call) => sum + call.totalTime, 0);

    for (const callData of this.functionCalls.values()) {
      profiles.push({
        name: callData.name,
        totalTime: callData.totalTime,
        averageTime: callData.totalTime / callData.calls,
        calls: callData.calls,
        percentage: totalExecutionTime > 0 ? 
          (callData.totalTime / totalExecutionTime) * 100 : 0
      });
    }

    // Sort by total time (descending)
    return profiles.sort((a, b) => b.totalTime - a.totalTime);
  }

  private generateMemoryProfile(): MemoryProfile {
    if (this.memorySnapshots.length === 0) {
      return {
        totalAllocations: 0,
        peakUsage: 0,
        averageUsage: 0,
        allocationsByType: {},
        gcEvents: this.gcEvents
      };
    }

    const heapUsages = this.memorySnapshots.map(s => s.heapUsed);
    const peakUsage = Math.max(...heapUsages);
    const averageUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;

    return {
      totalAllocations: this.memorySnapshots.length,
      peakUsage,
      averageUsage,
      allocationsByType: {
        'heap': averageUsage,
        'external': this.memorySnapshots[this.memorySnapshots.length - 1]?.external || 0
      },
      gcEvents: this.gcEvents
    };
  }

  private generateCPUProfile(): CPUProfile {
    if (this.cpuTimeline.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        timeline: []
      };
    }

    const usages = this.cpuTimeline.map(point => point.usage);
    const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
    const peakUsage = Math.max(...usages);

    return {
      averageUsage,
      peakUsage,
      timeline: this.cpuTimeline
    };
  }

  private generateSummary(duration: number): ProfilingSummary {
    const totalFunctionCalls = Array.from(this.functionCalls.values())
      .reduce((sum, call) => sum + call.calls, 0);

    const topBottlenecks = Array.from(this.functionCalls.values())
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5)
      .map(call => call.name);

    const recommendations: string[] = [];
    
    // Generate basic recommendations based on profiling data
    if (this.memorySnapshots.length > 0) {
      const memoryGrowth = this.calculateMemoryGrowth();
      if (memoryGrowth > 50) { // More than 50% growth
        recommendations.push('Consider optimizing memory usage - detected significant memory growth');
      }
    }

    if (this.functionCalls.size > 0) {
      const slowestFunction = Array.from(this.functionCalls.values())
        .sort((a, b) => b.totalTime - a.totalTime)[0];
      
      if (slowestFunction.totalTime > duration * 0.3) {
        recommendations.push(`Consider optimizing ${slowestFunction.name} - takes ${(slowestFunction.totalTime / duration * 100).toFixed(1)}% of total time`);
      }
    }

    if (this.gcEvents.length > 0) {
      const totalGCTime = this.gcEvents.reduce((sum, event) => sum + event.duration, 0);
      if (totalGCTime > duration * 0.1) {
        recommendations.push('High garbage collection overhead detected - consider memory optimization');
      }
    }

    // Calculate performance score (0-100)
    let performanceScore = 100;
    
    // Deduct points for high GC overhead
    const gcOverhead = this.gcEvents.reduce((sum, event) => sum + event.duration, 0) / duration;
    performanceScore -= Math.min(30, gcOverhead * 300);
    
    // Deduct points for memory growth
    if (this.memorySnapshots.length > 0) {
      const memoryGrowth = this.calculateMemoryGrowth();
      performanceScore -= Math.min(20, memoryGrowth / 5);
    }
    
    // Deduct points for function call overhead
    const avgCallTime = totalFunctionCalls > 0 ? 
      Array.from(this.functionCalls.values()).reduce((sum, call) => sum + call.totalTime, 0) / totalFunctionCalls : 0;
    if (avgCallTime > 10) { // More than 10ms average
      performanceScore -= Math.min(20, (avgCallTime - 10) * 2);
    }

    return {
      totalDuration: duration,
      totalFunctionCalls,
      topBottlenecks,
      recommendations,
      performanceScore: Math.max(0, Math.round(performanceScore))
    };
  }

  private calculateMemoryGrowth(): number {
    if (this.memorySnapshots.length < 2) {
      return 0;
    }

    const initial = this.memorySnapshots[0].heapUsed;
    const final = this.memorySnapshots[this.memorySnapshots.length - 1].heapUsed;
    
    return ((final - initial) / initial) * 100;
  }
}

// ============================================================================
// HELPER INTERFACES
// ============================================================================

interface FunctionCallData {
  name: string;
  totalTime: number;
  calls: number;
  errors: number;
  totalMemoryDelta: number;
  maxTime: number;
  minTime: number;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}
