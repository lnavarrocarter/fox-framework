/**
 * @foxframework/core — Database interfaces
 *
 * These interfaces are implemented by provider packages such as
 * @foxframework/db-postgres, @foxframework/db-mysql, etc.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DbPoolConfig {
  /** Minimum number of connections kept alive */
  min?: number;
  /** Maximum number of connections in the pool */
  max?: number;
  /** Milliseconds to wait before timing out when acquiring a connection */
  acquireTimeoutMillis?: number;
  /** Milliseconds a connection can sit idle before being destroyed */
  idleTimeoutMillis?: number;
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | Record<string, unknown>;
  pool?: DbPoolConfig;
}

/** Config for file-based databases (SQLite) */
export interface FileDbConfig {
  /** Absolute or relative path to the database file. Use ':memory:' for an in-memory DB. */
  filename: string;
  /** Open in read-only mode (default: false) */
  readonly?: boolean;
}

// ---------------------------------------------------------------------------
// Query result
// ---------------------------------------------------------------------------

export interface QueryResult<T extends Record<string, unknown> = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  /** Original driver-level result (provider-specific) */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Query builder (SQL providers)
// ---------------------------------------------------------------------------

export type OrderDirection = 'ASC' | 'DESC';
export type ComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN';

export interface WhereClause {
  column: string;
  operator: ComparisonOperator;
  value: unknown;
}

export interface IQueryBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  from(table: string): this;
  select(...columns: string[]): this;
  where(column: string, operator: ComparisonOperator, value: unknown): this;
  andWhere(column: string, operator: ComparisonOperator, value: unknown): this;
  orWhere(column: string, operator: ComparisonOperator, value: unknown): this;
  orderBy(column: string, direction?: OrderDirection): this;
  limit(n: number): this;
  offset(n: number): this;
  execute(): Promise<QueryResult<T>>;
  toSQL(): { sql: string; params: unknown[] };
}

// ---------------------------------------------------------------------------
// Repository (SQL + MongoDB)
// ---------------------------------------------------------------------------

export type WhereOptions<T> = Partial<T> & Record<string, unknown>;

export interface FindOptions<T> {
  where?: WhereOptions<T>;
  orderBy?: { column: keyof T & string; direction?: OrderDirection };
  limit?: number;
  offset?: number;
}

export interface IRepository<T extends Record<string, unknown>, PK = number> {
  findById(id: PK): Promise<T | null>;
  findOne(options: FindOptions<T>): Promise<T | null>;
  findAll(options?: FindOptions<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: PK, data: Partial<Omit<T, 'id'>>): Promise<T | null>;
  delete(id: PK): Promise<boolean>;
  count(options?: Pick<FindOptions<T>, 'where'>): Promise<number>;
  query(): IQueryBuilder<T>;
}

// ---------------------------------------------------------------------------
// SQL Provider (postgres, mysql, sqlite)
// ---------------------------------------------------------------------------

export interface IDbProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  raw<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK>;
  queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T>;
  readonly isConnected: boolean;
}

// ---------------------------------------------------------------------------
// MongoDB provider
// ---------------------------------------------------------------------------

/** MongoDB filter — subset of the driver's Filter<T> type, kept driver-agnostic */
export type MongoFilter<T extends Record<string, unknown>> = Partial<T> & Record<string, unknown>;

export interface MongoFindOptions<T extends Record<string, unknown>> {
  filter?: MongoFilter<T>;
  sort?: Partial<Record<keyof T & string, 1 | -1>>;
  limit?: number;
  skip?: number;
  projection?: Partial<Record<keyof T & string, 0 | 1>>;
}

export interface IMongoRepository<T extends Record<string, unknown>> {
  findById(id: string): Promise<T | null>;
  findOne(filter?: MongoFilter<T>): Promise<T | null>;
  findAll(options?: MongoFindOptions<T>): Promise<T[]>;
  create(data: Omit<T, '_id'>): Promise<T>;
  update(id: string, data: Partial<Omit<T, '_id'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: MongoFilter<T>): Promise<number>;
}

export interface IMongoProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  collection<T extends Record<string, unknown>>(name: string): IMongoRepository<T>;
  readonly isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Redis provider
// ---------------------------------------------------------------------------

export interface RedisSetOptions {
  /** Expire in seconds */
  ex?: number;
  /** Expire in milliseconds */
  px?: number;
  /** Only set if the key does not already exist */
  nx?: boolean;
  /** Only set if the key already exists */
  xx?: boolean;
}

export interface IRedisProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Strings
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: RedisSetOptions): Promise<void>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;

  // Hash
  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  hdel(key: string, ...fields: string[]): Promise<number>;

  // List
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;

  // Set
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;

  // Counters
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;

  // JSON helpers (serialize/deserialize with JSON.stringify)
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T, options?: RedisSetOptions): Promise<void>;

  readonly isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Entity / Schema auto-creation (used by RDS, DocumentDB)
// ---------------------------------------------------------------------------

export type SqlColumnType =
  | 'serial'        // auto-increment integer (postgres)
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'varchar'       // requires length
  | 'text'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'decimal'       // requires precision/scale
  | 'numeric'
  | 'json'
  | 'jsonb'         // postgres only
  | 'uuid';

export interface EntityColumn {
  name: string;
  type: SqlColumnType;
  /** For varchar — max character length */
  length?: number;
  /** For decimal/numeric — total digits */
  precision?: number;
  /** For decimal/numeric — decimal digits */
  scale?: number;
  primaryKey?: boolean;
  nullable?: boolean;   // default: true
  unique?: boolean;
  /** SQL default expression e.g. 'NOW()', 'true', '0' */
  default?: string;
}

export interface IndexDefinition {
  name?: string;
  columns: string[];
  unique?: boolean;
}

/** SQL entity — becomes a table */
export interface EntityDefinition {
  /** Table name */
  name: string;
  columns: EntityColumn[];
  indexes?: IndexDefinition[];
}

/** MongoDB/DocumentDB entity — becomes a collection */
export interface CollectionDefinition {
  /** Collection name */
  name: string;
  indexes?: Array<{
    fields: Record<string, 1 | -1>;
    unique?: boolean;
    name?: string;
  }>;
}

// ---------------------------------------------------------------------------
// AWS RDS config
// ---------------------------------------------------------------------------

export type RdsEngine = 'postgres' | 'mysql' | 'aurora-postgres' | 'aurora-mysql';

export interface RdsConfig {
  engine: RdsEngine;
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  /**
   * Enable SSL/TLS. Default: true (recommended for RDS).
   * Pass an object to set CA certificate path: `{ ca: '/path/to/rds-ca.pem' }`
   */
  ssl?: boolean | { ca: string };
  pool?: DbPoolConfig;
  /**
   * Entity definitions to auto-create on connect.
   * Tables are created with CREATE TABLE IF NOT EXISTS.
   */
  entities?: EntityDefinition[];
}

// ---------------------------------------------------------------------------
// AWS DocumentDB config
// ---------------------------------------------------------------------------

export interface DocumentDbConfig {
  /** Full MongoDB-compatible connection URI (include user, password, host, port) */
  uri: string;
  database: string;
  /**
   * Enable TLS. Default: true (required for DocumentDB).
   * Set `tlsCaFile` to path of the Amazon DocumentDB CA bundle.
   */
  tls?: boolean;
  tlsCaFile?: string;
  /**
   * Collection definitions to auto-create on connect.
   */
  entities?: CollectionDefinition[];
}

// ---------------------------------------------------------------------------
// AWS DynamoDB config & interfaces
// ---------------------------------------------------------------------------

export type DynamoKeyType = 'S' | 'N' | 'B';
export type DynamoBillingMode = 'PAY_PER_REQUEST' | 'PROVISIONED';

export interface DynamoKeyDefinition {
  name: string;
  type: DynamoKeyType;
}

export interface DynamoGSI {
  indexName: string;
  partitionKey: DynamoKeyDefinition;
  sortKey?: DynamoKeyDefinition;
  billing?: DynamoBillingMode;
  readCapacity?: number;
  writeCapacity?: number;
}

export interface DynamoEntityDefinition {
  /** DynamoDB table name */
  tableName: string;
  partitionKey: DynamoKeyDefinition;
  sortKey?: DynamoKeyDefinition;
  billing?: DynamoBillingMode;    // default: PAY_PER_REQUEST
  readCapacity?: number;          // for PROVISIONED
  writeCapacity?: number;         // for PROVISIONED
  globalSecondaryIndexes?: DynamoGSI[];
}

export interface DynamoDbConfig {
  region: string;
  /** Override endpoint — useful for DynamoDB Local */
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  /**
   * Table definitions to auto-create on connect.
   * Uses CreateTable if the table does not exist (DescribeTable check first).
   */
  entities?: DynamoEntityDefinition[];
}

// ---------------------------------------------------------------------------
// DynamoDB repository & provider interfaces
// ---------------------------------------------------------------------------

export type DynamoItem = Record<string, unknown>;

export interface DynamoGetOptions {
  consistentRead?: boolean;
  projectionExpression?: string;
}

export interface DynamoQueryOptions {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: DynamoItem;
  filterExpression?: string;
  limit?: number;
  scanIndexForward?: boolean;   // false = descending
  exclusiveStartKey?: DynamoItem;
}

export interface DynamoScanOptions {
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: DynamoItem;
  limit?: number;
  exclusiveStartKey?: DynamoItem;
}

export interface DynamoQueryResult<T extends DynamoItem = DynamoItem> {
  items: T[];
  count: number;
  lastEvaluatedKey?: DynamoItem;
}

export interface IDynamoRepository<T extends DynamoItem = DynamoItem> {
  /** Write or replace an item */
  put(item: T): Promise<void>;
  /** Get item by primary key (partitionKey + optional sortKey) */
  get(key: DynamoItem, options?: DynamoGetOptions): Promise<T | null>;
  /** Delete item by primary key */
  delete(key: DynamoItem): Promise<void>;
  /** Query items using KeyConditionExpression */
  query(options: DynamoQueryOptions): Promise<DynamoQueryResult<T>>;
  /** Scan the entire table (use sparingly) */
  scan(options?: DynamoScanOptions): Promise<DynamoQueryResult<T>>;
  /** Batch write — put or delete multiple items */
  batchPut(items: T[]): Promise<void>;
  /** Batch get items by keys */
  batchGet(keys: DynamoItem[], options?: Pick<DynamoGetOptions, 'consistentRead'>): Promise<T[]>;
}

export interface IDynamoProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  table<T extends DynamoItem = DynamoItem>(tableName: string): IDynamoRepository<T>;
  readonly isConnected: boolean;
}

