import { SQLiteRepository } from '../src/repository';
import { createMockDb, createMockStatement } from './helpers/sqlite-mock';
import type { MockDb } from './helpers/sqlite-mock';
import type { Database } from 'better-sqlite3';

interface User extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  active: number; // SQLite uses 0/1 for booleans
}

function makeRepo(mockDb: MockDb) {
  return new SQLiteRepository<User>('users', () => mockDb as unknown as Database);
}

describe('SQLiteRepository', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById()', () => {
    it('returns a row when found', async () => {
      const user = { id: 1, name: 'Alice', email: 'alice@example.com', active: 1 };
      mockDb.prepare.mockReturnValue(createMockStatement({ get: user }));

      const repo = makeRepo(mockDb);
      const result = await repo.findById(1);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? LIMIT 1');
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ get: null }));

      const repo = makeRepo(mockDb);
      const result = await repo.findById(99);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne()', () => {
    it('returns first matching row', async () => {
      const user = { id: 2, name: 'Bob', email: 'bob@example.com', active: 1 };
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [user] }));

      const repo = makeRepo(mockDb);
      const result = await repo.findOne({ where: { active: 1 } });

      expect(result).toEqual(user);
    });

    it('returns null when no match', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));

      const repo = makeRepo(mockDb);
      const result = await repo.findOne({ where: { name: 'Nobody' } });

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll()', () => {
    it('returns all rows with no options', async () => {
      const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com', active: 1 },
        { id: 2, name: 'Bob', email: 'bob@example.com', active: 1 },
      ];
      mockDb.prepare.mockReturnValue(createMockStatement({ all: users }));

      const repo = makeRepo(mockDb);
      const result = await repo.findAll();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users');
      expect(result).toEqual(users);
    });

    it('applies where clause', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));
      const repo = makeRepo(mockDb);
      await repo.findAll({ where: { active: 1 } });

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE active = ?');
    });

    it('applies orderBy', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));
      const repo = makeRepo(mockDb);
      await repo.findAll({ orderBy: { column: 'name', direction: 'DESC' } });

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users ORDER BY name DESC');
    });

    it('applies limit and offset', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));
      const repo = makeRepo(mockDb);
      await repo.findAll({ limit: 10, offset: 20 });

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users LIMIT ? OFFSET ?');
    });

    it('applies combined options', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ all: [] }));
      const repo = makeRepo(mockDb);
      await repo.findAll({
        where: { active: 1 },
        orderBy: { column: 'name' },
        limit: 5,
        offset: 0,
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE active = ? ORDER BY name ASC LIMIT ? OFFSET ?',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // count
  // ---------------------------------------------------------------------------

  describe('count()', () => {
    it('returns count of all rows', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ get: { count: 42 } }));
      const repo = makeRepo(mockDb);
      const result = await repo.count();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT COUNT(*) AS count FROM users');
      expect(result).toBe(42);
    });

    it('returns count with where clause', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ get: { count: 5 } }));
      const repo = makeRepo(mockDb);
      const result = await repo.count({ where: { active: 1 } });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS count FROM users WHERE active = ?',
      );
      expect(result).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create()', () => {
    it('inserts and returns the created row', async () => {
      const created = { id: 3, name: 'Charlie', email: 'charlie@example.com', active: 1 };
      mockDb.prepare.mockReturnValue(createMockStatement({ get: created }));

      const repo = makeRepo(mockDb);
      const result = await repo.create({ name: 'Charlie', email: 'charlie@example.com', active: 1 });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT INTO users (name, email, active) VALUES (?, ?, ?) RETURNING *',
      );
      expect(result).toEqual(created);
    });

    it('throws when data is empty', async () => {
      const repo = makeRepo(mockDb);
      await expect(repo.create({} as Omit<User, 'id'>)).rejects.toThrow(
        'Repository.create: data object must have at least one field',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update()', () => {
    it('updates and returns the updated row', async () => {
      const updated = { id: 1, name: 'Alice Smith', email: 'alice@example.com', active: 1 };
      mockDb.prepare.mockReturnValue(createMockStatement({ get: updated }));

      const repo = makeRepo(mockDb);
      const result = await repo.update(1, { name: 'Alice Smith' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE id = ? RETURNING *',
      );
      expect(result).toEqual(updated);
    });

    it('returns null when row not found', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ get: undefined }));

      const repo = makeRepo(mockDb);
      const result = await repo.update(99, { name: 'Ghost' });

      expect(result).toBeNull();
    });

    it('calls findById when data is empty', async () => {
      const user = { id: 1, name: 'Alice', email: 'alice@example.com', active: 1 };
      mockDb.prepare.mockReturnValue(createMockStatement({ get: user }));

      const repo = makeRepo(mockDb);
      const result = await repo.update(1, {});

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? LIMIT 1');
      expect(result).toEqual(user);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete()', () => {
    it('returns true when row was deleted', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ run: { changes: 1, lastInsertRowid: 0 } }));

      const repo = makeRepo(mockDb);
      const result = await repo.delete(1);

      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
      expect(result).toBe(true);
    });

    it('returns false when row not found', async () => {
      mockDb.prepare.mockReturnValue(createMockStatement({ run: { changes: 0, lastInsertRowid: 0 } }));

      const repo = makeRepo(mockDb);
      const result = await repo.delete(99);

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // query()
  // ---------------------------------------------------------------------------

  describe('query()', () => {
    it('returns a SQLiteQueryBuilder scoped to the table', () => {
      const repo = makeRepo(mockDb);
      const qb = repo.query();

      expect(qb).toBeDefined();
      expect(typeof qb.where).toBe('function');

      const { sql } = qb.toSQL();
      expect(sql).toBe('SELECT * FROM users');
    });
  });
});
