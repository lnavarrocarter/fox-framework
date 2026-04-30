import type { Database } from 'better-sqlite3';
import type { IDbProvider, IRepository, IQueryBuilder, FileDbConfig, QueryResult } from '@foxframework/core';
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
export declare class SQLiteProvider implements IDbProvider {
    private db;
    private _isConnected;
    private readonly config;
    constructor(config: FileDbConfig);
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    raw<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK>;
    queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T>;
    /** @internal */
    requireDb(): Database;
}
//# sourceMappingURL=provider.d.ts.map