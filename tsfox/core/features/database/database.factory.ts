/**
 * @fileoverview Database factory - Main entry point for database abstraction
 * @module tsfox/core/features/database
 */

import {
  DatabaseInterface,
  DatabaseConfig,
  ModelInterface,
  QueryBuilderInterface,
  TransactionInterface,
  QueryResult,
  DatabaseInfo,
  DatabaseProvider,
  DatabaseStatus,
  ProviderInterface
} from './interfaces';
import { QueryBuilderFactory } from './core/query.builder';
import { ConnectionManager, DatabaseConnection } from './core/connection.manager';

/**
 * Main database implementation
 */
export class FoxDatabase implements DatabaseInterface {
  private connectionManager: ConnectionManager;
  private provider: ProviderInterface | null = null;
  private isConnected: boolean = false;
  private queryCount: number = 0;

  constructor(private config: DatabaseConfig) {
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      this.provider = await this.createProvider();
      await this.provider.connect(this.config);
      this.isConnected = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to database: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.disconnect();
      }
      await this.connectionManager.closeAll();
      this.isConnected = false;
      this.provider = null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to disconnect from database: ${errorMessage}`);
    }
  }

  /**
   * Execute a query and return results
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    this.checkConnection();
    this.queryCount++;
    
    try {
      return await this.provider!.query<T>(sql, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Query execution failed: ${errorMessage}`);
    }
  }

  /**
   * Execute a command and return result info
   */
  async execute(sql: string, params?: any[]): Promise<QueryResult> {
    this.checkConnection();
    this.queryCount++;
    
    try {
      return await this.provider!.execute(sql, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Command execution failed: ${errorMessage}`);
    }
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(callback: (tx: TransactionInterface) => Promise<T>): Promise<T> {
    this.checkConnection();
    
    const transaction = await this.provider!.beginTransaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get query builder instance
   */
  getBuilder(): QueryBuilderInterface {
    this.checkConnection();
    
    const builderType = this.isNoSqlProvider() ? 'nosql' : 'sql';
    return QueryBuilderFactory.create(this, builderType);
  }

  /**
   * Get model instance
   */
  getModel<T>(name: string): ModelInterface<T> {
    this.checkConnection();
    
    // TODO: Implement model factory
    throw new Error('Model factory not implemented yet');
  }

  /**
   * Check connection health
   */
  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.provider) {
      return false;
    }
    
    try {
      return await this.provider.ping();
    } catch {
      return false;
    }
  }

  /**
   * Get database info
   */
  getInfo(): DatabaseInfo {
    this.checkConnection();
    
    const providerInfo = this.provider!.getInfo();
    
    return {
      provider: this.config.provider,
      version: providerInfo.version,
      connectionCount: this.queryCount,
      status: this.isConnected ? 'connected' : 'disconnected',
      metadata: {
        queryCount: this.queryCount,
        uptime: Date.now(),
        config: this.config
      }
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Check if connected and throw error if not
   */
  private checkConnection(): void {
    if (!this.isConnected || !this.provider) {
      throw new Error('Database not connected');
    }
  }

  /**
   * Create provider based on configuration
   */
  private async createProvider(): Promise<ProviderInterface> {
    switch (this.config.provider) {
      case 'postgresql':
        return new PostgreSQLProvider();
      case 'mysql':
        return new MySQLProvider();
      case 'sqlite':
        return new SQLiteProvider();
      case 'mongodb':
        return new MongoDBProvider();
      case 'redis':
        return new RedisProvider();
      case 'memory':
        return new MemoryProvider();
      default:
        throw new Error(`Unsupported database provider: ${this.config.provider}`);
    }
  }

  /**
   * Check if provider is NoSQL
   */
  private isNoSqlProvider(): boolean {
    return ['mongodb', 'redis'].includes(this.config.provider);
  }

  /**
   * Get connection manager
   */
  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  /**
   * Get provider
   */
  getProvider(): ProviderInterface | null {
    return this.provider;
  }

  /**
   * Get configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

/**
 * Memory provider (for testing)
 */
class MemoryProvider implements ProviderInterface {
  name = 'memory';
  readonly version = '1.0.0';
  private data: Map<string, any[]> = new Map();
  private isConnectedFlag = false;

  async connect(config: DatabaseConfig): Promise<any> {
    this.isConnectedFlag = true;
    return Promise.resolve(null);
  }

  async disconnect(): Promise<void> {
    this.isConnectedFlag = false;
    this.data.clear();
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    // Simple memory implementation for testing
    console.log(`Memory query: ${sql}`, params);
    return [];
  }

  async execute(sql: string, params?: any[]): Promise<QueryResult> {
    console.log(`Memory execute: ${sql}`, params);
    return {
      rows: [],
      rowCount: 0,
      executionTime: 0
    };
  }

  async beginTransaction(): Promise<TransactionInterface> {
    // TODO: Implement memory transaction
    throw new Error('Memory transactions not implemented');
  }

  async ping(): Promise<boolean> {
    return this.isConnectedFlag;
  }

  getInfo(): any {
    return {
      name: this.name,
      version: this.version,
      description: 'In-memory database provider for testing'
    };
  }

  getCapabilities(): any {
    return {
      transactions: false,
      preparedStatements: false,
      connectionPooling: false,
      streaming: false,
      ssl: false,
      migrations: false,
      schemas: false,
      foreignKeys: false,
      indexes: false,
      views: false,
      storedProcedures: false,
      triggers: false,
      dataTypes: ['string', 'number', 'boolean', 'date', 'json']
    };
  }

  getMetadata(): any {
    return {
      installedAt: new Date(),
      updatedAt: new Date(),
      configHash: 'memory',
      runtime: {
        platform: process.platform,
        version: process.version,
        memory: process.memoryUsage().heapUsed,
        uptime: process.uptime()
      },
      metrics: {
        queriesExecuted: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0
      },
      features: {}
    };
  }

  async createPool(): Promise<any> {
    throw new Error('Memory provider does not support connection pooling');
  }

  async validateConfig(): Promise<boolean> {
    return true;
  }

  getDefaultConfig(): Partial<DatabaseConfig> {
    return {
      provider: 'memory',
      database: 'memory'
    };
  }

  async close(): Promise<void> {
    await this.disconnect();
  }
}

/**
 * Placeholder providers (to be implemented)
 */
class PostgreSQLProvider extends MemoryProvider {
  readonly name = 'postgresql';
  
  getInfo(): any {
    return {
      ...super.getInfo(),
      name: this.name,
      description: 'PostgreSQL database provider'
    };
  }
}

class MySQLProvider extends MemoryProvider {
  readonly name = 'mysql';
  
  getInfo(): any {
    return {
      ...super.getInfo(),
      name: this.name,
      description: 'MySQL database provider'
    };
  }
}

class SQLiteProvider extends MemoryProvider {
  readonly name = 'sqlite';
  
  getInfo(): any {
    return {
      ...super.getInfo(),
      name: this.name,
      description: 'SQLite database provider'
    };
  }
}

class MongoDBProvider extends MemoryProvider {
  readonly name = 'mongodb';
  
  getInfo(): any {
    return {
      ...super.getInfo(),
      name: this.name,
      description: 'MongoDB database provider'
    };
  }
}

class RedisProvider extends MemoryProvider {
  readonly name = 'redis';
  
  getInfo(): any {
    return {
      ...super.getInfo(),
      name: this.name,
      description: 'Redis database provider'
    };
  }
}

/**
 * Database factory
 */
export class DatabaseFactory {
  private static instances = new Map<string, FoxDatabase>();

  /**
   * Create database instance
   */
  static create(config: DatabaseConfig, name?: string): FoxDatabase {
    const instanceName = name || `default_${config.provider}`;
    
    if (this.instances.has(instanceName)) {
      return this.instances.get(instanceName)!;
    }

    const database = new FoxDatabase(config);
    this.instances.set(instanceName, database);
    
    return database;
  }

  /**
   * Get existing database instance
   */
  static get(name: string): FoxDatabase {
    const instance = this.instances.get(name);
    if (!instance) {
      throw new Error(`Database instance '${name}' not found`);
    }
    return instance;
  }

  /**
   * Create database with default configuration
   */
  static createWithDefaults(provider: DatabaseProvider = 'memory'): FoxDatabase {
    const config: DatabaseConfig = {
      provider,
      database: `fox_${provider}`,
      host: 'localhost',
      port: this.getDefaultPort(provider),
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000
      },
      debug: false
    };

    return this.create(config);
  }

  /**
   * Create database from environment variables
   */
  static createFromEnv(): FoxDatabase {
    const config: DatabaseConfig = {
      provider: (process.env.DB_PROVIDER as DatabaseProvider) || 'memory',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '0') || undefined,
      database: process.env.DB_NAME || 'fox_framework',
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      debug: process.env.DB_DEBUG === 'true'
    };

    return this.create(config, 'env');
  }

  /**
   * Close all database instances
   */
  static async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.instances.values()).map(db => db.close())
    );
    this.instances.clear();
  }

  /**
   * Get all instance names
   */
  static getInstanceNames(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Remove instance
   */
  static async remove(name: string): Promise<void> {
    const instance = this.instances.get(name);
    if (instance) {
      await instance.close();
      this.instances.delete(name);
    }
  }

  /**
   * Get default port for provider
   */
  private static getDefaultPort(provider: DatabaseProvider): number | undefined {
    switch (provider) {
      case 'postgresql':
        return 5432;
      case 'mysql':
        return 3306;
      case 'mongodb':
        return 27017;
      case 'redis':
        return 6379;
      case 'sqlite':
      case 'memory':
      default:
        return undefined;
    }
  }
}

/**
 * Database utility functions
 */
export class DatabaseUtils {
  /**
   * Test database connection
   */
  static async testConnection(config: DatabaseConfig): Promise<boolean> {
    const database = new FoxDatabase(config);
    
    try {
      await database.connect();
      const isHealthy = await database.ping();
      await database.disconnect();
      return isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * Get database size (if supported)
   */
  static async getDatabaseSize(database: DatabaseInterface): Promise<string | null> {
    try {
      const info = database.getInfo();
      return info.size || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate database configuration
   */
  static validateConfig(config: DatabaseConfig): string[] {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (!config.database) {
      errors.push('Database name is required');
    }

    if (config.pool) {
      if (config.pool.min < 0) {
        errors.push('Pool min connections must be >= 0');
      }
      
      if (config.pool.max <= config.pool.min) {
        errors.push('Pool max connections must be > min connections');
      }
    }

    return errors;
  }

  /**
   * Create test database configuration
   */
  static createTestConfig(provider: DatabaseProvider = 'memory'): DatabaseConfig {
    return {
      provider,
      database: `test_${Date.now()}`,
      host: 'localhost',
      pool: {
        min: 1,
        max: 3,
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 10000
      },
      debug: true
    };
  }
}
