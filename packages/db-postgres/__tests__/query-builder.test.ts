import { Pool } from 'pg';
import { PostgresQueryBuilder } from '../src/query-builder';
import { createMockPool, MockPool } from './helpers/pg-mock';

jest.mock('pg');

describe('PostgresQueryBuilder', () => {
  let mockPool: MockPool;
  let getPool: () => Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);
    getPool = () => mockPool as unknown as Pool;
  });

  // ---------------------------------------------------------------------------
  // toSQL — structural tests (no DB needed)
  // ---------------------------------------------------------------------------

  describe('toSQL()', () => {
    it('builds a simple SELECT *', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .toSQL();

      expect(sql).toBe('SELECT * FROM users');
      expect(params).toEqual([]);
    });

    it('selects specific columns', () => {
      const { sql } = new PostgresQueryBuilder(getPool)
        .from('users')
        .select('id', 'name', 'email')
        .toSQL();

      expect(sql).toBe('SELECT id, name, email FROM users');
    });

    it('adds a WHERE clause', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE active = $1');
      expect(params).toEqual([true]);
    });

    it('chains multiple WHERE with AND', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .andWhere('name', 'LIKE', 'A%')
        .toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE active = $1 AND name LIKE $2');
      expect(params).toEqual([true, 'A%']);
    });

    it('supports OR WHERE', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .orWhere('name', '=', 'Admin')
        .toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE active = $1 OR name = $2');
      expect(params).toEqual([true, 'Admin']);
    });

    it('supports IN operator', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .where('id', 'IN', [1, 2, 3])
        .toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE id IN ($1, $2, $3)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('supports NOT IN operator', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .where('id', 'NOT IN', [4, 5])
        .toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE id NOT IN ($1, $2)');
      expect(params).toEqual([4, 5]);
    });

    it('adds ORDER BY', () => {
      const { sql } = new PostgresQueryBuilder(getPool)
        .from('users')
        .orderBy('name', 'DESC')
        .toSQL();

      expect(sql).toContain('ORDER BY name DESC');
    });

    it('defaults ORDER BY to ASC', () => {
      const { sql } = new PostgresQueryBuilder(getPool)
        .from('users')
        .orderBy('name')
        .toSQL();

      expect(sql).toContain('ORDER BY name ASC');
    });

    it('adds LIMIT', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .limit(10)
        .toSQL();

      expect(sql).toContain('LIMIT $1');
      expect(params).toEqual([10]);
    });

    it('adds OFFSET', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('users')
        .offset(20)
        .toSQL();

      expect(sql).toContain('OFFSET $1');
      expect(params).toEqual([20]);
    });

    it('combines all clauses with correct param indexing', () => {
      const { sql, params } = new PostgresQueryBuilder(getPool)
        .from('orders')
        .select('id', 'total', 'status')
        .where('status', '=', 'paid')
        .andWhere('total', '>', 100)
        .orderBy('total', 'DESC')
        .limit(5)
        .offset(10)
        .toSQL();

      expect(sql).toBe(
        'SELECT id, total, status FROM orders WHERE status = $1 AND total > $2 ORDER BY total DESC LIMIT $3 OFFSET $4',
      );
      expect(params).toEqual(['paid', 100, 5, 10]);
    });

    it('throws when table is not set', () => {
      expect(() =>
        new PostgresQueryBuilder(getPool).select('id').toSQL(),
      ).toThrow('table name is required');
    });

    it('can reuse the same builder for multiple calls (fluent/mutable pattern)', () => {
      const qb = new PostgresQueryBuilder(getPool)
        .from('users')
        .select('id', 'name');

      // First call
      const { sql: sql1 } = qb.toSQL();
      expect(sql1).toBe('SELECT id, name FROM users');

      // Add limit and call again — the same instance now has limit
      qb.limit(10);
      const { sql: sql2 } = qb.toSQL();
      expect(sql2).toBe('SELECT id, name FROM users LIMIT $1');
    });
  });

  // ---------------------------------------------------------------------------
  // execute — integration with pool mock
  // ---------------------------------------------------------------------------

  describe('execute()', () => {
    it('calls pool.query with the built SQL and params', async () => {
      const rows = [{ id: 1, name: 'Alice' }];
      mockPool.query.mockResolvedValueOnce({ rows, rowCount: 1 });

      const result = await new PostgresQueryBuilder<{ id: number; name: string }>(getPool)
        .from('users')
        .select('id', 'name')
        .where('active', '=', true)
        .execute();

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, name FROM users WHERE active = $1',
        [true],
      );
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('returns empty rows when no results', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await new PostgresQueryBuilder(getPool)
        .from('users')
        .where('id', '=', 999)
        .execute();

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });
});
