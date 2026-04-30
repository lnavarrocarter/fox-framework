import { Pool } from 'pg';
import { PostgresRepository } from '../src/repository';
import { createMockPool, MockPool } from './helpers/pg-mock';

jest.mock('pg');

interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

describe('PostgresRepository', () => {
  let mockPool: MockPool;
  let repo: PostgresRepository<User>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);
    repo = new PostgresRepository<User>('users', () => mockPool as unknown as Pool);
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById()', () => {
    it('returns the matching row', async () => {
      const user: User = { id: 1, name: 'Alice', email: 'a@example.com', active: true };
      mockPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

      const result = await repo.findById(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 LIMIT 1',
        [1],
      );
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
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
      mockPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

      const result = await repo.findOne({ where: { email: 'b@example.com' } });
      expect(result).toEqual(user);
    });

    it('returns null when no rows match', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
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
      mockPool.query.mockResolvedValueOnce({ rows: users, rowCount: 2 });

      const result = await repo.findAll();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(result).toEqual(users);
    });

    it('applies WHERE clause', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.findAll({ where: { active: true } });

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE active = $1',
        [true],
      );
    });

    it('applies ORDER BY', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.findAll({ orderBy: { column: 'name', direction: 'DESC' } });

      const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('ORDER BY name DESC');
    });

    it('applies LIMIT and OFFSET', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.findAll({ limit: 10, offset: 20 });

      const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('LIMIT $1');
      expect(sql).toContain('OFFSET $2');
      expect(params).toEqual([10, 20]);
    });

    it('combines WHERE + LIMIT + OFFSET', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.findAll({ where: { active: true }, limit: 5, offset: 10 });

      const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toBe('SELECT * FROM users WHERE active = $1 LIMIT $2 OFFSET $3');
      expect(params).toEqual([true, 5, 10]);
    });
  });

  // ---------------------------------------------------------------------------
  // count
  // ---------------------------------------------------------------------------

  describe('count()', () => {
    it('returns total count without filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '42' }], rowCount: 1 });
      const count = await repo.count();
      expect(count).toBe(42);
    });

    it('returns filtered count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

      await repo.count({ where: { active: false } });

      const [sql] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE active = $1');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create()', () => {
    it('inserts a row and returns the created entity', async () => {
      const created: User = { id: 3, name: 'Carol', email: 'c@example.com', active: true };
      mockPool.query.mockResolvedValueOnce({ rows: [created], rowCount: 1 });

      const result = await repo.create({
        name: 'Carol',
        email: 'c@example.com',
        active: true,
      });

      const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('RETURNING *');
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
      mockPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const result = await repo.update(1, { name: 'Alice Smith' });

      const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('UPDATE users SET name = $1 WHERE id = $2 RETURNING *');
      expect(params).toEqual(['Alice Smith', 1]);
      expect(result).toEqual(updated);
    });

    it('returns null when row does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await repo.update(999, { name: 'Ghost' });
      expect(result).toBeNull();
    });

    it('returns current row when data is empty (no-op update)', async () => {
      const existing: User = { id: 1, name: 'Alice', email: 'a@example.com', active: true };
      mockPool.query.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await repo.update(1, {});
      expect(result).toEqual(existing);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete()', () => {
    it('returns true when a row was deleted', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      const deleted = await repo.delete(1);
      expect(deleted).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        [1],
      );
    });

    it('returns false when row does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
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
      expect(sql).toContain('FROM users');
    });
  });
});
