import type { Pool } from 'mysql2/promise';
import type { IDbProvider, IRepository, IQueryBuilder, DbConfig, QueryResult } from '@foxframework/core';
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
export declare class MySQLProvider implements IDbProvider {
    private pool;
    private _isConnected;
    private readonly config;
    constructor(config: DbConfig);
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    raw<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK>;
    queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T>;
    /** @internal */
    requirePool(): Pool;
}
//# sourceMappingURL=provider.d.ts.map