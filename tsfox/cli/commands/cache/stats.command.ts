// tsfox/cli/commands/cache/stats.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import axios from 'axios';

export const CacheStatsCommand: CommandInterface = {
  name: 'stats',
  description: 'View cache statistics from running application',
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
      name: 'refresh',
      alias: 'r',
      description: 'Auto-refresh interval in seconds (0 to disable)',
      type: 'number',
      default: 0
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (table|json)',
      type: 'string',
      default: 'table',
      choices: ['table', 'json']
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.refresh && options.refresh < 0) {
      return {
        valid: false,
        message: 'Refresh interval cannot be negative'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const baseUrl = options.url || 'http://localhost:3000';
    const refreshInterval = (options.refresh || 0) * 1000;
    const format = options.format || 'table';
    
    console.log('🗄️  Fox Framework Cache Statistics');
    console.log('═'.repeat(50));
    console.log(`🔗 Source: ${baseUrl}`);
    if (refreshInterval > 0) {
      console.log(`🔄 Auto-refresh: ${options.refresh}s`);
    }
    console.log('');
    
    let isRunning = true;
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping cache stats viewer...');
      isRunning = false;
      process.exit(0);
    });
    
    const fetchAndDisplayStats = async (): Promise<void> => {
      try {
        if (refreshInterval > 0) {
          console.clear();
          console.log('🗄️  Fox Framework Cache Statistics');
          console.log('═'.repeat(50));
          console.log(`🔗 Source: ${baseUrl}`);
          console.log(`📅 Last Update: ${new Date().toISOString()}`);
          console.log(`🔄 Auto-refresh: ${options.refresh}s (Press Ctrl+C to stop)`);
          console.log('');
        }
        
        const startTime = Date.now();
        
        // Try different endpoints for cache stats
        const endpoints = [
          '/api/cache/stats',
          '/cache/stats',
          '/admin/cache/stats'
        ];
        
        let response;
        let success = false;
        
        for (const endpoint of endpoints) {
          try {
            response = await axios.get(`${baseUrl}${endpoint}`, {
              timeout: 5000,
              validateStatus: () => true
            });
            
            if (response.status === 200) {
              success = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        const responseTime = Date.now() - startTime;
        
        if (!success) {
          console.error('❌ No cache stats endpoint found');
          console.log('\n💡 Add cache stats endpoint to your application:');
          console.log('   GET /api/cache/stats');
          console.log('\nExample implementation:');
          console.log('   app.get("/api/cache/stats", (req, res) => {');
          console.log('     const metrics = cache.getMetrics();');
          console.log('     res.json({ provider: "memory", metrics });');
          console.log('   });');
          return;
        }
        
        const data = response?.data;
        
        if (!data) {
          console.error('❌ No data received from cache stats endpoint');
          return;
        }
        
        if (format === 'json') {
          console.log(JSON.stringify({
            responseTime: `${responseTime}ms`,
            data: data
          }, null, 2));
          return;
        }
        
        // Table format
        console.log('📊 Cache Statistics Summary:');
        console.log('─'.repeat(40));
        
        if (data.provider) {
          console.log(`🔧 Provider: ${data.provider.toUpperCase()}`);
        }
        
        console.log(`⏱️  Response Time: ${responseTime}ms`);
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log('');
        
        if (data.metrics) {
          const metrics = data.metrics;
          
          console.log('📈 Performance Metrics:');
          console.log('─'.repeat(30));
          
          if (metrics.hits !== undefined && metrics.misses !== undefined) {
            const total = metrics.hits + metrics.misses;
            const hitRatio = total > 0 ? ((metrics.hits / total) * 100).toFixed(1) : '0.0';
            
            console.log(`✅ Cache Hits: ${metrics.hits.toLocaleString()}`);
            console.log(`❌ Cache Misses: ${metrics.misses.toLocaleString()}`);
            console.log(`📊 Hit Ratio: ${hitRatio}%`);
            console.log(`🔢 Total Requests: ${total.toLocaleString()}`);
          }
          
          if (metrics.totalKeys !== undefined) {
            console.log(`🗂️  Total Keys: ${metrics.totalKeys.toLocaleString()}`);
          }
          
          if (metrics.averageResponseTime !== undefined) {
            console.log(`⚡ Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms`);
          }
          
          if (metrics.memoryUsage !== undefined) {
            const memoryMB = (metrics.memoryUsage / 1024 / 1024).toFixed(2);
            console.log(`💾 Memory Usage: ${memoryMB} MB`);
          }
          
          if (metrics.totalRequests !== undefined) {
            console.log(`📋 Total Requests: ${metrics.totalRequests.toLocaleString()}`);
          }
          
          // Show additional provider-specific stats
          if (data.provider === 'redis' && metrics.connections) {
            console.log('\n🔗 Redis Metrics:');
            console.log('─'.repeat(20));
            console.log(`🔌 Connections: ${metrics.connections}`);
            
            if (metrics.keyspace) {
              console.log(`🗄️  Keyspace: ${metrics.keyspace}`);
            }
          }
          
          if (data.provider === 'memory' && metrics.maxSize) {
            console.log('\n💾 Memory Cache Metrics:');
            console.log('─'.repeat(25));
            console.log(`📏 Max Size: ${metrics.maxSize}`);
            
            if (metrics.evictions) {
              console.log(`🔄 Evictions: ${metrics.evictions}`);
            }
          }
        }
        
        // Show cache health
        if (data.health) {
          console.log('\n🏥 Cache Health:');
          console.log('─'.repeat(20));
          console.log(`Status: ${data.health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
          
          if (data.health.lastError) {
            console.log(`❌ Last Error: ${data.health.lastError}`);
          }
        }
        
        if (refreshInterval === 0) {
          console.log('\n💡 Tip: Use --refresh <seconds> for auto-refresh');
          console.log('💡 Tip: Use --format json for machine-readable output');
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch cache stats:', axios.isAxiosError(error) ? error.message : error);
        if (refreshInterval === 0) {
          process.exit(1);
        }
      }
    };
    
    // Initial fetch
    await fetchAndDisplayStats();
    
    // Set up auto-refresh if requested
    if (refreshInterval > 0) {
      const intervalId = setInterval(async () => {
        if (isRunning) {
          await fetchAndDisplayStats();
        } else {
          clearInterval(intervalId);
        }
      }, refreshInterval);
    } else {
      console.log('\n🦊 Cache stats completed!');
    }
  }
};
