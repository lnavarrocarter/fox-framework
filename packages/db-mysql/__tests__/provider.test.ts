import { MySQLProvider } from '../src/provider';
import { createMockPool, MockPool } from './helpers/mysql-mock';

jest.mock('mysql2/promise');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mysql2 = require('mysql2/promise') as { createPool: jest.Mock };

describe('MySQLProvider', () => {
  let mockPool: MockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    mysql2.createPool = jest.fn().mockReturnValue(mockPool);
  });

  // ---------------------------------------------------------------------------
  // connect / disconnect
  // ---------------------------------------------------------------------------

  describe('connect()', () => {
    it('creates a pool with the provided config', async () => {
      const provider = new MySQLProvider({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'admin',
        password: 'secret',
      });

      await provider.connect();

      expect(mysql2.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          user: 'admin',
          password: 'secret',
        }),
      );
      expect(provider.isConnected).toBe(true);
    });

    it('acquires and releases a test connection on connect', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();
      expect(mockPool.getConnection).toHaveBeenCalledTimes(1);
    });

    it('uses pool config overrides when supplied', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
        pool: { min: 5, max: 20, idleTimeoutMillis: 60_000 },
      });
      await provider.connect();

      expect(mysql2.createPool).toHaveBeenCalledWith(
        expect.objectContaining({ connectionLimit: 20 }),
      );
    });
  });

  describe('disconnect()', () => {
    it('calls pool.end() and marks as disconnected', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();
      await provider.disconnect();

      expect(mockPool.end).toHaveBeenCalledTimes(1);
      expect(provider.isConnected).toBe(false);
    });

    it('is safe to call disconnect() without prior connect()', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await expect(provider.disconnect()).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // raw()
  // ---------------------------------------------------------------------------

  describe('raw()', () => {
    it('executes a parameterised query and returns rows', async () => {
      const rows = [{ id: 1, name: 'Alice' }];
      mockPool.execute.mockResolvedValueOnce([rows, []]);

      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const result = await provider.raw<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = ?',
        [1],
      );

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1],
      );
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('throws if called before connect()', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });

      await expect(provider.raw('SELECT 1')).rejects.toThrow(
        'MySQLProvider is not connected',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // repository() / queryBuilder()
  // ---------------------------------------------------------------------------

  describe('repository()', () => {
    it('returns a MySQLRepository bound to the given table', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const repo = provider.repository<{ id: number; name: string }>('users');
      expect(repo).toBeDefined();
      expect(typeof repo.findById).toBe('function');
    });
  });

  describe('queryBuilder()', () => {
    it('returns a MySQLQueryBuilder', async () => {
      const provider = new MySQLProvider({
        host: 'localhost', port: 3306,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const qb = provider.queryBuilder();
      expect(qb).toBeDefined();
      expect(typeof qb.from).toBe('function');
    });
  });
});
