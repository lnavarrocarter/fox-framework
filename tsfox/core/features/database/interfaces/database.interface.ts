/**
 * @fileoverview Core database interfaces
 * @module tsfox/core/features/database/interfaces
 */

import { ModelInterface } from './model.interface';

/**
 * Main database interface
 */
export interface DatabaseInterface {
  /** Connect to database */
  connect(): Promise<void>;
  
  /** Disconnect from database */
  disconnect(): Promise<void>;
  
  /** Execute a query and return results */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /** Execute a command and return result info */
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  
  /** Execute operations within a transaction */
  transaction<T>(callback: (tx: TransactionInterface) => Promise<T>): Promise<T>;
  
  /** Get query builder instance */
  getBuilder(): QueryBuilderInterface;
  
  /** Get model instance */
  getModel<T>(name: string): ModelInterface<T>;
  
  /** Check connection health */
  ping(): Promise<boolean>;
  
  /** Get database info */
  getInfo(): DatabaseInfo;
  
  /** Close all connections */
  close(): Promise<void>;
}

/**
 * Query builder interface
 */
export interface QueryBuilderInterface {
  /** SELECT clause */
  select(columns?: string[]): this;
  
  /** FROM clause */
  from(table: string): this;
  
  /** WHERE clause */
  where(condition: WhereCondition): this;
  
  /** AND WHERE clause */
  andWhere(condition: WhereCondition): this;
  
  /** OR WHERE clause */
  orWhere(condition: WhereCondition): this;
  
  /** JOIN clause */
  join(table: string, condition: string, type?: JoinType): this;
  
  /** LEFT JOIN clause */
  leftJoin(table: string, condition: string): this;
  
  /** RIGHT JOIN clause */
  rightJoin(table: string, condition: string): this;
  
  /** INNER JOIN clause */
  innerJoin(table: string, condition: string): this;
  
  /** GROUP BY clause */
  groupBy(columns: string[]): this;
  
  /** HAVING clause */
  having(condition: WhereCondition): this;
  
  /** ORDER BY clause */
  orderBy(column: string, direction?: OrderDirection): this;
  
  /** LIMIT clause */
  limit(count: number): this;
  
  /** OFFSET clause */
  offset(count: number): this;
  
  /** Build query without executing */
  build(): QueryData;
  
  /** Execute query */
  execute<T = any>(): Promise<T[]>;
  
  /** Execute and return first result */
  first<T = any>(): Promise<T | null>;
  
  /** Execute and return count */
  count(): Promise<number>;
  
  /** INSERT INTO */
  insert(data: Record<string, any>): Promise<QueryResult>;
  
  /** UPDATE SET */
  update(data: Record<string, any>): Promise<QueryResult>;
  
  /** DELETE FROM */
  delete(): Promise<QueryResult>;
  
  /** Clone builder */
  clone(): QueryBuilderInterface;
  
  /** Reset builder */
  reset(): this;
}

/**
 * Transaction interface
 */
export interface TransactionInterface {
  /** Execute query within transaction */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /** Execute command within transaction */
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  
  /** Get query builder for transaction */
  getBuilder(): QueryBuilderInterface;
  
  /** Commit transaction */
  commit(): Promise<void>;
  
  /** Rollback transaction */
  rollback(): Promise<void>;
  
  /** Check if transaction is active */
  isActive(): boolean;
  
  /** Get transaction ID */
  getId(): string;
}

/**
 * Connection interface
 */
export interface ConnectionInterface {
  /** Execute query */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /** Execute command */
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  
  /** Begin transaction */
  beginTransaction(): Promise<TransactionInterface>;
  
  /** Check connection health */
  ping(): Promise<boolean>;
  
  /** Close connection */
  close(): Promise<void>;
  
  /** Get connection ID */
  getId(): string;
  
  /** Check if connection is active */
  isActive(): boolean;
  
  /** Get connection metadata */
  getMetadata(): ConnectionMetadata;
}

/**
 * Query result interface
 */
export interface QueryResult {
  /** Result rows */
  rows: any[];
  
  /** Number of affected rows */
  rowCount: number;
  
  /** Field information */
  fields?: FieldInfo[];
  
  /** Insert ID for INSERT operations */
  insertId?: any;
  
  /** Execution time in milliseconds */
  executionTime?: number;
  
  /** Query metadata */
  metadata?: QueryMetadata;
}

/**
 * Field information interface
 */
export interface FieldInfo {
  /** Field name */
  name: string;
  
  /** Field type */
  type: string;
  
  /** Field length */
  length?: number;
  
  /** Whether field allows null */
  nullable?: boolean;
  
  /** Default value */
  defaultValue?: any;
}

/**
 * Database information interface
 */
export interface DatabaseInfo {
  /** Database provider type */
  provider: DatabaseProvider;
  
  /** Database version */
  version: string;
  
  /** Connection count */
  connectionCount: number;
  
  /** Database size */
  size?: string;
  
  /** Database status */
  status: DatabaseStatus;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Connection metadata interface
 */
export interface ConnectionMetadata {
  /** Connection ID */
  id: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last activity timestamp */
  lastActivity: Date;
  
  /** Query count */
  queryCount: number;
  
  /** Connection pool info */
  pool?: PoolInfo;
}

/**
 * Pool information interface
 */
export interface PoolInfo {
  /** Total connections */
  total: number;
  
  /** Active connections */
  active: number;
  
  /** Idle connections */
  idle: number;
  
  /** Waiting requests */
  waiting: number;
}

/**
 * Query metadata interface
 */
export interface QueryMetadata {
  /** Query hash */
  hash: string;
  
  /** Execution plan */
  plan?: any;
  
  /** Cache status */
  cached?: boolean;
  
  /** Performance metrics */
  metrics?: QueryMetrics;
}

/**
 * Query metrics interface
 */
export interface QueryMetrics {
  /** Parse time */
  parseTime: number;
  
  /** Bind time */
  bindTime: number;
  
  /** Execute time */
  executeTime: number;
  
  /** Fetch time */
  fetchTime: number;
  
  /** Total time */
  totalTime: number;
}

/**
 * Query data interface
 */
export interface QueryData {
  /** SQL query string */
  sql: string;
  
  /** Query parameters */
  params: any[];
  
  /** Query type */
  type: QueryType;
  
  /** Query metadata */
  metadata?: Record<string, any>;
}

/**
 * Where condition type
 */
export type WhereCondition = 
  | string 
  | Record<string, any>
  | WhereClause;

/**
 * Where clause interface
 */
export interface WhereClause {
  /** Column name */
  column: string;
  
  /** Operator */
  operator: WhereOperator;
  
  /** Value */
  value: any;
  
  /** Logical connector */
  connector?: LogicalOperator;
}

/**
 * Database provider types
 */
export type DatabaseProvider = 
  | 'postgresql' 
  | 'mysql' 
  | 'sqlite' 
  | 'mongodb' 
  | 'redis'
  | 'memory';

/**
 * Database status types
 */
export type DatabaseStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'connecting' 
  | 'error'
  | 'maintenance';

/**
 * Join types
 */
export type JoinType = 
  | 'INNER' 
  | 'LEFT' 
  | 'RIGHT' 
  | 'FULL' 
  | 'CROSS';

/**
 * Order direction
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * Query types
 */
export type QueryType = 
  | 'SELECT' 
  | 'INSERT' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'CREATE' 
  | 'DROP' 
  | 'ALTER';

/**
 * Where operators
 */
export type WhereOperator = 
  | '=' 
  | '!=' 
  | '<>' 
  | '<' 
  | '<=' 
  | '>' 
  | '>=' 
  | 'LIKE' 
  | 'NOT LIKE' 
  | 'IN' 
  | 'NOT IN' 
  | 'BETWEEN' 
  | 'NOT BETWEEN' 
  | 'IS NULL' 
  | 'IS NOT NULL'
  | 'EXISTS'
  | 'NOT EXISTS';

/**
 * Logical operators
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Migration direction
 */
export type MigrationDirection = 'up' | 'down';

/**
 * Migration status
 */
export type MigrationStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'rolled_back';
