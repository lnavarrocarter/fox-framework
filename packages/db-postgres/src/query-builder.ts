import type { Pool, QueryResultRow } from 'pg';
import type {
  IQueryBuilder,
  QueryResult,
  ComparisonOperator,
  OrderDirection,
  WhereClause,
} from '@foxframework/core';

type WhereGroup = { type: 'AND' | 'OR'; clause: WhereClause };

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
export class PostgresQueryBuilder<T extends QueryResultRow = Record<string, unknown>>
  implements IQueryBuilder<T>
{
  private _table = '';
  private _columns: string[] = ['*'];
  private _wheres: WhereGroup[] = [];
  private _orderBy: { column: string; direction: OrderDirection } | null = null;
  private _limit: number | null = null;
  private _offset: number | null = null;

  constructor(private readonly getPool: () => Pool) {}

  from(table: string): this {
    this._table = table;
    return this;
  }

  select(...columns: string[]): this {
    this._columns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column: string, operator: ComparisonOperator, value: unknown): this {
    this._wheres.push({ type: 'AND', clause: { column, operator, value } });
    return this;
  }

  andWhere(column: string, operator: ComparisonOperator, value: unknown): this {
    return this.where(column, operator, value);
  }

  orWhere(column: string, operator: ComparisonOperator, value: unknown): this {
    this._wheres.push({ type: 'OR', clause: { column, operator, value } });
    return this;
  }

  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this._orderBy = { column, direction };
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  toSQL(): { sql: string; params: unknown[] } {
    if (!this._table) {
      throw new Error('QueryBuilder: table name is required — call .from(table)');
    }

    const params: unknown[] = [];
    let paramIdx = 1;

    const cols = this._columns.join(', ');
    let sql = `SELECT ${cols} FROM ${this._table}`;

    if (this._wheres.length > 0) {
      const conditions = this._wheres.map((w, i) => {
        const op = w.clause.operator;
        let condition: string;

        if (op === 'IN' || op === 'NOT IN') {
          const values = w.clause.value as unknown[];
          const placeholders = values.map(() => `$${paramIdx++}`).join(', ');
          params.push(...values);
          condition = `${w.clause.column} ${op} (${placeholders})`;
        } else {
          params.push(w.clause.value);
          condition = `${w.clause.column} ${op} $${paramIdx++}`;
        }

        return i === 0 ? condition : `${w.type} ${condition}`;
      });
      sql += ` WHERE ${conditions.join(' ')}`;
    }

    if (this._orderBy) {
      sql += ` ORDER BY ${this._orderBy.column} ${this._orderBy.direction}`;
    }

    if (this._limit !== null) {
      sql += ` LIMIT $${paramIdx++}`;
      params.push(this._limit);
    }

    if (this._offset !== null) {
      sql += ` OFFSET $${paramIdx++}`;
      params.push(this._offset);
    }

    return { sql, params };
  }

  async execute(): Promise<QueryResult<T>> {
    const { sql, params } = this.toSQL();
    const pool = this.getPool();
    const result = await pool.query<T>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      raw: result,
    };
  }
}
