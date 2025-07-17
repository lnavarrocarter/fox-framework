// tsfox/cli/commands/cache/benchmark.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const CacheBenchmarkCommand: CommandInterface = {
  name: 'benchmark',
  description: 'Run cache performance benchmark',
  arguments: [],
  options: [
    {
      name: 'operations',
      alias: 'o',
      description: 'Number of operations to perform',
      type: 'number',
      default: 1000
    },
    {
      name: 'keys',
      alias: 'k',
      description: 'Number of unique keys',
      type: 'number',
      default: 100
    },
    {
      name: 'read-ratio',
      alias: 'r',
      description: 'Read operation ratio (0.0-1.0)',
      type: 'number',
      default: 0.7
    },
    {
      name: 'provider',
      alias: 'p',
      description: 'Cache provider to benchmark (memory|redis|file)',
      type: 'string',
      default: 'memory',
      choices: ['memory', 'redis', 'file']
    },
    {
      name: 'warmup',
      alias: 'w',
      description: 'Warmup operations before benchmark',
      type: 'number',
      default: 100
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.operations && options.operations <= 0) {
      return {
        valid: false,
        message: 'Operations must be greater than 0'
      };
    }
    if (options.keys && options.keys <= 0) {
      return {
        valid: false,
        message: 'Keys must be greater than 0'
      };
    }
    if (options['read-ratio'] && (options['read-ratio'] < 0 || options['read-ratio'] > 1)) {
      return {
        valid: false,
        message: 'Read ratio must be between 0.0 and 1.0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('⚡ Fox Framework Cache Benchmark');
    console.log('═'.repeat(50));
    
    try {
      const operations = options.operations || 1000;
      const keyCount = options.keys || 100;
      const readRatio = options['read-ratio'] || 0.7;
      const provider = options.provider || 'memory';
      const warmupOps = options.warmup || 100;
      
      console.log(`🔧 Provider: ${provider.toUpperCase()}`);
      console.log(`🔢 Operations: ${operations.toLocaleString()}`);
      console.log(`🗂️  Unique Keys: ${keyCount.toLocaleString()}`);
      console.log(`📖 Read Ratio: ${(readRatio * 100).toFixed(1)}%`);
      console.log(`🏃 Warmup: ${warmupOps.toLocaleString()} operations`);
      console.log('');
      
      // Dynamic import of cache system
      const { CacheFactory } = await import('../../../core/cache/cache.factory');
      
      // Create cache instance
      const cacheConfig = {
        provider: provider as 'memory' | 'redis' | 'file',
        [provider]: provider === 'memory' 
          ? { maxSize: keyCount * 2, defaultTTL: 300 }
          : provider === 'redis'
          ? { url: 'redis://localhost:6379', defaultTTL: 300 }
          : { directory: './cache-benchmark', defaultTTL: 300 }
      };
      
      console.log('🚀 Initializing cache...');
      const cache = CacheFactory.create(cacheConfig);
      
      // Generate test data
      console.log('📝 Generating test data...');
      const keys = Array.from({ length: keyCount }, (_, i) => `benchmark:key:${i}`);
      const values = Array.from({ length: keyCount }, (_, i) => ({
        id: i,
        data: `Test data for key ${i}`,
        timestamp: Date.now(),
        payload: new Array(100).fill(`data-${i}`).join(',') // ~1KB payload
      }));
      
      // Warmup phase
      console.log(`🏃 Running warmup (${warmupOps} operations)...`);
      for (let i = 0; i < warmupOps; i++) {
        const keyIndex = Math.floor(Math.random() * keyCount);
        const key = keys[keyIndex];
        
        if (Math.random() < readRatio) {
          await cache.get(key);
        } else {
          await cache.set(key, values[keyIndex], 300);
        }
      }
      
      // Note: Metrics reset not available in current cache interface
      console.log('📊 Starting benchmark measurement...');
      
      console.log('⚡ Starting benchmark...');
      const startTime = process.hrtime.bigint();
      const operationTimes: number[] = [];
      let readOps = 0;
      let writeOps = 0;
      let errors = 0;
      
      // Run benchmark
      for (let i = 0; i < operations; i++) {
        const opStart = process.hrtime.bigint();
        const keyIndex = Math.floor(Math.random() * keyCount);
        const key = keys[keyIndex];
        
        try {
          if (Math.random() < readRatio) {
            await cache.get(key);
            readOps++;
          } else {
            await cache.set(key, values[keyIndex], 300);
            writeOps++;
          }
          
          const opEnd = process.hrtime.bigint();
          const opTime = Number(opEnd - opStart) / 1e6; // Convert to milliseconds
          operationTimes.push(opTime);
          
        } catch (error) {
          errors++;
        }
        
        // Progress indicator
        if ((i + 1) % Math.floor(operations / 10) === 0) {
          const progress = ((i + 1) / operations * 100).toFixed(0);
          process.stdout.write(`\r⚡ Progress: ${progress}%`);
        }
      }
      
      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      
      console.log('\n\n📊 Benchmark Results:');
      console.log('═'.repeat(40));
      
      // Basic stats
      console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`🔢 Operations: ${operations.toLocaleString()}`);
      console.log(`📖 Read Ops: ${readOps.toLocaleString()}`);
      console.log(`✏️  Write Ops: ${writeOps.toLocaleString()}`);
      console.log(`❌ Errors: ${errors}`);
      console.log('');
      
      // Performance metrics
      const opsPerSecond = (operations / (totalTime / 1000)).toFixed(0);
      console.log(`🚀 Operations/sec: ${parseInt(opsPerSecond).toLocaleString()}`);
      
      if (operationTimes.length > 0) {
        const avgTime = operationTimes.reduce((a, b) => a + b) / operationTimes.length;
        const sortedTimes = operationTimes.sort((a, b) => a - b);
        const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        const maxTime = Math.max(...operationTimes);
        const minTime = Math.min(...operationTimes);
        
        console.log('\n📈 Latency Distribution:');
        console.log('─'.repeat(25));
        console.log(`   Average: ${avgTime.toFixed(2)}ms`);
        console.log(`   Minimum: ${minTime.toFixed(2)}ms`);
        console.log(`   Maximum: ${maxTime.toFixed(2)}ms`);
        console.log(`   P50: ${p50.toFixed(2)}ms`);
        console.log(`   P95: ${p95.toFixed(2)}ms`);
        console.log(`   P99: ${p99.toFixed(2)}ms`);
      }
      
      // Cache metrics
      const metrics = cache.getMetrics();
      if (metrics) {
        console.log('\n🗄️  Cache Metrics:');
        console.log('─'.repeat(20));
        
        if (metrics.hits !== undefined && metrics.misses !== undefined) {
          const hitRatio = ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(1);
          console.log(`   Hit Ratio: ${hitRatio}%`);
          console.log(`   Hits: ${metrics.hits.toLocaleString()}`);
          console.log(`   Misses: ${metrics.misses.toLocaleString()}`);
        }
        
        if (metrics.totalKeys !== undefined) {
          console.log(`   Total Keys: ${metrics.totalKeys.toLocaleString()}`);
        }
      }
      
      // Memory usage
      const memUsage = process.memoryUsage();
      console.log('\n💾 Memory Usage:');
      console.log('─'.repeat(18));
      console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
      
      // Performance recommendations
      console.log('\n💡 Performance Analysis:');
      console.log('─'.repeat(25));
      
      const avgOpsPerSec = parseInt(opsPerSecond);
      if (avgOpsPerSec > 10000) {
        console.log('   ✅ Excellent performance (>10k ops/sec)');
      } else if (avgOpsPerSec > 1000) {
        console.log('   ✅ Good performance (>1k ops/sec)');
      } else if (avgOpsPerSec > 100) {
        console.log('   ⚠️  Moderate performance (>100 ops/sec)');
      } else {
        console.log('   ❌ Low performance (<100 ops/sec)');
      }
      
      if (operationTimes.length > 0) {
        const avgTime = operationTimes.reduce((a, b) => a + b) / operationTimes.length;
        if (avgTime < 1) {
          console.log('   ✅ Excellent latency (<1ms avg)');
        } else if (avgTime < 10) {
          console.log('   ✅ Good latency (<10ms avg)');
        } else if (avgTime < 100) {
          console.log('   ⚠️  Moderate latency (<100ms avg)');
        } else {
          console.log('   ❌ High latency (>100ms avg)');
        }
      }
      
      if (errors > 0) {
        console.log(`   ⚠️  ${errors} errors occurred during benchmark`);
      }
      
      // Cleanup - clear cache after benchmark
      await cache.clear();
      console.log('🧹 Cache cleared after benchmark');
      
      console.log('\n🎉 Benchmark completed successfully!');
      console.log('\n💡 Tips:');
      console.log('   - Use --provider redis for distributed caching');
      console.log('   - Adjust --read-ratio based on your app workload');
      console.log('   - Run multiple benchmarks for consistent results');
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }
};
