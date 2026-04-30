import type { Pool } from 'mysql2/promise';
import { MySQLQueryBuilder } from '../src/query-builder';
import { createMockPool, MockPool } from './helpers/mysql-mock';

jest.mock('mysql2/promise');

describe('MySQLQueryBuilder', () => {
  let mockPool: MockPool;
  let getPool: () => Pool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    getPool = () => mockPool as unknown as Pool;
  });

  // ---------------------------------------------------------------------------
  // toSQL — structural tests (no DB needed)
  // ---------------------------------------------------------------------------

  describe('toSQL()', () => {
    it('builds a simple SELECT *', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users`');
      expect(params).toEqual([]);
    });

    it('selects specific columns', () => {
      const { sql } = new MySQLQueryBuilder(getPool)
        .from('users')
        .select('id', 'name', 'email')
        .toSQL();

      expect(sql).toBe('SELECT id, name, email FROM `users`');
    });

    it('adds a WHERE clause', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users` WHERE `active` = ?');
      expect(params).toEqual([true]);
    });

    it('chains multiple WHERE with AND', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .andWhere('name', 'LIKE', 'A%')
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users` WHERE `active` = ? AND `name` LIKE ?');
      expect(params).toEqual([true, 'A%']);
    });

    it('supports OR WHERE', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .where('active', '=', true)
        .orWhere('name', '=', 'Admin')
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users` WHERE `active` = ? OR `name` = ?');
      expect(params).toEqual([true, 'Admin']);
    });

    it('supports IN operator', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .where('id', 'IN', [1, 2, 3])
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users` WHERE `id` IN (?, ?, ?)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('supports NOT IN operator', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .where('id', 'NOT IN', [4, 5])
        .toSQL();

      expect(sql).toBe('SELECT * FROM `users` WHERE `id` NOT IN (?, ?)');
      expect(params).toEqual([4, 5]);
    });

    it('adds ORDER BY', () => {
      const { sql } = new MySQLQueryBuilder(getPool)
        .from('users')
        .orderBy('name', 'DESC')
        .toSQL();

      expect(sql).toContain('ORDER BY `name` DESC');
    });

    it('defaults ORDER BY to ASC', () => {
      const { sql } = new MySQLQueryBuilder(getPool)
        .from('users')
        .orderBy('name')
        .toSQL();

      expect(sql).toContain('ORDER BY `name` ASC');
    });

    it('adds LIMIT', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .limit(10)
        .toSQL();

      expect(sql).toContain('LIMIT ?');
      expect(params).toEqual([10]);
    });

    it('adds OFFSET', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('users')
        .offset(20)
        .toSQL();

      expect(sql).toContain('OFFSET ?');
      expect(params).toEqual([20]);
    });

    it('combines all clauses with correct param ordering', () => {
      const { sql, params } = new MySQLQueryBuilder(getPool)
        .from('orders')
        .select('id', 'total', 'status')
        .where('status', '=', 'paid')
        .andWhere('total', '>', 100)
        .orderBy('total', 'DESC')
        .limit(5)
        .offset(10)
        .toSQL();

      expect(sql).toBe(
        'SELECT id, total, status FROM `orders` WHERE `status` = ? AND `total` > ? ORDER BY `total` DESC LIMIT ? OFFSET ?',
      );
      expect(params).toEqual(['paid', 100, 5, 10]);
    });

    it('throws when table is not set', () => {
      expect(() =>
        new MySQLQueryBuilder(getPool).select('id').toSQL(),
      ).toThrow('table name is required');
    });

    it('can reuse the same builder for multiple calls (fluent/mutable pattern)', () => {
      const qb = new MySQLQueryBuilder(getPool)
        .from('users')
        .select('id', 'name');

      const { sql: sql1 } = qb.toSQL();
      expect(sql1).toBe('SELECT id, name FROM `users`');

      qb.limit(10);
      const { sql: sql2 } = qb.toSQL();
      expect(sql2).toBe('SELECT id, name FROM `users` LIMIT ?');
    });
  });

  // ---------------------------------------------------------------------------
  // execute — integration with pool mock
  // ---------------------------------------------------------------------------

  describe('execute()', () => {
    it('calls pool.execute with the built SQL and params', async () => {
      const rows = [{ id: 1, name: 'Alice' }];
      mockPool.execute.mockResolvedValueOnce([rows, []]);

      const result = await new MySQLQueryBuilder<{ id: number; name: string }>(getPool)
        .from('users')
        .select('id', 'name')
        .where('active', '=', true)
        .execute();

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT id, name FROM `users` WHERE `active` = ?',
        [true],
      );
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('returns empty rows when no results', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const result = await new MySQLQueryBuilder(getPool)
        .from('users')
        .where('id', '=', 999)
        .execute();

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });
});
