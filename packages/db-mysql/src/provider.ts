import type { Pool, ExecuteValues } from 'mysql2/promise';
import type {
  IDbProvider,
  IRepository,
  IQueryBuilder,
  DbConfig,
  QueryResult,
} from '@foxframework/core';
import { MySQLQueryBuilder } from './query-builder';
import { MySQLRepository } from './repository';

/**
 * MySQLProvider — manages a `mysql2` Pool and exposes Repository + QueryBuilder.
 *
 * Usage:
 * ```ts
 * import { MySQLProvider } from '@foxframework/db-mysql';
 *
 * const db = new MySQLProvider({
 *   host: 'localhost', port: 3306,
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
export class MySQLProvider implements IDbProvider {
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mysql = require('mysql2/promise') as typeof import('mysql2/promise');

    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl as Record<string, unknown>,
      connectionLimit: this.config.pool?.max ?? 10,
      waitForConnections: true,
      queueLimit: 0,
    });

    // Validate the connection immediately
    const conn = await this.pool.getConnection();
    conn.release();

    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this._isConnected = false;
  }

  async raw<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const pool = this.requirePool();
    const [rows] = await pool.execute(sql, params as ExecuteValues);
    const rowArray = rows as T[];
    return {
      rows: rowArray,
      rowCount: rowArray.length,
      raw: rows,
    };
  }

  repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK> {
    return new MySQLRepository<T, PK>(table, this.requirePool.bind(this));
  }

  queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T> {
    return new MySQLQueryBuilder<T>(this.requirePool.bind(this));
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** @internal */
  requirePool(): Pool {
    if (!this.pool) {
      throw new Error(
        'MySQLProvider is not connected. Call connect() before executing queries.',
      );
    }
    return this.pool;
  }
}
