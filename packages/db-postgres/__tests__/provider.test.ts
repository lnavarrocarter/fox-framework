import { Pool } from 'pg';
import { PostgresProvider } from '../src/provider';
import { createMockPool } from './helpers/pg-mock';

jest.mock('pg');

const MockPool = Pool as jest.MockedClass<typeof Pool>;

describe('PostgresProvider', () => {
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    MockPool.mockImplementation(() => mockPool as unknown as Pool);
  });

  // ---------------------------------------------------------------------------
  // connect / disconnect
  // ---------------------------------------------------------------------------

  describe('connect()', () => {
    it('creates a Pool with the provided config', async () => {
      const provider = new PostgresProvider({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'admin',
        password: 'secret',
      });

      await provider.connect();

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          user: 'admin',
          password: 'secret',
        }),
      );
      expect(provider.isConnected).toBe(true);
    });

    it('acquires and releases a test connection on connect', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
    });

    it('uses pool config overrides when supplied', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
        pool: { min: 5, max: 20, idleTimeoutMillis: 60_000 },
      });
      await provider.connect();

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({ min: 5, max: 20, idleTimeoutMillis: 60_000 }),
      );
    });
  });

  describe('disconnect()', () => {
    it('calls pool.end() and marks as disconnected', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();
      await provider.disconnect();

      expect(mockPool.end).toHaveBeenCalledTimes(1);
      expect(provider.isConnected).toBe(false);
    });

    it('is safe to call disconnect() without prior connect()', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
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
      mockPool.query.mockResolvedValueOnce({ rows, rowCount: 1 });

      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const result = await provider.raw<{ id: number; name: string }>(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(1);
    });

    it('throws if called before connect()', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });

      await expect(provider.raw('SELECT 1')).rejects.toThrow(
        'PostgresProvider is not connected',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // repository() / queryBuilder()
  // ---------------------------------------------------------------------------

  describe('repository()', () => {
    it('returns a PostgresRepository bound to the given table', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const repo = provider.repository<{ id: number }>('users');
      expect(repo).toBeDefined();
      expect(typeof repo.findById).toBe('function');
    });
  });

  describe('queryBuilder()', () => {
    it('returns a PostgresQueryBuilder', async () => {
      const provider = new PostgresProvider({
        host: 'localhost', port: 5432,
        database: 'testdb', user: 'admin', password: 'secret',
      });
      await provider.connect();

      const qb = provider.queryBuilder();
      expect(qb).toBeDefined();
      expect(typeof qb.from).toBe('function');
    });
  });
});
