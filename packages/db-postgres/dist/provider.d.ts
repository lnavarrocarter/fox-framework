import type { Pool, QueryResultRow } from 'pg';
import type { IDbProvider, IRepository, IQueryBuilder, DbConfig, QueryResult } from '@foxframework/core';
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
export declare class PostgresProvider implements IDbProvider {
    private pool;
    private _isConnected;
    private readonly config;
    constructor(config: DbConfig);
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    raw<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    repository<T extends QueryResultRow, PK = number>(table: string): IRepository<T, PK>;
    queryBuilder<T extends QueryResultRow = Record<string, unknown>>(): IQueryBuilder<T>;
    /** @internal */
    requirePool(): Pool;
}
//# sourceMappingURL=provider.d.ts.map