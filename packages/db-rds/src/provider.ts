import * as fs from 'fs';
import type {
  IDbProvider,
  IRepository,
  IQueryBuilder,
  QueryResult,
  RdsConfig,
} from '@foxframework/core';
import { SchemaBuilder } from './schema-builder';

export class RdsProvider implements IDbProvider {
  private inner: IDbProvider | null = null;
  private schema: SchemaBuilder | null = null;
  private _isConnected = false;

  constructor(private readonly config: RdsConfig) {}

  async connect(): Promise<void> {
    const { config } = this;
    const isPostgres = config.engine === 'postgres' || config.engine === 'aurora-postgres';

    if (isPostgres) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PostgresProvider } = require('@foxframework/db-postgres');
      this.inner = new PostgresProvider({
        host: config.host,
        port: config.port ?? 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: this.buildSslConfig('postgres'),
        pool: config.pool,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MySQLProvider } = require('@foxframework/db-mysql');
      this.inner = new MySQLProvider({
        host: config.host,
        port: config.port ?? 3306,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: this.buildSslConfig('mysql'),
        pool: config.pool,
      });
    }

    await this.inner!.connect();
    this._isConnected = true;

    if (config.entities?.length) {
      this.schema = new SchemaBuilder(config.engine, async (sql) => {
        await this.inner!.raw(sql);
      });
      await this.schema.ensureEntities(config.entities);
    }
  }

  private buildSslConfig(driver: 'postgres' | 'mysql'): Record<string, unknown> | undefined {
    const { ssl } = this.config;
    if (!ssl) return undefined;
    if (ssl === true) {
      return driver === 'postgres'
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false };
    }
    // ssl is an object with ca path
    const ca = fs.readFileSync((ssl as { ca: string }).ca);
    return { ca };
  }

  async disconnect(): Promise<void> {
    await this.inner?.disconnect();
    this._isConnected = false;
  }

  async raw<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (!this.inner) {
      throw new Error('RdsProvider: not connected');
    }
    return this.inner.raw<T>(sql, params);
  }

  repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK> {
    if (!this.inner) {
      throw new Error('RdsProvider: not connected');
    }
    return this.inner.repository<T, PK>(table);
  }

  queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T> {
    if (!this.inner) {
      throw new Error('RdsProvider: not connected');
    }
    return this.inner.queryBuilder<T>();
  }

  get isConnected(): boolean {
    return this._isConnected;
  }
}
