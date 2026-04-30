import type { Database } from 'better-sqlite3';
import type { IQueryBuilder, QueryResult, ComparisonOperator, OrderDirection } from '@foxframework/core';
/**
 * SQLiteQueryBuilder — fluent SQL SELECT builder for SQLite.
 *
 * Produces parameterised queries using `?` placeholders.
 *
 * ```ts
 * const results = await db.queryBuilder<User>()
 *   .from('users')
 *   .select('id', 'name', 'email')
 *   .where('active', '=', 1)
 *   .orderBy('name')
 *   .limit(20)
 *   .execute();
 * ```
 */
export declare class SQLiteQueryBuilder<T extends Record<string, unknown> = Record<string, unknown>> implements IQueryBuilder<T> {
    private readonly getDb;
    private _table;
    private _columns;
    private _wheres;
    private _orderBy;
    private _limit;
    private _offset;
    constructor(getDb: () => Database);
    from(table: string): this;
    select(...columns: string[]): this;
    where(column: string, operator: ComparisonOperator, value: unknown): this;
    andWhere(column: string, operator: ComparisonOperator, value: unknown): this;
    orWhere(column: string, operator: ComparisonOperator, value: unknown): this;
    orderBy(column: string, direction?: OrderDirection): this;
    limit(n: number): this;
    offset(n: number): this;
    toSQL(): {
        sql: string;
        params: unknown[];
    };
    execute(): Promise<QueryResult<T>>;
}
//# sourceMappingURL=query-builder.d.ts.map