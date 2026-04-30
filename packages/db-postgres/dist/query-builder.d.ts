import type { Pool, QueryResultRow } from 'pg';
import type { IQueryBuilder, QueryResult, ComparisonOperator, OrderDirection } from '@foxframework/core';
/**
 * PostgresQueryBuilder — fluent SQL SELECT builder for PostgreSQL.
 *
 * Produces parameterised queries (never interpolates values).
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
export declare class PostgresQueryBuilder<T extends QueryResultRow = Record<string, unknown>> implements IQueryBuilder<T> {
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