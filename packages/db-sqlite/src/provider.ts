import type { Database } from 'better-sqlite3';
import type {
  IDbProvider,
  IRepository,
  IQueryBuilder,
  FileDbConfig,
  QueryResult,
} from '@foxframework/core';
import { SQLiteQueryBuilder } from './query-builder';
import { SQLiteRepository } from './repository';

/**
 * SQLiteProvider — manages a `better-sqlite3` Database connection.
 *
 * Usage:
 * ```ts
 * import { SQLiteProvider } from '@foxframework/db-sqlite';
 *
 * const db = new SQLiteProvider({ filename: './mydb.sqlite' });
 * // or in-memory:
 * const db = new SQLiteProvider({ filename: ':memory:' });
 *
 * await db.connect();
 * const users = db.repository<User>('users');
 * const found  = await users.findById(1);
 * await db.disconnect();
 * ```
 */
export class SQLiteProvider implements IDbProvider {
  private db: Database | null = null;
  private _isConnected = false;
  private readonly config: FileDbConfig;

  constructor(config: FileDbConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(): Promise<void> {
    // Lazy-require so users who don't install better-sqlite3 get a clear error
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require('better-sqlite3') as typeof import('better-sqlite3');

    this.db = new BetterSqlite3(this.config.filename, {
      readonly: this.config.readonly ?? false,
    });

    // Validate connection
    this.db.prepare('SELECT 1').get();
    this._isConnected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this._isConnected = false;
    return Promise.resolve();
  }

  async raw<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const db = this.requireDb();
    const rows = db.prepare(sql).all(...params) as T[];
    return Promise.resolve({
      rows,
      rowCount: rows.length,
    });
  }

  repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK> {
    return new SQLiteRepository<T, PK>(table, this.requireDb.bind(this));
  }

  queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T> {
    return new SQLiteQueryBuilder<T>(this.requireDb.bind(this));
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** @internal */
  requireDb(): Database {
    if (!this.db) {
      throw new Error(
        'SQLiteProvider is not connected. Call connect() before executing queries.',
      );
    }
    return this.db;
  }
}
