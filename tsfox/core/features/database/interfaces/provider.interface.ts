/**
 * @fileoverview Provider interfaces for database abstraction
 * @module tsfox/core/features/database/interfaces
 */

import { 
  DatabaseConfig, 
  ValidationRule as ConfigValidationRule
} from './config.interface';
import {
  ConnectionInterface, 
  QueryResult, 
  TransactionInterface,
  DatabaseProvider
} from './database.interface';

/**
 * Database provider interface
 */
export interface ProviderInterface {
  /** Provider name */
  readonly name: string;
  
  /** Provider version */
  readonly version: string;
  
  /** Connect to database */
  connect(config: DatabaseConfig): Promise<ConnectionInterface>;
  
  /** Disconnect from database */
  disconnect(): Promise<void>;
  
  /** Execute query */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /** Execute command */
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  
  /** Begin transaction */
  beginTransaction(): Promise<TransactionInterface>;
  
  /** Check connection health */
  ping(): Promise<boolean>;
  
  /** Get provider information */
  getInfo(): ProviderInfo;
  
  /** Get provider capabilities */
  getCapabilities(): ProviderCapabilities;
  
  /** Get provider metadata */
  getMetadata(): ProviderMetadata;
  
  /** Create connection pool */
  createPool(config: DatabaseConfig): Promise<ConnectionPoolInterface>;
  
  /** Validate configuration */
  validateConfig(config: DatabaseConfig): Promise<boolean>;
  
  /** Get default configuration */
  getDefaultConfig(): Partial<DatabaseConfig>;
  
  /** Close all connections */
  close(): Promise<void>;
}

/**
 * Connection pool interface
 */
export interface ConnectionPoolInterface {
  /** Get connection from pool */
  acquire(): Promise<ConnectionInterface>;
  
  /** Release connection back to pool */
  release(connection: ConnectionInterface): Promise<void>;
  
  /** Get pool statistics */
  getStats(): PoolStats;
  
  /** Close all connections in pool */
  close(): Promise<void>;
  
  /** Pool size */
  readonly size: number;
  
  /** Available connections */
  readonly available: number;
  
  /** Active connections */
  readonly active: number;
  
  /** Waiting requests */
  readonly waiting: number;
}

/**
 * Pool statistics interface
 */
export interface PoolStats {
  /** Total connections */
  total: number;
  
  /** Active connections */
  active: number;
  
  /** Idle connections */
  idle: number;
  
  /** Waiting requests */
  waiting: number;
  
  /** Created connections */
  created: number;
  
  /** Destroyed connections */
  destroyed: number;
  
  /** Failed connection attempts */
  failed: number;
  
  /** Pool uptime */
  uptime: number;
}

/**
 * Provider information interface
 */
export interface ProviderInfo {
  /** Provider name */
  name: string;
  
  /** Provider version */
  version: string;
  
  /** Supported database version */
  databaseVersion?: string;
  
  /** Provider description */
  description?: string;
  
  /** Provider author */
  author?: string;
  
  /** Provider license */
  license?: string;
  
  /** Provider homepage */
  homepage?: string;
}

/**
 * Provider capabilities interface
 */
export interface ProviderCapabilities {
  /** Supports transactions */
  transactions: boolean;
  
  /** Supports prepared statements */
  preparedStatements: boolean;
  
  /** Supports connection pooling */
  connectionPooling: boolean;
  
  /** Supports streaming */
  streaming: boolean;
  
  /** Supports SSL */
  ssl: boolean;
  
  /** Supports migrations */
  migrations: boolean;
  
  /** Supports schemas */
  schemas: boolean;
  
  /** Supports foreign keys */
  foreignKeys: boolean;
  
  /** Supports indexes */
  indexes: boolean;
  
  /** Supports views */
  views: boolean;
  
  /** Supports stored procedures */
  storedProcedures: boolean;
  
  /** Supports triggers */
  triggers: boolean;
  
  /** Maximum connections */
  maxConnections?: number;
  
  /** Maximum query size */
  maxQuerySize?: number;
  
  /** Supported data types */
  dataTypes: string[];
}

/**
 * Provider metadata interface
 */
export interface ProviderMetadata {
  /** Installation date */
  installedAt: Date;
  
  /** Last update date */
  updatedAt: Date;
  
  /** Configuration hash */
  configHash: string;
  
  /** Runtime information */
  runtime: {
    platform: string;
    version: string;
    memory: number;
    uptime: number;
  };
  
  /** Performance metrics */
  metrics: {
    queriesExecuted: number;
    totalTime: number;
    averageTime: number;
    errors: number;
  };
  
  /** Feature flags */
  features: Record<string, boolean>;
}

/**
 * SQL provider interface (for SQL databases)
 */
export interface SqlProviderInterface extends ProviderInterface {
  /** Get table schema */
  getTableSchema(tableName: string): Promise<TableSchema>;
  
  /** Get all tables */
  getTables(): Promise<string[]>;
  
  /** Get table indexes */
  getIndexes(tableName: string): Promise<IndexInfo[]>;
  
  /** Get foreign keys */
  getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]>;
  
  /** Create table */
  createTable(definition: TableDefinition): Promise<void>;
  
  /** Drop table */
  dropTable(tableName: string): Promise<void>;
  
  /** Alter table */
  alterTable(tableName: string, changes: TableChange[]): Promise<void>;
  
  /** Execute migration */
  executeMigration(migration: Migration): Promise<void>;
}

/**
 * NoSQL provider interface (for NoSQL databases)
 */
export interface NoSqlProviderInterface extends ProviderInterface {
  /** Get collection schema */
  getCollectionSchema(collectionName: string): Promise<CollectionSchema>;
  
  /** Get all collections */
  getCollections(): Promise<string[]>;
  
  /** Create collection */
  createCollection(definition: CollectionDefinition): Promise<void>;
  
  /** Drop collection */
  dropCollection(collectionName: string): Promise<void>;
  
  /** Create index */
  createIndex(collectionName: string, index: IndexDefinition): Promise<void>;
  
  /** Drop index */
  dropIndex(collectionName: string, indexName: string): Promise<void>;
}

/**
 * Key-value provider interface (for Redis, etc.)
 */
export interface KeyValueProviderInterface extends ProviderInterface {
  /** Get value by key */
  get(key: string): Promise<any>;
  
  /** Set value by key */
  set(key: string, value: any, ttl?: number): Promise<void>;
  
  /** Delete key */
  delete(key: string): Promise<boolean>;
  
  /** Check if key exists */
  exists(key: string): Promise<boolean>;
  
  /** Get all keys matching pattern */
  keys(pattern: string): Promise<string[]>;
  
  /** Set expiration */
  expire(key: string, seconds: number): Promise<boolean>;
  
  /** Get TTL */
  ttl(key: string): Promise<number>;
}

/**
 * Table schema interface
 */
export interface TableSchema {
  /** Table name */
  name: string;
  
  /** Columns */
  columns: ColumnDefinition[];
  
  /** Primary key */
  primaryKey: string[];
  
  /** Indexes */
  indexes: IndexInfo[];
  
  /** Foreign keys */
  foreignKeys: ForeignKeyInfo[];
  
  /** Table metadata */
  metadata: Record<string, any>;
}

/**
 * Collection schema interface
 */
export interface CollectionSchema {
  /** Collection name */
  name: string;
  
  /** Document schema */
  schema: DocumentSchema;
  
  /** Indexes */
  indexes: IndexInfo[];
  
  /** Validation rules */
  validation?: ConfigValidationRule[];
  
  /** Collection metadata */
  metadata: Record<string, any>;
}

/**
 * Document schema interface
 */
export interface DocumentSchema {
  /** Field definitions */
  fields: FieldDefinition[];
  
  /** Required fields */
  required: string[];
  
  /** Additional properties allowed */
  additionalProperties: boolean;
  
  /** Schema version */
  version: string;
}

/**
 * Field definition interface
 */
export interface FieldDefinition {
  /** Field name */
  name: string;
  
  /** Field type */
  type: FieldType;
  
  /** Field description */
  description?: string;
  
  /** Default value */
  defaultValue?: any;
  
  /** Validation rules */
  validation?: ConfigValidationRule[];
  
  /** Field metadata */
  metadata?: Record<string, any>;
}

/**
 * Column definition interface
 */
export interface ColumnDefinition {
  /** Column name */
  name: string;
  
  /** Column type */
  type: ColumnType;
  
  /** Column length */
  length?: number;
  
  /** Precision for decimal types */
  precision?: number;
  
  /** Scale for decimal types */
  scale?: number;
  
  /** Whether column allows null */
  nullable?: boolean;
  
  /** Default value */
  defaultValue?: any;
  
  /** Whether column is unique */
  unique?: boolean;
  
  /** Whether column is primary key */
  primaryKey?: boolean;
  
  /** Whether column is auto increment */
  autoIncrement?: boolean;
  
  /** Column comment */
  comment?: string;
  
  /** Column metadata */
  metadata?: Record<string, any>;
}

/**
 * Index information interface
 */
export interface IndexInfo {
  /** Index name */
  name: string;
  
  /** Columns */
  columns: string[];
  
  /** Whether index is unique */
  unique: boolean;
  
  /** Index type */
  type?: IndexType;
  
  /** Index method */
  method?: string;
  
  /** Index metadata */
  metadata?: Record<string, any>;
}

/**
 * Foreign key information interface
 */
export interface ForeignKeyInfo {
  /** Foreign key name */
  name: string;
  
  /** Local columns */
  columns: string[];
  
  /** Referenced table */
  referencedTable: string;
  
  /** Referenced columns */
  referencedColumns: string[];
  
  /** On delete action */
  onDelete?: ForeignKeyAction;
  
  /** On update action */
  onUpdate?: ForeignKeyAction;
  
  /** Foreign key metadata */
  metadata?: Record<string, any>;
}

/**
 * Table definition interface
 */
export interface TableDefinition {
  /** Table name */
  name: string;
  
  /** Columns */
  columns: ColumnDefinition[];
  
  /** Primary key */
  primaryKey?: string[];
  
  /** Indexes */
  indexes?: IndexDefinition[];
  
  /** Foreign keys */
  foreignKeys?: ForeignKeyDefinition[];
  
  /** Table options */
  options?: TableOptions;
}

/**
 * Collection definition interface
 */
export interface CollectionDefinition {
  /** Collection name */
  name: string;
  
  /** Document schema */
  schema?: DocumentSchema;
  
  /** Indexes */
  indexes?: IndexDefinition[];
  
  /** Validation rules */
  validation?: ConfigValidationRule[];
  
  /** Collection options */
  options?: CollectionOptions;
}

/**
 * Index definition interface
 */
export interface IndexDefinition {
  /** Index name */
  name: string;
  
  /** Columns or fields */
  fields: string[] | Record<string, 1 | -1>;
  
  /** Whether index is unique */
  unique?: boolean;
  
  /** Index type */
  type?: IndexType;
  
  /** Index options */
  options?: IndexOptions;
}

/**
 * Foreign key definition interface
 */
export interface ForeignKeyDefinition {
  /** Foreign key name */
  name: string;
  
  /** Local columns */
  columns: string[];
  
  /** Referenced table */
  referencedTable: string;
  
  /** Referenced columns */
  referencedColumns: string[];
  
  /** On delete action */
  onDelete?: ForeignKeyAction;
  
  /** On update action */
  onUpdate?: ForeignKeyAction;
}

/**
 * Migration interface
 */
export interface Migration {
  /** Migration ID */
  id: string;
  
  /** Migration name */
  name: string;
  
  /** Migration version */
  version: string;
  
  /** Up function */
  up: (provider: ProviderInterface) => Promise<void>;
  
  /** Down function */
  down: (provider: ProviderInterface) => Promise<void>;
  
  /** Migration metadata */
  metadata?: Record<string, any>;
}

/**
 * Table change interface
 */
export interface TableChange {
  /** Change type */
  type: TableChangeType;
  
  /** Column name */
  column?: string;
  
  /** Column definition */
  definition?: ColumnDefinition;
  
  /** New column name */
  newName?: string;
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
}

/**
 * Table options interface
 */
export interface TableOptions {
  /** Engine */
  engine?: string;
  
  /** Charset */
  charset?: string;
  
  /** Collation */
  collation?: string;
  
  /** Comment */
  comment?: string;
  
  /** Temporary table */
  temporary?: boolean;
}

/**
 * Collection options interface
 */
export interface CollectionOptions {
  /** Capped collection */
  capped?: boolean;
  
  /** Size limit */
  size?: number;
  
  /** Document limit */
  max?: number;
  
  /** Validation level */
  validationLevel?: 'off' | 'strict' | 'moderate';
  
  /** Validation action */
  validationAction?: 'error' | 'warn';
}

/**
 * Index options interface
 */
export interface IndexOptions {
  /** Background creation */
  background?: boolean;
  
  /** Sparse index */
  sparse?: boolean;
  
  /** Expire after seconds */
  expireAfterSeconds?: number;
  
  /** Partial filter expression */
  partialFilterExpression?: Record<string, any>;
}

/**
 * Column types
 */
export type ColumnType = 
  | 'string' 
  | 'integer' 
  | 'bigint'
  | 'decimal'
  | 'float' 
  | 'double'
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'timestamp' 
  | 'time'
  | 'text' 
  | 'longtext'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary'
  | 'enum';

/**
 * Field types
 */
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'object' 
  | 'array'
  | 'mixed';

/**
 * Index types
 */
export type IndexType = 
  | 'btree' 
  | 'hash' 
  | 'gin' 
  | 'gist' 
  | 'text'
  | 'compound'
  | 'partial';

/**
 * Foreign key actions
 */
export type ForeignKeyAction = 
  | 'cascade' 
  | 'restrict' 
  | 'set null' 
  | 'set default' 
  | 'no action';

/**
 * Table change types
 */
export type TableChangeType = 
  | 'add_column' 
  | 'drop_column' 
  | 'modify_column' 
  | 'rename_column';

/**
 * Validation types
 */
export type ValidationType = 
  | 'required' 
  | 'min' 
  | 'max' 
  | 'pattern' 
  | 'enum' 
  | 'custom';
