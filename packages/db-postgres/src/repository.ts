import type { Pool, QueryResultRow } from 'pg';
import type {
  IRepository,
  IQueryBuilder,
  FindOptions,
  QueryResult,
} from '@foxframework/core';
import { PostgresQueryBuilder } from './query-builder';

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
export class PostgresRepository<T extends QueryResultRow, PK = number> implements IRepository<T, PK> {
  constructor(
    private readonly table: string,
    private readonly getPool: () => Pool,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: PK): Promise<T | null> {
    const result = await this.rawQuery<T>(
      `SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findOne(options: FindOptions<T>): Promise<T | null> {
    const opts: FindOptions<T> = { ...options, limit: 1 };
    const rows = await this.findAll(opts);
    return rows[0] ?? null;
  }

  async findAll(options: FindOptions<T> = {}): Promise<T[]> {
    const { sql, params } = this.buildSelectSQL(options);
    const result = await this.rawQuery<T>(sql, params);
    return result.rows;
  }

  async count(options: Pick<FindOptions<T>, 'where'> = {}): Promise<number> {
    const { whereSQL, params } = this.buildWhereSQL(options.where, 1);
    const sql = `SELECT COUNT(*) AS count FROM ${this.table}${whereSQL}`;
    const result = await this.rawQuery<{ count: string }>(sql, params);
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(data: Omit<T, 'id'>): Promise<T> {
    const keys = Object.keys(data as Record<string, unknown>);
    const values = Object.values(data as Record<string, unknown>);

    if (keys.length === 0) {
      throw new Error(`Repository.create: data object must have at least one field`);
    }

    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders}) RETURNING *`;

    const result = await this.rawQuery<T>(sql, values);
    if (!result.rows[0]) {
      throw new Error(`Repository.create: INSERT did not return a row`);
    }
    return result.rows[0];
  }

  async update(id: PK, data: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const keys = Object.keys(data as Record<string, unknown>);
    const values = Object.values(data as Record<string, unknown>);

    if (keys.length === 0) {
      return this.findById(id);
    }

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const idPlaceholder = `$${keys.length + 1}`;
    const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ${idPlaceholder} RETURNING *`;

    const result = await this.rawQuery<T>(sql, [...values, id]);
    return result.rows[0] ?? null;
  }

  async delete(id: PK): Promise<boolean> {
    const result = await this.rawQuery(
      `DELETE FROM ${this.table} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // QueryBuilder
  // ---------------------------------------------------------------------------

  query(): IQueryBuilder<T> {
    return new PostgresQueryBuilder<T>(this.getPool).from(this.table);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private buildWhereSQL(
    where: FindOptions<T>['where'],
    startIdx: number,
  ): { whereSQL: string; params: unknown[] } {
    if (!where || Object.keys(where).length === 0) {
      return { whereSQL: '', params: [] };
    }
    const entries = Object.entries(where as Record<string, unknown>);
    const conditions = entries.map(
      ([col], i) => `${col} = $${startIdx + i}`,
    );
    return {
      whereSQL: ` WHERE ${conditions.join(' AND ')}`,
      params: entries.map(([, v]) => v),
    };
  }

  private buildSelectSQL(options: FindOptions<T>): { sql: string; params: unknown[] } {
    let paramIdx = 1;
    const params: unknown[] = [];

    let sql = `SELECT * FROM ${this.table}`;

    if (options.where && Object.keys(options.where).length > 0) {
      const entries = Object.entries(options.where as Record<string, unknown>);
      const conditions = entries.map(([col]) => `${col} = $${paramIdx++}`);
      params.push(...entries.map(([, v]) => v));
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options.orderBy) {
      const dir = options.orderBy.direction ?? 'ASC';
      sql += ` ORDER BY ${options.orderBy.column} ${dir}`;
    }

    if (options.limit !== undefined) {
      sql += ` LIMIT $${paramIdx++}`;
      params.push(options.limit);
    }

    if (options.offset !== undefined) {
      sql += ` OFFSET $${paramIdx++}`;
      params.push(options.offset);
    }

    return { sql, params };
  }

  private async rawQuery<R extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<R>> {
    const pool = this.getPool();
    const result = await pool.query<R>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      raw: result,
    };
  }
}
