// tsfox/cli/commands/health/status.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../interfaces/cli.interface';
import fs from 'fs';
import path from 'path';

export const HealthStatusCommand: CommandInterface = {
  name: 'status',
  description: 'Show current health configuration status',
  arguments: [],
  options: [
    {
      name: 'config',
      alias: 'c',
      description: 'Show health configuration details',
      type: 'boolean',
      default: false
    },
    {
      name: 'examples',
      alias: 'e',
      description: 'Show generated examples',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🏥 Fox Framework Health System Status');
    console.log('═'.repeat(50));
    
    try {
      const projectRoot = context.projectRoot;
      const configPath = path.join(projectRoot, 'config', 'health.config.ts');
      const examplePath = path.join(projectRoot, 'examples', 'health-setup.ts');
      
      // Check configuration file
      const configExists = fs.existsSync(configPath);
      console.log(`📁 Configuration: ${configExists ? '✅ Found' : '❌ Not found'}`);
      if (configExists) {
        console.log(`   📍 Location: ${configPath}`);
        const stats = fs.statSync(configPath);
        console.log(`   📅 Modified: ${stats.mtime.toLocaleString()}`);
        console.log(`   📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
      }
      
      // Check example file
      const exampleExists = fs.existsSync(examplePath);
      console.log(`📄 Setup Example: ${exampleExists ? '✅ Found' : '❌ Not found'}`);
      if (exampleExists) {
        console.log(`   📍 Location: ${examplePath}`);
      }
      
      // Show configuration details if requested
      if (options.config && configExists) {
        console.log('\n🔧 Configuration Details:');
        console.log('─'.repeat(30));
        try {
          const configContent = fs.readFileSync(configPath, 'utf8');
          
          // Parse basic configuration info (simple regex parsing)
          const portMatch = configContent.match(/port:\s*(\d+)/);
          const pathMatch = configContent.match(/path:\s*['"]([^'"]+)['"]/);
          const checksMatch = configContent.match(/checks:\s*{([^}]+)}/);
          
          if (portMatch) {
            console.log(`🔌 Port: ${portMatch[1]}`);
          }
          if (pathMatch) {
            console.log(`🛣️  Path: ${pathMatch[1]}`);
          }
          if (checksMatch) {
            const checks = checksMatch[1]
              .split(',')
              .map((check: string) => check.trim().split(':')[0].trim())
              .filter((check: string) => check.length > 0);
            console.log(`🔍 Enabled Checks: ${checks.join(', ')}`);
          }
        } catch (error) {
          console.log('   ⚠️  Could not parse configuration details');
        }
      }
      
      // Show examples if requested
      if (options.examples && exampleExists) {
        console.log('\n📖 Example Usage:');
        console.log('─'.repeat(30));
        console.log('1. Import health setup in your server:');
        console.log('   import "./examples/health-setup";');
        console.log('');
        console.log('2. Or integrate manually:');
        console.log('   const { healthChecker } = require("./examples/health-setup");');
        console.log('');
        console.log('3. Test health endpoints:');
        console.log('   curl http://localhost:3000/health');
        console.log('   curl http://localhost:3000/health/ready');
        console.log('   curl http://localhost:3000/health/live');
      }
      
      // Show available commands
      console.log('\n🛠️  Available Commands:');
      console.log('─'.repeat(30));
      console.log('tsfox health init     - Initialize health configuration');
      console.log('tsfox health check    - Run health checks on running app');
      console.log('tsfox health status   - Show this status (current command)');
      
      // Show next steps
      console.log('\n📋 Next Steps:');
      console.log('─'.repeat(30));
      if (!configExists) {
        console.log('1. Run "tsfox health init" to set up health checks');
        console.log('2. Customize the generated configuration');
        console.log('3. Integrate health setup into your server');
      } else {
        console.log('1. Start your Fox Framework server');
        console.log('2. Run "tsfox health check" to test health endpoints');
        console.log('3. Monitor health status in production');
      }
      
      console.log('\n🦊 Fox Framework Health System Ready!');
      
    } catch (error) {
      console.error('❌ Error checking health status:', error);
      process.exit(1);
    }
  }
};
