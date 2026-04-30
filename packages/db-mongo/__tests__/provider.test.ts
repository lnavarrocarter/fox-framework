import { MongoProvider } from '../src/provider';
import { createMockDb, createMockClient } from './helpers/mongo-mock';

jest.mock('mongodb');

describe('MongoProvider', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockClient = createMockClient(mockDb);
    const mongodb = require('mongodb');
    mongodb.MongoClient.mockImplementation(() => mockClient);
  });

  describe('connect()', () => {
    it('creates a MongoClient with the given URI and connects', async () => {
      const mongodb = require('mongodb');
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      await provider.connect();

      expect(mongodb.MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.db).toHaveBeenCalledWith('testdb');
    });

    it('sets isConnected to true after connecting', async () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      expect(provider.isConnected).toBe(false);
      await provider.connect();
      expect(provider.isConnected).toBe(true);
    });
  });

  describe('disconnect()', () => {
    it('calls client.close() and sets isConnected to false', async () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      await provider.connect();
      await provider.disconnect();

      expect(mockClient.close).toHaveBeenCalledTimes(1);
      expect(provider.isConnected).toBe(false);
    });

    it('does not throw if called when not connected', async () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      await expect(provider.disconnect()).resolves.toBeUndefined();
      expect(provider.isConnected).toBe(false);
    });
  });

  describe('collection()', () => {
    it('returns a MongoRepository instance when connected', async () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      await provider.connect();
      const repo = provider.collection('users');
      expect(repo).toBeDefined();
    });

    it('throws if not connected', () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      expect(() => provider.collection('users')).toThrow(
        'MongoProvider is not connected. Call connect() first.'
      );
    });
  });

  describe('isConnected', () => {
    it('starts as false', () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      expect(provider.isConnected).toBe(false);
    });

    it('is false after disconnect', async () => {
      const provider = new MongoProvider('mongodb://localhost:27017', 'testdb');
      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected).toBe(false);
    });
  });
});
