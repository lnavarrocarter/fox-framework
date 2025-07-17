// tsfox/cli/commands/metrics/view.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import axios from 'axios';

export const MetricsViewCommand: CommandInterface = {
  name: 'view',
  description: 'View real-time metrics from running application',
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
      name: 'endpoint',
      alias: 'e',
      description: 'Metrics endpoint path',
      type: 'string',
      default: '/metrics'
    },
    {
      name: 'refresh',
      alias: 'r',
      description: 'Auto-refresh interval in seconds (0 to disable)',
      type: 'number',
      default: 0
    },
    {
      name: 'filter',
      alias: 'f',
      description: 'Filter metrics by name pattern',
      type: 'string'
    },
    {
      name: 'limit',
      alias: 'l',
      description: 'Limit number of metrics shown',
      type: 'number',
      default: 20
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.refresh && options.refresh < 0) {
      return {
        valid: false,
        message: 'Refresh interval cannot be negative'
      };
    }
    if (options.limit && options.limit <= 0) {
      return {
        valid: false,
        message: 'Limit must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const baseUrl = options.url || 'http://localhost:3000';
    const endpoint = options.endpoint || '/metrics';
    const refreshInterval = (options.refresh || 0) * 1000;
    const filter = options.filter;
    const limit = options.limit || 20;
    
    console.log('📊 Fox Framework Metrics Viewer');
    console.log('═'.repeat(50));
    console.log(`🔗 Source: ${baseUrl}${endpoint}`);
    if (refreshInterval > 0) {
      console.log(`🔄 Auto-refresh: ${options.refresh}s`);
    }
    if (filter) {
      console.log(`🔍 Filter: ${filter}`);
    }
    console.log(`📊 Limit: ${limit} metrics`);
    console.log('');
    
    let isRunning = true;
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping metrics viewer...');
      isRunning = false;
      process.exit(0);
    });
    
    const fetchAndDisplayMetrics = async (): Promise<void> => {
      try {
        console.clear();
        console.log('📊 Fox Framework Metrics Viewer');
        console.log('═'.repeat(50));
        console.log(`🔗 Source: ${baseUrl}${endpoint}`);
        console.log(`📅 Last Update: ${new Date().toISOString()}`);
        if (refreshInterval > 0) {
          console.log(`🔄 Auto-refresh: ${options.refresh}s (Press Ctrl+C to stop)`);
        }
        console.log('');
        
        const startTime = Date.now();
        
        // Fetch JSON format for better parsing
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 5000,
          params: { format: 'json' }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.status !== 200) {
          console.error(`❌ Failed to fetch metrics: ${response.status} ${response.statusText}`);
          return;
        }
        
        const data = response.data;
        
        // Handle different response formats
        let metrics: Record<string, any> = {};
        if (data.metrics) {
          metrics = data.metrics;
        } else if (typeof data === 'object') {
          metrics = data;
        }
        
        // Filter metrics if pattern provided
        let filteredMetrics = Object.entries(metrics);
        if (filter) {
          const filterRegex = new RegExp(filter, 'i');
          filteredMetrics = filteredMetrics.filter(([key]) => filterRegex.test(key));
        }
        
        // Limit results
        const limitedMetrics = filteredMetrics.slice(0, limit);
        
        // Display metrics
        console.log(`📊 Metrics Summary:`);
        console.log(`   Total: ${Object.keys(metrics).length}`);
        if (filter) {
          console.log(`   Filtered: ${filteredMetrics.length} (pattern: ${filter})`);
        }
        console.log(`   Shown: ${limitedMetrics.length}`);
        console.log(`   Response Time: ${responseTime}ms`);
        console.log('');
        
        if (limitedMetrics.length === 0) {
          console.log('📭 No metrics found matching criteria');
          return;
        }
        
        // Group metrics by type
        const systemMetrics: Array<[string, any]> = [];
        const httpMetrics: Array<[string, any]> = [];
        const customMetrics: Array<[string, any]> = [];
        
        limitedMetrics.forEach(([key, value]) => {
          if (key.includes('system_') || key.includes('cpu') || key.includes('memory')) {
            systemMetrics.push([key, value]);
          } else if (key.includes('http_') || key.includes('request') || key.includes('response')) {
            httpMetrics.push([key, value]);
          } else {
            customMetrics.push([key, value]);
          }
        });
        
        const displayMetricsGroup = (title: string, metrics: Array<[string, any]>) => {
          if (metrics.length === 0) return;
          
          console.log(`📈 ${title}:`);
          console.log('─'.repeat(50));
          
          metrics.forEach(([key, value]) => {
            const displayValue = typeof value === 'object' 
              ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
              : String(value);
            
            console.log(`   ${key.padEnd(30)} ${displayValue}`);
          });
          console.log('');
        };
        
        displayMetricsGroup('System Metrics', systemMetrics);
        displayMetricsGroup('HTTP Metrics', httpMetrics);
        displayMetricsGroup('Custom Metrics', customMetrics);
        
        if (refreshInterval === 0) {
          console.log('💡 Tip: Use --refresh <seconds> for auto-refresh');
          console.log('💡 Tip: Use --filter <pattern> to filter metrics');
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch metrics:', axios.isAxiosError(error) ? error.message : error);
        if (refreshInterval === 0) {
          process.exit(1);
        }
      }
    };
    
    // Initial fetch
    await fetchAndDisplayMetrics();
    
    // Set up auto-refresh if requested
    if (refreshInterval > 0) {
      const intervalId = setInterval(async () => {
        if (isRunning) {
          await fetchAndDisplayMetrics();
        } else {
          clearInterval(intervalId);
        }
      }, refreshInterval);
    } else {
      console.log('\n🦊 Metrics view completed!');
    }
  }
};
