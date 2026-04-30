import type { Database } from 'better-sqlite3';
import type {
  IRepository,
  IQueryBuilder,
  FindOptions,
  QueryResult,
} from '@foxframework/core';
import { SQLiteQueryBuilder } from './query-builder';

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
export class SQLiteRepository<T extends Record<string, unknown>, PK = number>
  implements IRepository<T, PK>
{
  constructor(
    private readonly table: string,
    private readonly getDb: () => Database,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  findById(id: PK): Promise<T | null> {
    const db = this.getDb();
    const row = db.prepare(`SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`).get(id) as T | undefined;
    return Promise.resolve(row ?? null);
  }

  async findOne(options: FindOptions<T>): Promise<T | null> {
    const opts: FindOptions<T> = { ...options, limit: 1 };
    const rows = await this.findAll(opts);
    return rows[0] ?? null;
  }

  findAll(options: FindOptions<T> = {}): Promise<T[]> {
    const { sql, params } = this.buildSelectSQL(options);
    const db = this.getDb();
    const rows = db.prepare(sql).all(...params) as T[];
    return Promise.resolve(rows);
  }

  count(options: Pick<FindOptions<T>, 'where'> = {}): Promise<number> {
    const { whereSQL, params } = this.buildWhereSQL(options.where);
    const sql = `SELECT COUNT(*) AS count FROM ${this.table}${whereSQL}`;
    const db = this.getDb();
    const row = db.prepare(sql).get(...params) as { count: number } | undefined;
    return Promise.resolve(row?.count ?? 0);
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
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders}) RETURNING *`;

    const db = this.getDb();
    const row = db.prepare(sql).get(...values) as T | undefined;
    if (!row) {
      throw new Error(`Repository.create: INSERT did not return a row`);
    }
    return Promise.resolve(row);
  }

  update(id: PK, data: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const keys = Object.keys(data as Record<string, unknown>);
    const values = Object.values(data as Record<string, unknown>);

    if (keys.length === 0) {
      return this.findById(id);
    }

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ? RETURNING *`;

    const db = this.getDb();
    const row = db.prepare(sql).get(...values, id) as T | undefined;
    return Promise.resolve(row ?? null);
  }

  delete(id: PK): Promise<boolean> {
    const db = this.getDb();
    const result = db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id);
    return Promise.resolve(result.changes > 0);
  }

  // ---------------------------------------------------------------------------
  // QueryBuilder
  // ---------------------------------------------------------------------------

  query(): IQueryBuilder<T> {
    return new SQLiteQueryBuilder<T>(this.getDb).from(this.table);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private buildWhereSQL(
    where: FindOptions<T>['where'],
  ): { whereSQL: string; params: unknown[] } {
    if (!where || Object.keys(where).length === 0) {
      return { whereSQL: '', params: [] };
    }
    const entries = Object.entries(where as Record<string, unknown>);
    const conditions = entries.map(([col]) => `${col} = ?`);
    return {
      whereSQL: ` WHERE ${conditions.join(' AND ')}`,
      params: entries.map(([, v]) => v),
    };
  }

  private buildSelectSQL(options: FindOptions<T>): { sql: string; params: unknown[] } {
    const params: unknown[] = [];

    let sql = `SELECT * FROM ${this.table}`;

    if (options.where && Object.keys(options.where).length > 0) {
      const entries = Object.entries(options.where as Record<string, unknown>);
      const conditions = entries.map(([col]) => `${col} = ?`);
      params.push(...entries.map(([, v]) => v));
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options.orderBy) {
      const dir = options.orderBy.direction ?? 'ASC';
      sql += ` ORDER BY ${options.orderBy.column} ${dir}`;
    }

    if (options.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return { sql, params };
  }

  /** @internal */
  rawQuery<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<R>> {
    const db = this.getDb();
    const rows = db.prepare(sql).all(...params) as R[];
    return Promise.resolve({ rows, rowCount: rows.length });
  }
}
