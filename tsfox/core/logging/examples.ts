/**
 * @fileoverview Example usage of Fox Framework Logging System
 * @version 1.0.0
 * @since 2025-01-11
 */

import express from 'express';
import { 
  LoggerFactory, 
  LogLevel, 
  RequestLoggingMiddleware,
  HttpTransport,
  StreamTransport,
  DefaultFormatter,
  JsonFormatter,
  ConsoleTransport,
  FileTransport
} from './index';

// Example 1: Basic Logger Setup
export function basicLoggerExample() {
  // Create a basic logger with console output
  const logger = LoggerFactory.create({
    level: LogLevel.DEBUG,
    console: {
      enabled: true,
      format: 'default'
    }
  });

  logger.info('Application starting', { version: '1.0.0' });
  logger.debug('Debug information', { config: { port: 3000 } });
  logger.warn('This is a warning', { threshold: 80, current: 85 });
  logger.error('An error occurred', { code: 'ERR_001' }, new Error('Something went wrong'));
}

// Example 2: Production Logger Setup
export function productionLoggerExample() {
  const logger = LoggerFactory.create({
    level: LogLevel.INFO,
    console: {
      enabled: true,
      format: 'json' // Structured logs for production
    },
    file: {
      enabled: true,
      filename: 'logs/app.log',
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      rotateDaily: true
    },
    http: {
      enabled: true,
      url: 'https://logs.example.com/api/logs',
      headers: {
        'Authorization': 'Bearer your-token-here',
        'X-App-Name': 'fox-framework-app'
      },
      batchSize: 50,
      batchTimeout: 30000 // 30 seconds
    }
  });

  return logger;
}

// Example 3: Express.js Integration
export function expressIntegrationExample() {
  const app = express();
  
  // Create application logger
  const logger = LoggerFactory.createFromEnv();
  
  // Add request logging middleware
  const requestLogging = new RequestLoggingMiddleware(logger, {
    includeBody: true,
    includeHeaders: true,
    skipSuccessful: false,
    maxBodySize: 1000,
    sensitiveHeaders: ['authorization', 'cookie']
  });
  
  app.use(requestLogging.middleware());
  
  // Example route with contextual logging
  app.get('/api/users/:id', async (req, res) => {
    const routeLogger = logger.child({
      component: 'user-service',
      operation: 'get-user',
      userId: req.params.id
    });
    
    try {
      routeLogger.info('Fetching user', { userId: req.params.id });
      
      // Simulate database operation
      const user = await getUserFromDatabase(req.params.id);
      
      if (!user) {
        routeLogger.warn('User not found', { userId: req.params.id });
        return res.status(404).json({ error: 'User not found' });
      }
      
      routeLogger.info('User retrieved successfully', { 
        userId: req.params.id,
        userEmail: user.email 
      });
      
      res.json(user);
    } catch (error) {
      routeLogger.error('Failed to fetch user', { 
        userId: req.params.id,
        error: error.message 
      }, error);
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return app;
}

// Example 4: Child Loggers for Different Components
export function componentLoggingExample() {
  const rootLogger = LoggerFactory.create({
    level: LogLevel.DEBUG,
    console: { enabled: true, format: 'default' }
  });

  // Database component logger
  const dbLogger = rootLogger.child({ component: 'database' });
  dbLogger.info('Connecting to database', { host: 'localhost', port: 5432 });
  dbLogger.debug('Connection pool initialized', { maxConnections: 10 });

  // Authentication component logger
  const authLogger = rootLogger.child({ component: 'auth' });
  authLogger.info('User authentication attempt', { email: 'user@example.com' });
  authLogger.warn('Invalid login attempt', { email: 'hacker@example.com', attempts: 3 });

  // Cache component logger
  const cacheLogger = rootLogger.child({ component: 'cache' });
  cacheLogger.debug('Cache hit', { key: 'user:123', ttl: 300 });
  cacheLogger.info('Cache miss, fetching from database', { key: 'user:456' });
}

// Example 5: Error Handling and Recovery
export function errorHandlingExample() {
  const logger = LoggerFactory.create({
    level: LogLevel.ERROR,
    console: { enabled: true },
    file: { enabled: true, filename: 'logs/errors.log' }
  });

  // Simulate different types of errors
  try {
    throw new TypeError('Invalid argument type');
  } catch (error) {
    logger.error('Type error occurred', {
      function: 'processUserData',
      arguments: ['invalid', 'arguments'],
      expected: 'object'
    }, error);
  }

  try {
    throw new ReferenceError('Variable not defined');
  } catch (error) {
    logger.fatal('Critical error - application cannot continue', {
      component: 'core',
      operation: 'initialization'
    }, error);
  }
}

// Example 6: Performance Monitoring
export function performanceMonitoringExample() {
  const logger = LoggerFactory.create({
    level: LogLevel.INFO,
    console: { enabled: true, format: 'json' }
  });

  async function monitoredOperation(operationName: string, operation: () => Promise<any>) {
    const operationLogger = logger.child({
      component: 'performance',
      operation: operationName
    });

    const startTime = Date.now();
    operationLogger.info('Operation started', { timestamp: startTime });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      operationLogger.info('Operation completed successfully', {
        duration: `${duration}ms`,
        status: 'success'
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      operationLogger.error('Operation failed', {
        duration: `${duration}ms`,
        status: 'error'
      }, error);

      throw error;
    }
  }

  // Usage
  return monitoredOperation('database-query', async () => {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: 'result' };
  });
}

// Example 7: Custom Transport
export function customTransportExample() {
  const logger = LoggerFactory.create({
    level: LogLevel.INFO,
    console: { enabled: false }
  });

  // Add custom stream transport (e.g., to send to external service)
  const { Writable } = require('stream');
  const customStream = new Writable({
    write(chunk, encoding, callback) {
      // Custom logic - could send to external service, database, etc.
      console.log('CUSTOM TRANSPORT:', chunk.toString().trim());
      callback();
    }
  });

  logger.addTransport(new StreamTransport(LogLevel.INFO, customStream));
  
  logger.info('This will go through the custom transport');
  logger.error('Error through custom transport', {}, new Error('Test error'));
}

// Mock function for example
async function getUserFromDatabase(id: string): Promise<any> {
  // Simulate database lookup
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (id === '404') {
    return null;
  }
  
  return {
    id,
    email: `user${id}@example.com`,
    name: `User ${id}`
  };
}

// Environment Variables Setup Guide
export const ENV_SETUP_GUIDE = `
# Environment Variables for Logging Configuration

# General
LOG_LEVEL=INFO              # FATAL, ERROR, WARN, INFO, DEBUG, TRACE
LOG_FORMAT=json             # default, json

# Console Transport
LOG_CONSOLE=true            # true, false

# File Transport
LOG_FILE=true               # true, false
LOG_FILE_PATH=logs/app.log  # Path to log file
LOG_FILE_MAX_SIZE=10485760  # 10MB in bytes
LOG_FILE_MAX_FILES=5        # Number of rotated files to keep
LOG_FILE_ROTATE_DAILY=true  # true, false

# HTTP Transport
LOG_HTTP=true                           # true, false
LOG_HTTP_URL=https://logs.example.com   # Endpoint URL
LOG_HTTP_METHOD=POST                    # POST, PUT
LOG_HTTP_BATCH_SIZE=50                  # Number of logs per batch
LOG_HTTP_BATCH_TIMEOUT=30000            # Timeout in milliseconds
`;

export {
  LoggerFactory,
  LogLevel,
  RequestLoggingMiddleware
};
