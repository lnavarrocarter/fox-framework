import type { Pool, QueryResultRow } from 'pg';
import type { IRepository, IQueryBuilder, FindOptions } from '@foxframework/core';
/**
 * PostgresRepository<T, PK> — CRUD operations for a single table.
 *
 * ```ts
 * interface User { id: number; name: string; email: string; active: boolean }
 *
 * const users = db.repository<User>('users');
 * const alice  = await users.findById(1);
 * const all    = await users.findAll({ where: { active: true }, limit: 50 });
 * const created = await users.create({ name: 'Bob', email: 'bob@example.com', active: true });
 * await users.update(1, { name: 'Alice Smith' });
 * await users.delete(1);
 * ```
 */
export declare class PostgresRepository<T extends QueryResultRow, PK = number> implements IRepository<T, PK> {
    private readonly table;
    private readonly getPool;
    constructor(table: string, getPool: () => Pool);
    findById(id: PK): Promise<T | null>;
    findOne(options: FindOptions<T>): Promise<T | null>;
    findAll(options?: FindOptions<T>): Promise<T[]>;
    count(options?: Partial<Pick<FindOptions<T>, 'where'>>): Promise<number>;
    create(data: Omit<T, 'id'>): Promise<T>;
    update(id: PK, data: Partial<Omit<T, 'id'>>): Promise<T | null>;
    delete(id: PK): Promise<boolean>;
    query(): IQueryBuilder<T>;
    private buildWhereSQL;
    private buildSelectSQL;
    private rawQuery;
}
//# sourceMappingURL=repository.d.ts.map