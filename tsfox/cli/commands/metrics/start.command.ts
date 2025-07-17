// tsfox/cli/commands/metrics/start.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import fs from 'fs';
import path from 'path';

export const MetricsStartCommand: CommandInterface = {
  name: 'start',
  description: 'Initialize metrics collection system',
  arguments: [],
  options: [
    {
      name: 'port',
      alias: 'p',
      description: 'Metrics endpoint port',
      type: 'number',
      default: 3000
    },
    {
      name: 'path',
      description: 'Metrics endpoint path',
      type: 'string',
      default: '/metrics'
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Metrics format (prometheus|json)',
      type: 'string',
      default: 'prometheus',
      choices: ['prometheus', 'json']
    },
    {
      name: 'interval',
      alias: 'i',
      description: 'Collection interval in seconds',
      type: 'number',
      default: 10
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.interval && options.interval <= 0) {
      return {
        valid: false,
        message: 'Collection interval must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('📊 Initializing Fox Framework Metrics System...');
    
    try {
      const projectRoot = context.projectRoot;
      const configDir = path.join(projectRoot, 'config');
      const metricsConfigPath = path.join(configDir, 'metrics.config.ts');
      
      // Create config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`📁 Created config directory: ${configDir}`);
      }
      
      // Generate metrics configuration
      const metricsConfig = `// Metrics Configuration - Fox Framework
import { MetricsConfig } from '@foxframework/core';

export const metricsConfig: MetricsConfig = {
  endpoint: {
    port: ${options.port || 3000},
    path: '${options.path || '/metrics'}',
    format: '${options.format || 'prometheus'}'
  },
  collection: {
    interval: ${options.interval || 10}000, // milliseconds
    enabled: {
      system: true,      // CPU, memory, etc.
      http: true,        // Request/response metrics
      custom: true       // Application-specific metrics
    }
  },
  prometheus: {
    prefix: 'fox_',
    labels: {
      app: 'fox_app',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  },
  retention: {
    maxDataPoints: 1000,
    maxAge: 3600000 // 1 hour in milliseconds
  }
};

export default metricsConfig;
`;

      // Write metrics configuration
      fs.writeFileSync(metricsConfigPath, metricsConfig);
      console.log(`✅ Metrics configuration created: ${metricsConfigPath}`);
      
      // Generate example metrics setup
      const exampleDir = path.join(projectRoot, 'examples');
      if (!fs.existsSync(exampleDir)) {
        fs.mkdirSync(exampleDir, { recursive: true });
      }
      
      const metricsExamplePath = path.join(exampleDir, 'metrics-setup.ts');
      const metricsExample = `// Metrics Setup Example - Fox Framework
import { FoxFactory } from '@foxframework/core';
import { MetricsCollector, performanceMiddleware } from '@foxframework/core/performance';
import { metricsConfig } from '../config/metrics.config';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Initialize metrics collector
const metricsCollector = new MetricsCollector({
  interval: metricsConfig.collection.interval,
  maxDataPoints: metricsConfig.retention.maxDataPoints
});

// Add performance middleware for automatic HTTP metrics
app.use(performanceMiddleware({
  trackRequests: true,
  trackResponseTime: true,
  trackMemory: true,
  excludePaths: ['${options.path || '/metrics'}']
}));

// Metrics endpoint
app.get('${options.path || '/metrics'}', async (req, res) => {
  try {
    const format = req.query.format || '${options.format || 'prometheus'}';
    
    if (format === 'prometheus') {
      const metrics = metricsCollector.getPrometheusFormat();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } else if (format === 'json') {
      const metrics = metricsCollector.getMetrics();
      res.json({
        timestamp: new Date().toISOString(),
        metrics: metrics,
        config: {
          interval: metricsConfig.collection.interval,
          format: format
        }
      });
    } else {
      res.status(400).json({ error: 'Unsupported format. Use prometheus or json.' });
    }
  } catch (error) {
    console.error('Error retrieving metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Example custom metrics
app.get('/api/users', (req, res) => {
  // Record custom metric
  metricsCollector.recordMetric('api_users_requests_total', 1, 'counter', {
    method: 'GET',
    endpoint: '/api/users'
  });
  
  res.json({ users: [] });
});

// Start metrics collection
metricsCollector.start();

// Start server
const PORT = process.env.PORT || ${options.port || 3000};
app.listen(PORT, () => {
  console.log(\`🦊 Fox Framework server with metrics running on port \${PORT}\`);
  console.log(\`📊 Metrics endpoint: http://localhost:\${PORT}${options.path || '/metrics'}\`);
  console.log(\`📈 Collection interval: \${metricsConfig.collection.interval / 1000}s\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📊 Stopping metrics collection...');
  metricsCollector.stop();
  process.exit(0);
});

export { app, metricsCollector };
`;

      fs.writeFileSync(metricsExamplePath, metricsExample);
      console.log(`✅ Metrics setup example created: ${metricsExamplePath}`);
      
      console.log('\n📋 Next steps:');
      console.log('   1. Review the generated metrics configuration');
      console.log('   2. Customize collection settings as needed');
      console.log('   3. Integrate metrics setup into your server');
      console.log(`   4. Test metrics endpoint: curl http://localhost:${options.port || 3000}${options.path || '/metrics'}`);
      console.log('\n🦊 Metrics system ready!');
      
    } catch (error) {
      console.error('❌ Error initializing metrics:', error);
      process.exit(1);
    }
  }
};
