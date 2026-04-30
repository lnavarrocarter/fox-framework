import type { Database } from 'better-sqlite3';
import type { IRepository, IQueryBuilder, FindOptions, QueryResult } from '@foxframework/core';
/**
 * SQLiteRepository<T, PK> — CRUD operations for a single SQLite table.
 *
 * ```ts
 * interface User { id: number; name: string; email: string }
 *
 * const users = db.repository<User>('users');
 * const alice   = await users.findById(1);
 * const all     = await users.findAll({ where: { name: 'Alice' } });
 * const created = await users.create({ name: 'Bob', email: 'bob@example.com' });
 * await users.update(1, { name: 'Alice Smith' });
 * await users.delete(1);
 * ```
 */
export declare class SQLiteRepository<T extends Record<string, unknown>, PK = number> implements IRepository<T, PK> {
    private readonly table;
    private readonly getDb;
    constructor(table: string, getDb: () => Database);
    findById(id: PK): Promise<T | null>;
    findOne(options: FindOptions<T>): Promise<T | null>;
    findAll(options?: FindOptions<T>): Promise<T[]>;
    count(options?: Pick<FindOptions<T>, 'where'>): Promise<number>;
    create(data: Omit<T, 'id'>): Promise<T>;
    update(id: PK, data: Partial<Omit<T, 'id'>>): Promise<T | null>;
    delete(id: PK): Promise<boolean>;
    query(): IQueryBuilder<T>;
    private buildWhereSQL;
    private buildSelectSQL;
    /** @internal */
    rawQuery<R extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<R>>;
}
//# sourceMappingURL=repository.d.ts.map