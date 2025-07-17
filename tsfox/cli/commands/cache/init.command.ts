// tsfox/cli/commands/cache/init.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import fs from 'fs';
import path from 'path';

export const CacheInitCommand: CommandInterface = {
  name: 'init',
  description: 'Initialize cache system configuration',
  arguments: [],
  options: [
    {
      name: 'provider',
      alias: 'p',
      description: 'Cache provider (memory|redis|file)',
      type: 'string',
      default: 'memory',
      choices: ['memory', 'redis', 'file']
    },
    {
      name: 'ttl',
      alias: 't',
      description: 'Default TTL in seconds',
      type: 'number',
      default: 300
    },
    {
      name: 'max-size',
      alias: 's',
      description: 'Maximum cache size (for memory provider)',
      type: 'number',
      default: 100
    },
    {
      name: 'redis-url',
      description: 'Redis connection URL (for redis provider)',
      type: 'string',
      default: 'redis://localhost:6379'
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.ttl && options.ttl <= 0) {
      return {
        valid: false,
        message: 'TTL must be greater than 0'
      };
    }
    if (options['max-size'] && options['max-size'] <= 0) {
      return {
        valid: false,
        message: 'Max size must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🗄️  Initializing Fox Framework Cache System...');
    
    try {
      const projectRoot = context.projectRoot;
      const configDir = path.join(projectRoot, 'config');
      const cacheConfigPath = path.join(configDir, 'cache.config.ts');
      
      // Create config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`📁 Created config directory: ${configDir}`);
      }
      
      const provider = options.provider || 'memory';
      const ttl = options.ttl || 300;
      const maxSize = options['max-size'] || 100;
      const redisUrl = options['redis-url'] || 'redis://localhost:6379';
      
      // Generate cache configuration based on provider
      let providerConfig = '';
      
      switch (provider) {
        case 'memory':
          providerConfig = `  memory: {
    maxSize: ${maxSize},        // Maximum number of cached items
    defaultTTL: ${ttl},         // Default TTL in seconds
    checkExpiration: 60         // Check for expired items every 60 seconds
  }`;
          break;
          
        case 'redis':
          providerConfig = `  redis: {
    url: '${redisUrl}',
    defaultTTL: ${ttl},         // Default TTL in seconds
    keyPrefix: 'fox:',          // Prefix for all cache keys
    retryAttempts: 3,
    retryDelay: 1000
  }`;
          break;
          
        case 'file':
          providerConfig = `  file: {
    directory: './cache',        // Cache directory
    defaultTTL: ${ttl},         // Default TTL in seconds
    maxFiles: ${maxSize * 10},   // Maximum number of cache files
    cleanupInterval: 300        // Cleanup interval in seconds
  }`;
          break;
      }
      
      const cacheConfig = `// Cache Configuration - Fox Framework
import { CacheConfig } from '@foxframework/core';

export const cacheConfig: CacheConfig = {
  provider: '${provider}' as const,
  
  // Provider-specific configuration
${providerConfig},
  
  // Global cache settings
  global: {
    defaultTTL: ${ttl},         // Default TTL for all cache operations
    enableMetrics: true,        // Enable cache performance metrics
    enableDebug: process.env.NODE_ENV === 'development'
  },
  
  // Cache middleware settings
  middleware: {
    responseCache: {
      enabled: true,
      ttl: ${ttl},
      varyHeaders: ['Accept-Encoding', 'Authorization'],
      skipOnError: true
    },
    apiCache: {
      enabled: true,
      ttl: ${Math.floor(ttl / 2)},  // Shorter TTL for API responses
      excludePaths: ['/auth', '/admin'],
      includeHeaders: ['Cache-Control', 'ETag']
    }
  }
};

export default cacheConfig;
`;

      // Write cache configuration
      fs.writeFileSync(cacheConfigPath, cacheConfig);
      console.log(`✅ Cache configuration created: ${cacheConfigPath}`);
      
      // Generate example cache setup
      const exampleDir = path.join(projectRoot, 'examples');
      if (!fs.existsSync(exampleDir)) {
        fs.mkdirSync(exampleDir, { recursive: true });
      }
      
      const cacheExamplePath = path.join(exampleDir, 'cache-setup.ts');
      const cacheExample = `// Cache Setup Example - Fox Framework
import { FoxFactory } from '@foxframework/core';
import { CacheFactory, responseCache, apiCache } from '@foxframework/core/cache';
import { cacheConfig } from '../config/cache.config';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Initialize cache instance
const cache = CacheFactory.create(cacheConfig);

// Cache middleware for general responses
app.use(responseCache({
  ttl: cacheConfig.middleware.responseCache.ttl,
  varyHeaders: cacheConfig.middleware.responseCache.varyHeaders
}));

// API-specific cache middleware
app.use('/api', apiCache({
  ttl: cacheConfig.middleware.apiCache.ttl,
  excludePaths: cacheConfig.middleware.apiCache.excludePaths
}));

// Example routes with manual caching
app.get('/api/users', async (req, res) => {
  const cacheKey = 'users:list';
  
  // Try to get from cache first
  let users = await cache.get(cacheKey);
  
  if (!users) {
    // Simulate database fetch
    users = { data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] };
    
    // Store in cache
    await cache.set(cacheKey, users, ${ttl});
    console.log('✅ Users fetched from database and cached');
  } else {
    console.log('✅ Users served from cache');
  }
  
  res.json(users);
});

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  const metrics = cache.getMetrics();
  res.json({
    provider: '${provider}',
    metrics: metrics,
    timestamp: new Date().toISOString()
  });
});

// Cache management endpoints
app.delete('/api/cache/flush', async (req, res) => {
  await cache.clear();
  res.json({ message: 'Cache flushed successfully' });
});

app.delete('/api/cache/key/:key', async (req, res) => {
  const { key } = req.params;
  await cache.delete(key);
  res.json({ message: \`Cache key '\${key}' deleted\` });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🦊 Fox Framework server with ${provider} cache running on port \${PORT}\`);
  console.log(\`🗄️  Cache provider: ${provider}\`);
  console.log(\`⏱️  Default TTL: ${ttl}s\`);
  console.log(\`📊 Cache stats: http://localhost:\${PORT}/api/cache/stats\`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🗄️  Closing cache connections...');
  if (cache.disconnect) {
    await cache.disconnect();
  }
  process.exit(0);
});

export { app, cache };
`;

      fs.writeFileSync(cacheExamplePath, cacheExample);
      console.log(`✅ Cache setup example created: ${cacheExamplePath}`);
      
      // Create cache directory for file provider
      if (provider === 'file') {
        const cacheDir = path.join(projectRoot, 'cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          console.log(`📁 Created cache directory: ${cacheDir}`);
        }
        
        // Create .gitignore for cache directory
        const gitignorePath = path.join(cacheDir, '.gitignore');
        fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
      }
      
      console.log('\n📋 Next steps:');
      console.log('   1. Review the generated cache configuration');
      console.log(`   2. ${provider === 'redis' ? 'Ensure Redis server is running' : 'Customize cache settings as needed'}`);
      console.log('   3. Integrate cache setup into your server');
      console.log('   4. Test cache with: tsfox cache stats');
      console.log('\n🦊 Cache system ready!');
      
    } catch (error) {
      console.error('❌ Error initializing cache:', error);
      process.exit(1);
    }
  }
};
