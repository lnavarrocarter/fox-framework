import type { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import type {
  IDbProvider,
  IRepository,
  IQueryBuilder,
  DbConfig,
  QueryResult,
} from '@foxframework/core';
import { PostgresQueryBuilder } from './query-builder';
import { PostgresRepository } from './repository';

/**
 * PostgresProvider — manages a `pg.Pool` and exposes Repository + QueryBuilder.
 *
 * Usage:
 * ```ts
 * import { PostgresProvider } from '@foxframework/db-postgres';
 *
 * const db = new PostgresProvider({
 *   host: 'localhost', port: 5432,
 *   database: 'mydb', user: 'admin', password: 'secret',
 *   pool: { min: 2, max: 10 },
 * });
 *
 * await db.connect();
 * const users = db.repository<User>('users');
 * const found  = await users.findById(1);
 * await db.disconnect();
 * ```
 */
export class PostgresProvider implements IDbProvider {
  private pool: Pool | null = null;
  private _isConnected = false;
  private readonly config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    // Lazy-require so users who don't install pg get a clear error
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');

    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl as PoolConfig['ssl'],
      min: this.config.pool?.min ?? 2,
      max: this.config.pool?.max ?? 10,
      idleTimeoutMillis: this.config.pool?.idleTimeoutMillis ?? 30_000,
      connectionTimeoutMillis: this.config.pool?.acquireTimeoutMillis ?? 5_000,
    };

    this.pool = new Pool(poolConfig);

    // Validate the connection immediately
    const client: PoolClient = await this.pool.connect();
    client.release();

    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this._isConnected = false;
  }

  async raw<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const pool = this.requirePool();
    const result = await pool.query<T>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      raw: result,
    };
  }

  repository<T extends QueryResultRow, PK = number>(table: string): IRepository<T, PK> {
    return new PostgresRepository<T, PK>(table, this.requirePool.bind(this));
  }

  queryBuilder<T extends QueryResultRow = Record<string, unknown>>(): IQueryBuilder<T> {
    return new PostgresQueryBuilder<T>(this.requirePool.bind(this));
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** @internal */
  requirePool(): Pool {
    if (!this.pool) {
      throw new Error(
        'PostgresProvider is not connected. Call connect() before executing queries.',
      );
    }
    return this.pool;
  }
}
