/**
 * @fileoverview Configuration types and interfaces for database abstraction
 * @module tsfox/core/features/database/interfaces
 */

import { DatabaseProvider } from './database.interface';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /** Database provider type */
  provider: DatabaseProvider;
  
  /** Database host */
  host?: string;
  
  /** Database port */
  port?: number;
  
  /** Database name */
  database: string;
  
  /** Database username */
  username?: string;
  
  /** Database password */
  password?: string;
  
  /** SSL configuration */
  ssl?: boolean | SSLConfig;
  
  /** Connection pool configuration */
  pool?: PoolConfig;
  
  /** Connection timeout */
  connectionTimeoutMillis?: number;
  
  /** Query timeout */
  queryTimeoutMillis?: number;
  
  /** Provider-specific options */
  options?: Record<string, any>;
  
  /** Connection URL (alternative to individual params) */
  url?: string;
  
  /** Schema name */
  schema?: string;
  
  /** Charset */
  charset?: string;
  
  /** Timezone */
  timezone?: string;
  
  /** Debug mode */
  debug?: boolean;
  
  /** Logging configuration */
  logging?: LoggingConfig;
}

/**
 * SSL configuration interface
 */
export interface SSLConfig {
  /** Require SSL */
  require: boolean;
  
  /** Reject unauthorized certificates */
  rejectUnauthorized?: boolean;
  
  /** CA certificate */
  ca?: string | Buffer;
  
  /** Client certificate */
  cert?: string | Buffer;
  
  /** Client private key */
  key?: string | Buffer;
  
  /** SSL mode */
  mode?: SSLMode;
}

/**
 * Pool configuration interface
 */
export interface PoolConfig {
  /** Minimum connections */
  min: number;
  
  /** Maximum connections */
  max: number;
  
  /** Acquire timeout in milliseconds */
  acquireTimeoutMillis: number;
  
  /** Idle timeout in milliseconds */
  idleTimeoutMillis: number;
  
  /** Create timeout in milliseconds */
  createTimeoutMillis: number;
  
  /** Destroy timeout in milliseconds */
  destroyTimeoutMillis?: number;
  
  /** Create retry interval */
  createRetryIntervalMillis?: number;
  
  /** Validation query */
  validationQuery?: string;
  
  /** Test on borrow */
  testOnBorrow?: boolean;
  
  /** Test on return */
  testOnReturn?: boolean;
  
  /** Test while idle */
  testWhileIdle?: boolean;
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  /** Enable logging */
  enabled: boolean;
  
  /** Log level */
  level: LogLevel;
  
  /** Log queries */
  queries?: boolean;
  
  /** Log slow queries */
  slowQueries?: boolean;
  
  /** Slow query threshold */
  slowQueryThreshold?: number;
  
  /** Log errors */
  errors?: boolean;
  
  /** Logger function */
  logger?: (message: string, data?: any) => void;
}

/**
 * Migration configuration interface
 */
export interface MigrationConfig {
  /** Migrations directory */
  directory: string;
  
  /** Migration table name */
  tableName?: string;
  
  /** Migration extension */
  extension?: string;
  
  /** Migration template */
  template?: string;
  
  /** Auto run migrations */
  autoRun?: boolean;
  
  /** Transaction per migration */
  transactionPerMigration?: boolean;
}

/**
 * Schema configuration interface
 */
export interface SchemaConfig {
  /** Schema directory */
  directory: string;
  
  /** Auto sync schema */
  autoSync?: boolean;
  
  /** Drop existing schema */
  dropExisting?: boolean;
  
  /** Schema validation */
  validation?: boolean;
  
  /** Schema cache */
  cache?: boolean;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  
  /** Cache provider */
  provider: CacheProvider;
  
  /** Cache TTL */
  ttl?: number;
  
  /** Cache prefix */
  prefix?: string;
  
  /** Cache configuration */
  config?: Record<string, any>;
}

/**
 * Replication configuration interface
 */
export interface ReplicationConfig {
  /** Master configuration */
  master: DatabaseConfig;
  
  /** Slave configurations */
  slaves: DatabaseConfig[];
  
  /** Read/write splitting */
  splitting?: boolean;
  
  /** Load balancing strategy */
  loadBalancing?: LoadBalancingStrategy;
  
  /** Failover enabled */
  failover?: boolean;
  
  /** Health check interval */
  healthCheckInterval?: number;
}

/**
 * Sharding configuration interface
 */
export interface ShardingConfig {
  /** Shard configurations */
  shards: ShardConfig[];
  
  /** Sharding strategy */
  strategy: ShardingStrategy;
  
  /** Shard key */
  shardKey: string;
  
  /** Hash function */
  hashFunction?: HashFunction;
  
  /** Consistent hashing */
  consistentHashing?: boolean;
}

/**
 * Shard configuration interface
 */
export interface ShardConfig {
  /** Shard name */
  name: string;
  
  /** Shard database configuration */
  config: DatabaseConfig;
  
  /** Shard weight */
  weight?: number;
  
  /** Shard range */
  range?: ShardRange;
}

/**
 * Shard range interface
 */
export interface ShardRange {
  /** Start value */
  start: any;
  
  /** End value */
  end: any;
}

/**
 * Backup configuration interface
 */
export interface BackupConfig {
  /** Backup directory */
  directory: string;
  
  /** Backup schedule */
  schedule?: string;
  
  /** Backup retention */
  retention?: number;
  
  /** Backup compression */
  compression?: boolean;
  
  /** Backup encryption */
  encryption?: EncryptionConfig;
  
  /** Backup strategy */
  strategy?: BackupStrategy;
}

/**
 * Encryption configuration interface
 */
export interface EncryptionConfig {
  /** Encryption algorithm */
  algorithm: string;
  
  /** Encryption key */
  key: string;
  
  /** Initialization vector */
  iv?: string;
}

/**
 * Monitoring configuration interface
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;
  
  /** Metrics collection */
  metrics?: boolean;
  
  /** Health checks */
  healthChecks?: boolean;
  
  /** Performance tracking */
  performance?: boolean;
  
  /** Alerts configuration */
  alerts?: AlertsConfig;
}

/**
 * Alerts configuration interface
 */
export interface AlertsConfig {
  /** Enable alerts */
  enabled: boolean;
  
  /** Alert thresholds */
  thresholds: AlertThresholds;
  
  /** Alert channels */
  channels: AlertChannel[];
}

/**
 * Alert thresholds interface
 */
export interface AlertThresholds {
  /** Connection threshold */
  connections?: number;
  
  /** Query time threshold */
  queryTime?: number;
  
  /** Error rate threshold */
  errorRate?: number;
  
  /** Memory usage threshold */
  memoryUsage?: number;
}

/**
 * Alert channel interface
 */
export interface AlertChannel {
  /** Channel type */
  type: AlertChannelType;
  
  /** Channel configuration */
  config: Record<string, any>;
  
  /** Channel enabled */
  enabled?: boolean;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  /** Rule type */
  type: ValidationType;
  
  /** Rule value */
  value?: any;
  
  /** Rule message */
  message?: string;
  
  /** Custom validator */
  validator?: (value: any) => boolean | Promise<boolean>;
}

/**
 * SSL modes
 */
export type SSLMode = 
  | 'disable' 
  | 'allow' 
  | 'prefer' 
  | 'require' 
  | 'verify-ca' 
  | 'verify-full';

/**
 * Log levels
 */
export type LogLevel = 
  | 'debug' 
  | 'info' 
  | 'warn' 
  | 'error' 
  | 'fatal';

/**
 * Cache providers
 */
export type CacheProvider = 
  | 'memory' 
  | 'redis' 
  | 'memcached' 
  | 'file';

/**
 * Load balancing strategies
 */
export type LoadBalancingStrategy = 
  | 'round-robin' 
  | 'random' 
  | 'least-connections' 
  | 'weighted';

/**
 * Sharding strategies
 */
export type ShardingStrategy = 
  | 'hash' 
  | 'range' 
  | 'directory' 
  | 'consistent-hash';

/**
 * Hash functions
 */
export type HashFunction = 
  | 'crc32' 
  | 'md5' 
  | 'sha1' 
  | 'sha256' 
  | 'murmur3';

/**
 * Backup strategies
 */
export type BackupStrategy = 
  | 'full' 
  | 'incremental' 
  | 'differential' 
  | 'transaction-log';

/**
 * Alert channel types
 */
export type AlertChannelType = 
  | 'email' 
  | 'sms' 
  | 'slack' 
  | 'webhook' 
  | 'discord';

/**
 * Validation types
 */
export type ValidationType = 
  | 'required' 
  | 'min' 
  | 'max' 
  | 'length'
  | 'minLength'
  | 'maxLength'
  | 'pattern' 
  | 'email'
  | 'url'
  | 'enum' 
  | 'custom'
  | 'unique'
  | 'exists';

/**
 * Environment types
 */
export type Environment = 
  | 'development' 
  | 'test' 
  | 'staging' 
  | 'production';

/**
 * Database configuration factory
 */
export class DatabaseConfigFactory {
  /**
   * Create configuration for development
   */
  static createDevelopmentConfig(provider: DatabaseProvider): DatabaseConfig {
    return {
      provider,
      host: 'localhost',
      database: 'fox_dev',
      username: 'root',
      password: '',
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000
      },
      debug: true,
      logging: {
        enabled: true,
        level: 'debug',
        queries: true,
        slowQueries: true,
        slowQueryThreshold: 1000,
        errors: true
      }
    };
  }

  /**
   * Create configuration for testing
   */
  static createTestConfig(provider: DatabaseProvider): DatabaseConfig {
    return {
      provider,
      host: 'localhost',
      database: 'fox_test',
      username: 'root',
      password: '',
      pool: {
        min: 1,
        max: 5,
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 10000
      },
      debug: false,
      logging: {
        enabled: false,
        level: 'error'
      }
    };
  }

  /**
   * Create configuration for production
   */
  static createProductionConfig(provider: DatabaseProvider): DatabaseConfig {
    return {
      provider,
      pool: {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 60000
      },
      ssl: true,
      debug: false,
      logging: {
        enabled: true,
        level: 'warn',
        errors: true,
        slowQueries: true,
        slowQueryThreshold: 5000
      }
    };
  }

  /**
   * Create configuration from environment
   */
  static createFromEnvironment(env: Environment): DatabaseConfig {
    switch (env) {
      case 'development':
        return this.createDevelopmentConfig('sqlite');
      case 'test':
        return this.createTestConfig('sqlite');
      case 'staging':
      case 'production':
        return this.createProductionConfig('postgresql');
      default:
        throw new Error(`Unknown environment: ${env}`);
    }
  }

  /**
   * Validate configuration
   */
  static validate(config: DatabaseConfig): boolean {
    if (!config.provider) {
      throw new Error('Database provider is required');
    }

    if (!config.database) {
      throw new Error('Database name is required');
    }

    if (config.pool) {
      if (config.pool.min < 0) {
        throw new Error('Pool min connections must be >= 0');
      }
      
      if (config.pool.max <= config.pool.min) {
        throw new Error('Pool max connections must be > min connections');
      }
    }

    return true;
  }
}
