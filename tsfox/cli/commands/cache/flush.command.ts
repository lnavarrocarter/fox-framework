// tsfox/cli/commands/cache/flush.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import axios from 'axios';

export const CacheFlushCommand: CommandInterface = {
  name: 'flush',
  description: 'Flush cache in running application',
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
      name: 'pattern',
      alias: 'p',
      description: 'Pattern to match keys for selective flush',
      type: 'string'
    },
    {
      name: 'confirm',
      alias: 'c',
      description: 'Skip confirmation prompt',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🗄️  Fox Framework Cache Flush');
    
    try {
      const baseUrl = options.url || 'http://localhost:3000';
      const pattern = options.pattern;
      const skipConfirm = options.confirm;
      
      console.log(`🔗 Target: ${baseUrl}`);
      if (pattern) {
        console.log(`🔍 Pattern: ${pattern}`);
      } else {
        console.log('🗂️  Action: Flush ALL cache');
      }
      
      // Confirmation prompt (if not skipped)
      if (!skipConfirm) {
        const { default: inquirer } = await import('inquirer');
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: pattern 
              ? `Flush cache entries matching pattern '${pattern}'?`
              : 'Flush ALL cache entries? This cannot be undone.',
            default: false
          }
        ]);
        
        if (!answer.proceed) {
          console.log('❌ Cache flush cancelled');
          return;
        }
      }
      
      console.log('🚀 Flushing cache...');
      const startTime = Date.now();
      
      // Try different endpoints for cache flushing
      const endpoints = [
        '/api/cache/flush',
        '/cache/flush',
        '/admin/cache/flush'
      ];
      
      let success = false;
      let response;
      
      for (const endpoint of endpoints) {
        try {
          const requestConfig = {
            timeout: 10000,
            validateStatus: () => true
          };
          
          if (pattern) {
            response = await axios.delete(`${baseUrl}${endpoint}`, {
              ...requestConfig,
              params: { pattern }
            });
          } else {
            response = await axios.delete(`${baseUrl}${endpoint}`, requestConfig);
          }
          
          if (response.status >= 200 && response.status < 300) {
            success = true;
            break;
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (success) {
        console.log(`✅ Cache flush completed (${responseTime}ms)`);
        
        if (response?.data) {
          if (response.data.message) {
            console.log(`📝 Message: ${response.data.message}`);
          }
          if (response.data.cleared) {
            console.log(`🗑️  Items cleared: ${response.data.cleared}`);
          }
          if (response.data.pattern) {
            console.log(`🔍 Pattern used: ${response.data.pattern}`);
          }
        }
      } else {
        console.log('⚠️  No cache flush endpoint found at standard locations');
        console.log('\n💡 Manual flush options:');
        console.log('   1. Add cache flush endpoint to your application:');
        console.log('      DELETE /api/cache/flush');
        console.log('   2. Or restart your application to clear memory cache');
        console.log('   3. For Redis cache, use: redis-cli FLUSHALL');
      }
      
    } catch (error) {
      console.error('❌ Cache flush failed:', axios.isAxiosError(error) ? error.message : error);
      process.exit(1);
    }
  }
};
