/**
 * @fileoverview Database abstraction layer - Main export
 * @module tsfox/core/features/database
 */

// Main exports
export { DatabaseFactory, FoxDatabase, DatabaseUtils } from './database.factory';

// Core components
export { QueryBuilderFactory, SqlQueryBuilder, NoSqlQueryBuilder } from './core/query.builder';
export { ConnectionManager, DatabaseConnection, DatabaseTransaction, ConnectionPool } from './core/connection.manager';

// All interfaces
export * from './interfaces';

// Import types for internal use
import { DatabaseConfig, DatabaseProvider, PoolConfig } from './interfaces';
import { DatabaseFactory, FoxDatabase } from './database.factory';

// Re-export key types for convenience
export type {
  DatabaseInterface,
  QueryBuilderInterface,
  ModelInterface,
  RepositoryInterface,
  ProviderInterface,
  DatabaseConfig,
  PoolConfig,
  DatabaseProvider,
  QueryResult,
  TransactionInterface,
  ConnectionInterface
} from './interfaces';

/**
 * Quick database creation helper
 */
export function createDatabase(config: DatabaseConfig): FoxDatabase {
  return DatabaseFactory.create(config);
}

/**
 * Quick database creation with memory provider for testing
 */
export function createTestDatabase(): FoxDatabase {
  return DatabaseFactory.createWithDefaults('memory');
}

/**
 * Quick database creation from environment
 */
export function createDatabaseFromEnv(): FoxDatabase {
  return DatabaseFactory.createFromEnv();
}

/**
 * Database configuration shortcuts
 */
export const DatabaseConfigs = {
  /**
   * PostgreSQL configuration
   */
  postgresql: (database: string, options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'postgresql',
    host: 'localhost',
    port: 5432,
    database,
    username: 'postgres',
    password: '',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 30000
    },
    ...options
  }),

  /**
   * MySQL configuration
   */
  mysql: (database: string, options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'mysql',
    host: 'localhost',
    port: 3306,
    database,
    username: 'root',
    password: '',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 30000
    },
    ...options
  }),

  /**
   * SQLite configuration
   */
  sqlite: (database: string, options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'sqlite',
    database,
    pool: {
      min: 1,
      max: 1,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 10000
    },
    ...options
  }),

  /**
   * MongoDB configuration
   */
  mongodb: (database: string, options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'mongodb',
    host: 'localhost',
    port: 27017,
    database,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 30000
    },
    ...options
  }),

  /**
   * Redis configuration
   */
  redis: (database: string, options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'redis',
    host: 'localhost',
    port: 6379,
    database,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 30000
    },
    ...options
  }),

  /**
   * Memory configuration (for testing)
   */
  memory: (database: string = 'memory', options?: Partial<DatabaseConfig>): DatabaseConfig => ({
    provider: 'memory',
    database,
    debug: true,
    ...options
  })
};

/**
 * Database builder for fluent configuration
 */
export class DatabaseBuilder {
  private config: Partial<DatabaseConfig> = {};

  /**
   * Set provider
   */
  provider(provider: DatabaseProvider): this {
    this.config.provider = provider;
    return this;
  }

  /**
   * Set host
   */
  host(host: string): this {
    this.config.host = host;
    return this;
  }

  /**
   * Set port
   */
  port(port: number): this {
    this.config.port = port;
    return this;
  }

  /**
   * Set database name
   */
  database(database: string): this {
    this.config.database = database;
    return this;
  }

  /**
   * Set credentials
   */
  credentials(username: string, password: string): this {
    this.config.username = username;
    this.config.password = password;
    return this;
  }

  /**
   * Enable SSL
   */
  ssl(enabled: boolean = true): this {
    this.config.ssl = enabled;
    return this;
  }

  /**
   * Set pool configuration
   */
  pool(poolConfig: PoolConfig): this {
    this.config.pool = poolConfig;
    return this;
  }

  /**
   * Enable debug mode
   */
  debug(enabled: boolean = true): this {
    this.config.debug = enabled;
    return this;
  }

  /**
   * Set connection URL
   */
  url(url: string): this {
    this.config.url = url;
    return this;
  }

  /**
   * Build and create database
   */
  build(): FoxDatabase {
    if (!this.config.provider) {
      throw new Error('Provider is required');
    }
    
    if (!this.config.database) {
      throw new Error('Database name is required');
    }

    return DatabaseFactory.create(this.config as DatabaseConfig);
  }

  /**
   * Build configuration only
   */
  buildConfig(): DatabaseConfig {
    if (!this.config.provider) {
      throw new Error('Provider is required');
    }
    
    if (!this.config.database) {
      throw new Error('Database name is required');
    }

    return this.config as DatabaseConfig;
  }
}

/**
 * Create database builder
 */
export function database(): DatabaseBuilder {
  return new DatabaseBuilder();
}

/**
 * Database migration utilities
 */
export const MigrationUtils = {
  /**
   * Generate migration timestamp
   */
  generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  },

  /**
   * Generate migration filename
   */
  generateFilename(name: string): string {
    const timestamp = this.generateTimestamp();
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${timestamp}_${safeName}.ts`;
  }
};

/**
 * Database seeding utilities
 */
export const SeedUtils = {
  /**
   * Generate random ID
   */
  generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate random string
   */
  generateString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate random number
   */
  generateNumber(min: number = 0, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random date
   */
  generateDate(start?: Date, end?: Date): Date {
    const startTime = start?.getTime() || new Date('2020-01-01').getTime();
    const endTime = end?.getTime() || new Date().getTime();
    return new Date(startTime + Math.random() * (endTime - startTime));
  }
};
