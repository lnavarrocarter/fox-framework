// tsfox/cli/commands/performance/benchmark.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const PerformanceBenchmarkCommand: CommandInterface = {
  name: 'benchmark',
  description: 'Run performance benchmarks on the application',
  arguments: [],
  options: [
    {
      name: 'url',
      alias: 'u',
      description: 'Base URL of the application',
      type: 'string',
      default: 'http://localhost:3000'
    },
    {
      name: 'duration',
      alias: 'd',
      description: 'Test duration in seconds',
      type: 'number',
      default: 30
    },
    {
      name: 'concurrency',
      alias: 'c',
      description: 'Number of concurrent requests',
      type: 'number',
      default: 10
    },
    {
      name: 'rps',
      alias: 'r',
      description: 'Target requests per second',
      type: 'number',
      default: 100
    },
    {
      name: 'endpoint',
      alias: 'e',
      description: 'Endpoint to benchmark',
      type: 'string',
      default: '/'
    },
    {
      name: 'warmup',
      alias: 'w',
      description: 'Warmup duration in seconds',
      type: 'number',
      default: 5
    },
    {
      name: 'save',
      alias: 's',
      description: 'Save results to file',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.duration && options.duration <= 0) {
      return {
        valid: false,
        message: 'Duration must be greater than 0'
      };
    }
    if (options.concurrency && options.concurrency <= 0) {
      return {
        valid: false,
        message: 'Concurrency must be greater than 0'
      };
    }
    if (options.rps && options.rps <= 0) {
      return {
        valid: false,
        message: 'RPS must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('⚡ Fox Framework Performance Benchmark');
    console.log('═'.repeat(50));
    
    try {
      const baseUrl = options.url || 'http://localhost:3000';
      const duration = (options.duration || 30) * 1000; // Convert to milliseconds
      const concurrency = options.concurrency || 10;
      const targetRPS = options.rps || 100;
      const endpoint = options.endpoint || '/';
      const warmupDuration = (options.warmup || 5) * 1000;
      const saveResults = options.save;
      
      const targetUrl = `${baseUrl}${endpoint}`;
      
      console.log(`🎯 Target: ${targetUrl}`);
      console.log(`⏱️  Duration: ${options.duration || 30}s`);
      console.log(`🔢 Concurrency: ${concurrency}`);
      console.log(`🚀 Target RPS: ${targetRPS}`);
      console.log(`🏃 Warmup: ${options.warmup || 5}s`);
      console.log('');
      
      // Dynamic import of performance system
      const { PerformanceBenchmark } = await import('../../../core/performance/benchmarking');
      
      const benchmark = new PerformanceBenchmark({
        duration,
        concurrency,
        targetRPS,
        warmupDuration,
        urls: [targetUrl],
        method: 'GET',
        headers: {}
      });
      
      console.log('🏃 Starting warmup...');
      
      // Run benchmark
      const result = await benchmark.run();
      
      console.log('\n📊 Benchmark Results:');
      console.log('═'.repeat(40));
      
      // Display results
      console.log(`⏱️  Total Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`🔢 Total Requests: ${result.totalRequests.toLocaleString()}`);
      console.log(`✅ Successful: ${result.successfulRequests.toLocaleString()}`);
      console.log(`❌ Failed: ${result.failedRequests.toLocaleString()}`);
      const successRate = ((result.totalRequests - result.failedRequests) / result.totalRequests) * 100;
      console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
      console.log('');
      
      // Performance metrics
      console.log('🚀 Performance Metrics:');
      console.log('─'.repeat(25));
      console.log(`   RPS: ${result.requestsPerSecond.toFixed(0)}`);
      console.log(`   Avg Response: ${result.responseTime.average.toFixed(2)}ms`);
      console.log(`   Min Response: ${result.responseTime.min.toFixed(2)}ms`);
      console.log(`   Max Response: ${result.responseTime.max.toFixed(2)}ms`);
      console.log(`   P50: ${result.responseTime.median.toFixed(2)}ms`);  // median is P50
      console.log(`   P95: ${result.responseTime.p95.toFixed(2)}ms`);
      console.log(`   P99: ${result.responseTime.p99.toFixed(2)}ms`);
      console.log('');
      
      // Error analysis
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.log('❌ Error Analysis:');
        console.log('─'.repeat(20));
        Object.entries(result.errors).forEach(([code, count]) => {
          console.log(`   ${code}: ${count} occurrences`);
        });
        console.log('');
      }
      
      // Performance assessment
      console.log('🎯 Performance Assessment:');
      console.log('─'.repeat(30));
      
      const actualRPS = result.requestsPerSecond;
      const targetAchieved = (actualRPS / targetRPS) * 100;
      
      if (targetAchieved >= 90) {
        console.log('   ✅ Excellent: Target RPS achieved');
      } else if (targetAchieved >= 70) {
        console.log('   ✅ Good: Near target performance');
      } else if (targetAchieved >= 50) {
        console.log('   ⚠️  Moderate: Below target performance');
      } else {
        console.log('   ❌ Poor: Significantly below target');
      }
      
      const avgResponseTime = result.responseTime.average;
      if (avgResponseTime < 50) {
        console.log('   ✅ Excellent response times (<50ms)');
      } else if (avgResponseTime < 200) {
        console.log('   ✅ Good response times (<200ms)');
      } else if (avgResponseTime < 500) {
        console.log('   ⚠️  Moderate response times (<500ms)');
      } else {
        console.log('   ❌ Slow response times (>500ms)');
      }
      
      
      if (successRate >= 99.5) {
        console.log('   ✅ Excellent reliability (>99.5%)');
      } else if (successRate >= 99) {
        console.log('   ✅ Good reliability (>99%)');
      } else if (successRate >= 95) {
        console.log('   ⚠️  Moderate reliability (>95%)');
      } else {
        console.log('   ❌ Poor reliability (<95%)');
      }
      
      // Recommendations
      console.log('\n💡 Recommendations:');
      console.log('─'.repeat(20));
      
      if (actualRPS < targetRPS * 0.8) {
        console.log('   - Consider enabling caching');
        console.log('   - Optimize database queries');
        console.log('   - Review application bottlenecks');
      }
      
      if (result.responseTime.p95 > 500) {
        console.log('   - Investigate slow endpoints');
        console.log('   - Consider response compression');
        console.log('   - Review middleware performance');
      }
      
      if (successRate < 99) {
        console.log('   - Check error logs for failure patterns');
        console.log('   - Review timeout configurations');
        console.log('   - Implement circuit breakers');
      }
      
      // Save results if requested
      if (saveResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `benchmark-${timestamp}.json`;
        const filepath = `${context.projectRoot}/${filename}`;
        
        const reportData = {
          timestamp: new Date().toISOString(),
          config: {
            url: targetUrl,
            duration: options.duration,
            concurrency,
            targetRPS,
            warmup: options.warmup
          },
          results: result
        };
        
        const fs = await import('fs');
        fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
        console.log(`\n📁 Results saved to: ${filename}`);
      }
      
      console.log('\n🎉 Benchmark completed successfully!');
      console.log('\n💡 Tips:');
      console.log('   - Run multiple benchmarks for consistent results');
      console.log('   - Use --save to keep historical data');
      console.log('   - Monitor system resources during tests');
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }
};
