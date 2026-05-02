// tsfox/cli/commands/health/init.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import fs from 'fs';
import path from 'path';

export const HealthInitCommand: CommandInterface = {
  name: 'init',
  description: 'Initialize health check configuration',
  arguments: [],
  options: [
    {
      name: 'checks',
      alias: 'c',
      description: 'Health checks to enable (comma-separated)',
      type: 'string',
      default: 'memory,uptime,cpu'
    },
    {
      name: 'port',
      alias: 'p',
      description: 'Health check endpoint port',
      type: 'number',
      default: 3000
    },
    {
      name: 'path',
      description: 'Health check endpoint path',
      type: 'string',
      default: '/health'
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🏥 Initializing Fox Framework Health Check System...');
    
    try {
      const projectRoot = context.projectRoot;
      const configDir = path.join(projectRoot, 'config');
      const healthConfigPath = path.join(configDir, 'health.config.ts');
      
      // Create config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`📁 Created config directory: ${configDir}`);
      }
      
      // Parse health checks
      let checks: string[];
      if (Array.isArray(options.checks)) {
        checks = options.checks;
      } else if (typeof options.checks === 'string') {
        checks = options.checks.split(',').map((c: string) => c.trim());
      } else {
        checks = ['memory', 'uptime', 'cpu'];
      }
      
      // Generate health configuration
      const healthConfig = `// Health Check Configuration - Fox Framework
import { HealthCheckConfig } from '@foxframework/core';

export const healthConfig: HealthCheckConfig = {
  endpoint: {
    port: ${options.port || 3000},
    path: '${options.path || '/health'}',
    readyPath: '${options.path || '/health'}/ready',
    livePath: '${options.path || '/health'}/live'
  },
  checks: {
${checks.map((check: string) => `    ${check}: true`).join(',\n')}
  },
  thresholds: {
    memory: 0.9,        // 90% memory usage
    cpu: 0.8,           // 80% CPU usage
    responseTime: 5000  // 5 second timeout
  },
  timeout: 30000,       // 30 second health check timeout
  retries: 3
};

export default healthConfig;
`;

      // Write health configuration
      fs.writeFileSync(healthConfigPath, healthConfig);
      console.log(`✅ Health configuration created: ${healthConfigPath}`);
      
      // Generate example health setup in server
      const serverExamplePath = path.join(projectRoot, 'examples', 'health-setup.ts');
      const exampleDir = path.dirname(serverExamplePath);
      
      if (!fs.existsSync(exampleDir)) {
        fs.mkdirSync(exampleDir, { recursive: true });
      }
      
      const serverExample = `// Health Check Setup Example - Fox Framework
import { FoxFactory } from '@foxframework/core';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks } from '@foxframework/core/health';
import { healthConfig } from '../config/health.config';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Create health checker instance
const healthChecker = new HealthChecker();

// Add configured health checks
${checks.map((check: string) => {
  switch(check) {
    case 'memory':
      return `healthChecker.addCheck('memory', defaultHealthChecks.memory);`;
    case 'uptime':
      return `healthChecker.addCheck('uptime', defaultHealthChecks.uptime);`;
    case 'cpu':
      return `healthChecker.addCheck('cpu', defaultHealthChecks.cpu);`;
    case 'disk':
      return `healthChecker.addCheck('disk', defaultHealthChecks.disk);`;
    default:
      return `// Custom check for ${check} - implement as needed`;
  }
}).join('\n')}

// Create health middleware
const healthMiddleware = createHealthCheckMiddleware(healthChecker);

// Register health endpoints
app.get('${options.path || '/health'}', healthMiddleware.full);
app.get('${options.path || '/health'}/ready', healthMiddleware.ready);
app.get('${options.path || '/health'}/live', healthMiddleware.live);

// Start server
const PORT = process.env.PORT || ${options.port || 3000};
app.listen(PORT, () => {
  console.log(\`🦊 Fox Framework server with health checks running on port \${PORT}\`);
  console.log(\`🏥 Health endpoint: http://localhost:\${PORT}${options.path || '/health'}\`);
});

export { app, healthChecker };
`;

      fs.writeFileSync(serverExamplePath, serverExample);
      console.log(`✅ Health setup example created: ${serverExamplePath}`);
      
      console.log('\n📋 Next steps:');
      console.log('   1. Review the generated health configuration');
      console.log('   2. Customize health checks as needed');
      console.log('   3. Integrate health setup into your server');
      console.log(`   4. Test health endpoints: curl http://localhost:${options.port || 3000}${options.path || '/health'}`);
      console.log('\n🦊 Health check system ready!');
      
    } catch (error) {
      console.error('❌ Error initializing health checks:', error);
      process.exit(1);
    }
  }
};
