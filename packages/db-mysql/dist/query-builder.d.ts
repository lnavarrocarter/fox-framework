import type { Pool } from 'mysql2/promise';
import type { IQueryBuilder, QueryResult, ComparisonOperator, OrderDirection } from '@foxframework/core';
/**
 * MySQLQueryBuilder — fluent SQL SELECT builder for MySQL.
 *
 * Produces parameterised queries using `?` placeholders (never interpolates values).
 *
 * ```ts
 * const results = await db.queryBuilder<User>()
 *   .from('users')
 *   .select('id', 'name', 'email')
 *   .where('active', '=', true)
 *   .orderBy('name')
 *   .limit(20)
 *   .execute();
 * ```
 */
export declare class MySQLQueryBuilder<T extends Record<string, unknown> = Record<string, unknown>> implements IQueryBuilder<T> {
    private readonly getPool;
    private _table;
    private _columns;
    private _wheres;
    private _orderBy;
    private _limit;
    private _offset;
    constructor(getPool: () => Pool);
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