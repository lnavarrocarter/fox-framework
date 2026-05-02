// tsfox/cli/commands/health/check.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import axios from 'axios';

export const HealthCheckCommand: CommandInterface = {
  name: 'check',
  description: 'Run health checks on running application',
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
      description: 'Health check endpoint path',
      type: 'string',
      default: '/health'
    },
    {
      name: 'timeout',
      alias: 't',
      description: 'Request timeout in milliseconds',
      type: 'number',
      default: 5000
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (json|table)',
      type: 'string',
      default: 'table',
      choices: ['json', 'table']
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.timeout && options.timeout <= 0) {
      return {
        valid: false,
        message: 'Timeout must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🏥 Running Fox Framework Health Checks...');
    
    try {
      const baseUrl = options.url || 'http://localhost:3000';
      const endpoint = options.endpoint || '/health';
      const timeout = options.timeout || 5000;
      const format = options.format || 'table';
      
      console.log(`🔍 Checking: ${baseUrl}${endpoint}`);
      console.log(`⏱️  Timeout: ${timeout}ms`);
      console.log('');
      
      const startTime = Date.now();
      
      // Run health check
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout,
        validateStatus: () => true // Don't throw on non-2xx status
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Parse response
      const healthData = response.data;
      const status = response.status;
      
      // Display results
      if (format === 'json') {
        console.log(JSON.stringify({
          status,
          responseTime: `${responseTime}ms`,
          data: healthData
        }, null, 2));
      } else {
        // Table format
        console.log(`📊 Health Check Results`);
        console.log(`${'='.repeat(50)}`);
        console.log(`🔢 Status Code: ${status === 200 ? '✅' : '❌'} ${status}`);
        console.log(`⏱️  Response Time: ${responseTime}ms`);
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log('');
        
        if (healthData && typeof healthData === 'object') {
          if (healthData.status) {
            console.log(`🎯 Overall Status: ${healthData.status === 'pass' ? '✅' : '❌'} ${healthData.status.toUpperCase()}`);
          }
          
          if (healthData.checks) {
            console.log('\n🔍 Individual Checks:');
            console.log(`${'─'.repeat(50)}`);
            
            Object.entries(healthData.checks).forEach(([checkName, checkData]: [string, any]) => {
              const icon = checkData.status === 'pass' ? '✅' : 
                          checkData.status === 'warn' ? '⚠️' : '❌';
              console.log(`${icon} ${checkName.padEnd(15)} ${checkData.status.toUpperCase()}`);
              if (checkData.output) {
                console.log(`   ↳ ${checkData.output}`);
              }
            });
          }
          
          if (healthData.uptime) {
            console.log(`\n⏰ Uptime: ${healthData.uptime}`);
          }
          
          if (healthData.timestamp) {
            console.log(`📅 Check Time: ${healthData.timestamp}`);
          }
        }
      }
      
      // Also check ready and live endpoints
      console.log('\n🔄 Additional Endpoints:');
      console.log(`${'─'.repeat(50)}`);
      
      try {
        const readyResponse = await axios.get(`${baseUrl}${endpoint}/ready`, { timeout: 3000 });
        console.log(`✅ Ready: ${readyResponse.status} (${readyResponse.statusText})`);
      } catch (error) {
        console.log(`❌ Ready: Failed - ${axios.isAxiosError(error) ? error.message : 'Unknown error'}`);
      }
      
      try {
        const liveResponse = await axios.get(`${baseUrl}${endpoint}/live`, { timeout: 3000 });
        console.log(`✅ Live: ${liveResponse.status} (${liveResponse.statusText})`);
      } catch (error) {
        console.log(`❌ Live: Failed - ${axios.isAxiosError(error) ? error.message : 'Unknown error'}`);
      }
      
      console.log('');
      
      if (status === 200) {
        console.log('🎉 Health check completed successfully!');
      } else {
        console.log('⚠️  Health check completed with warnings/errors');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', axios.isAxiosError(error) ? error.message : error);
      process.exit(1);
    }
  }
};
