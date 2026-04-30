import type { Pool } from 'mysql2/promise';
import { MySQLRepository } from '../src/repository';
import { createMockPool, MockPool } from './helpers/mysql-mock';

jest.mock('mysql2/promise');

type User = {
  id: number;
  name: string;
  email: string;
  active: boolean;
};

describe('MySQLRepository', () => {
  let mockPool: MockPool;
  let repo: MySQLRepository<User>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    repo = new MySQLRepository<User>('users', () => mockPool as unknown as Pool);
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById()', () => {
    it('returns the matching row', async () => {
      const user: User = { id: 1, name: 'Alice', email: 'a@example.com', active: true };
      mockPool.execute.mockResolvedValueOnce([[user], []]);

      const result = await repo.findById(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE id = ? LIMIT 1',
        [1],
      );
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);
      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne()', () => {
    it('returns the first row matching the where clause', async () => {
      const user: User = { id: 2, name: 'Bob', email: 'b@example.com', active: true };
      mockPool.execute.mockResolvedValueOnce([[user], []]);

      const result = await repo.findOne({ where: { email: 'b@example.com' } });
      expect(result).toEqual(user);
    });

    it('returns null when no rows match', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);
      const result = await repo.findOne({ where: { active: false } });
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll()', () => {
    it('returns all rows with no options', async () => {
      const users: User[] = [
        { id: 1, name: 'Alice', email: 'a@example.com', active: true },
        { id: 2, name: 'Bob', email: 'b@example.com', active: false },
      ];
      mockPool.execute.mockResolvedValueOnce([users, []]);

      const result = await repo.findAll();

      expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM `users`', []);
      expect(result).toEqual(users);
    });

    it('applies WHERE clause', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      await repo.findAll({ where: { active: true } });

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `active` = ?',
        [true],
      );
    });

    it('applies ORDER BY', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      await repo.findAll({ orderBy: { column: 'name', direction: 'DESC' } });

      const [sql] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('ORDER BY `name` DESC');
    });

    it('applies LIMIT and OFFSET', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      await repo.findAll({ limit: 10, offset: 20 });

      const [sql, params] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('LIMIT ?');
      expect(sql).toContain('OFFSET ?');
      expect(params).toEqual([10, 20]);
    });

    it('combines WHERE + LIMIT + OFFSET', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      await repo.findAll({ where: { active: true }, limit: 5, offset: 10 });

      const [sql, params] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toBe('SELECT * FROM `users` WHERE `active` = ? LIMIT ? OFFSET ?');
      expect(params).toEqual([true, 5, 10]);
    });
  });

  // ---------------------------------------------------------------------------
  // count
  // ---------------------------------------------------------------------------

  describe('count()', () => {
    it('returns total count without filter', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: '42' }], []]);
      const count = await repo.count();
      expect(count).toBe(42);
    });

    it('returns filtered count', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: '5' }], []]);

      await repo.count({ where: { active: false } });

      const [sql] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE `active` = ?');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create()', () => {
    it('inserts a row and returns the created entity', async () => {
      const created: User = { id: 3, name: 'Carol', email: 'c@example.com', active: true };
      // First execute: INSERT result with insertId
      mockPool.execute.mockResolvedValueOnce([{ insertId: 3, affectedRows: 1 }, []]);
      // Second execute: SELECT by insertId
      mockPool.execute.mockResolvedValueOnce([[created], []]);

      const result = await repo.create({
        name: 'Carol',
        email: 'c@example.com',
        active: true,
      });

      const [sql, params] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO `users`');
      expect(params).toContain('Carol');
      expect(result).toEqual(created);
    });

    it('throws if data is empty', async () => {
      await expect(repo.create({} as Omit<User, 'id'>)).rejects.toThrow(
        'data object must have at least one field',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update()', () => {
    it('updates columns and returns the updated entity', async () => {
      const updated: User = { id: 1, name: 'Alice Smith', email: 'a@example.com', active: true };
      // First: UPDATE
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      // Second: SELECT (findById)
      mockPool.execute.mockResolvedValueOnce([[updated], []]);

      const result = await repo.update(1, { name: 'Alice Smith' });

      const [sql, params] = mockPool.execute.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('UPDATE `users` SET `name` = ? WHERE id = ?');
      expect(params).toEqual(['Alice Smith', 1]);
      expect(result).toEqual(updated);
    });

    it('returns null when row does not exist', async () => {
      // UPDATE succeeds but findById returns nothing
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const result = await repo.update(999, { name: 'Ghost' });
      expect(result).toBeNull();
    });

    it('returns current row when data is empty (no-op update)', async () => {
      const existing: User = { id: 1, name: 'Alice', email: 'a@example.com', active: true };
      mockPool.execute.mockResolvedValueOnce([[existing], []]);

      const result = await repo.update(1, {});
      expect(result).toEqual(existing);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete()', () => {
    it('returns true when a row was deleted', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      const deleted = await repo.delete(1);
      expect(deleted).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'DELETE FROM `users` WHERE id = ?',
        [1],
      );
    });

    it('returns false when row does not exist', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
      const deleted = await repo.delete(999);
      expect(deleted).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // query() — QueryBuilder integration
  // ---------------------------------------------------------------------------

  describe('query()', () => {
    it('returns a QueryBuilder pre-seeded with the table', () => {
      const qb = repo.query();
      const { sql } = qb.select('id', 'name').toSQL();
      expect(sql).toContain('FROM `users`');
    });
  });
});
