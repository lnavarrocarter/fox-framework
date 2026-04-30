import { SQLiteProvider } from '../src/provider';
import { createMockDb, createMockStatement } from './helpers/sqlite-mock';

jest.mock('better-sqlite3');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require('better-sqlite3') as jest.Mock;

describe('SQLiteProvider', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDb();
    // Default prepare -> statement that returns { '1': 1 } for SELECT 1
    mockDb.prepare.mockReturnValue(createMockStatement({ get: { '1': 1 } }));
    BetterSqlite3.mockImplementation(() => mockDb);
  });

  // ---------------------------------------------------------------------------
  // connect / disconnect
  // ---------------------------------------------------------------------------

  describe('connect()', () => {
    it('opens the database with the provided filename', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();

      expect(BetterSqlite3).toHaveBeenCalledWith(':memory:', { readonly: false });
      expect(provider.isConnected).toBe(true);
    });

    it('runs SELECT 1 to validate connection', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1');
    });

    it('respects readonly option', async () => {
      const provider = new SQLiteProvider({ filename: 'test.db', readonly: true });
      await provider.connect();

      expect(BetterSqlite3).toHaveBeenCalledWith('test.db', { readonly: true });
    });
  });

  describe('disconnect()', () => {
    it('calls db.close() and marks as disconnected', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();
      await provider.disconnect();

      expect(mockDb.close).toHaveBeenCalledTimes(1);
      expect(provider.isConnected).toBe(false);
    });

    it('is safe to call without prior connect()', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await expect(provider.disconnect()).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // raw()
  // ---------------------------------------------------------------------------

  describe('raw()', () => {
    it('executes a parameterised query and returns rows', async () => {
      const rows = [{ id: 1, name: 'Alice' }];
      const stmt = createMockStatement({ all: rows });
      mockDb.prepare.mockReturnValueOnce(createMockStatement({ get: { '1': 1 } })); // SELECT 1
      mockDb.prepare.mockReturnValueOnce(stmt);

      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();

      const result = await provider.raw<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = ?',
        [1],
      );

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?');
      expect(stmt.all).toHaveBeenCalledWith(1);
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('throws if called before connect()', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await expect(provider.raw('SELECT 1')).rejects.toThrow(
        'SQLiteProvider is not connected',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // repository() / queryBuilder()
  // ---------------------------------------------------------------------------

  describe('repository()', () => {
    it('returns a SQLiteRepository bound to the given table', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();

      const repo = provider.repository<{ id: number }>('users');
      expect(repo).toBeDefined();
      expect(typeof repo.findById).toBe('function');
    });
  });

  describe('queryBuilder()', () => {
    it('returns a SQLiteQueryBuilder', async () => {
      const provider = new SQLiteProvider({ filename: ':memory:' });
      await provider.connect();

      const qb = provider.queryBuilder();
      expect(qb).toBeDefined();
      expect(typeof qb.from).toBe('function');
    });
  });
});
