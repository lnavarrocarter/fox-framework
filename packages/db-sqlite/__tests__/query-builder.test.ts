import { SQLiteQueryBuilder } from '../src/query-builder';
import { createMockDb, createMockStatement } from './helpers/sqlite-mock';
import type { MockDb } from './helpers/sqlite-mock';
import type { Database } from 'better-sqlite3';

function makeQb(mockDb: MockDb) {
  return new SQLiteQueryBuilder((): Database => mockDb as unknown as Database);
}

describe('SQLiteQueryBuilder', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  // ---------------------------------------------------------------------------
  // toSQL()
  // ---------------------------------------------------------------------------

  describe('toSQL()', () => {
    it('throws when no table is set', () => {
      const qb = makeQb(mockDb);
      expect(() => qb.toSQL()).toThrow('table name is required');
    });

    it('builds a simple SELECT *', () => {
      const { sql, params } = makeQb(mockDb).from('users').toSQL();
      expect(sql).toBe('SELECT * FROM users');
      expect(params).toEqual([]);
    });

    it('builds SELECT with specific columns', () => {
      const { sql } = makeQb(mockDb).from('users').select('id', 'name').toSQL();
      expect(sql).toBe('SELECT id, name FROM users');
    });

    it('builds WHERE clause', () => {
      const { sql, params } = makeQb(mockDb).from('users').where('active', '=', 1).toSQL();
      expect(sql).toBe('SELECT * FROM users WHERE active = ?');
      expect(params).toEqual([1]);
    });

    it('builds AND WHERE', () => {
      const { sql, params } = makeQb(mockDb)
        .from('users')
        .where('active', '=', 1)
        .andWhere('name', 'LIKE', '%Alice%')
        .toSQL();
      expect(sql).toBe('SELECT * FROM users WHERE active = ? AND name LIKE ?');
      expect(params).toEqual([1, '%Alice%']);
    });

    it('builds OR WHERE', () => {
      const { sql, params } = makeQb(mockDb)
        .from('users')
        .where('active', '=', 1)
        .orWhere('name', '=', 'Bob')
        .toSQL();
      expect(sql).toBe('SELECT * FROM users WHERE active = ? OR name = ?');
      expect(params).toEqual([1, 'Bob']);
    });

    it('builds IN clause', () => {
      const { sql, params } = makeQb(mockDb)
        .from('users')
        .where('id', 'IN', [1, 2, 3])
        .toSQL();
      expect(sql).toBe('SELECT * FROM users WHERE id IN (?, ?, ?)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('builds NOT IN clause', () => {
      const { sql, params } = makeQb(mockDb)
        .from('users')
        .where('id', 'NOT IN', [4, 5])
        .toSQL();
      expect(sql).toBe('SELECT * FROM users WHERE id NOT IN (?, ?)');
      expect(params).toEqual([4, 5]);
    });

    it('builds ORDER BY ASC (default)', () => {
      const { sql } = makeQb(mockDb).from('users').orderBy('name').toSQL();
      expect(sql).toBe('SELECT * FROM users ORDER BY name ASC');
    });

    it('builds ORDER BY DESC', () => {
      const { sql } = makeQb(mockDb).from('users').orderBy('name', 'DESC').toSQL();
      expect(sql).toBe('SELECT * FROM users ORDER BY name DESC');
    });

    it('builds LIMIT', () => {
      const { sql, params } = makeQb(mockDb).from('users').limit(10).toSQL();
      expect(sql).toBe('SELECT * FROM users LIMIT ?');
      expect(params).toEqual([10]);
    });

    it('builds OFFSET', () => {
      const { sql, params } = makeQb(mockDb).from('users').offset(20).toSQL();
      expect(sql).toBe('SELECT * FROM users OFFSET ?');
      expect(params).toEqual([20]);
    });

    it('builds a complex query', () => {
      const { sql, params } = makeQb(mockDb)
        .from('users')
        .select('id', 'name', 'email')
        .where('active', '=', 1)
        .andWhere('name', 'LIKE', '%A%')
        .orderBy('name', 'ASC')
        .limit(10)
        .offset(5)
        .toSQL();

      expect(sql).toBe(
        'SELECT id, name, email FROM users WHERE active = ? AND name LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?',
      );
      expect(params).toEqual([1, '%A%', 10, 5]);
    });
  });

  // ---------------------------------------------------------------------------
  // execute()
  // ---------------------------------------------------------------------------

  describe('execute()', () => {
    it('calls db.prepare().all() with sql and params', async () => {
      const rows = [{ id: 1, name: 'Alice' }];
      const stmt = createMockStatement({ all: rows });
      mockDb.prepare.mockReturnValue(stmt);

      const result = await makeQb(mockDb)
        .from('users')
        .where('active', '=', 1)
        .execute();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE active = ?');
      expect(stmt.all).toHaveBeenCalledWith(1);
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('returns empty rows when no results', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));

      const result = await makeQb(mockDb).from('users').execute();

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });
});
