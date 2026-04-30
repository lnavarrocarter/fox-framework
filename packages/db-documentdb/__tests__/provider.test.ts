import { DocumentDbProvider } from '../src/provider';
import { DocumentDbConfig } from '@foxframework/core';

jest.mock('@foxframework/db-mongo');

import { MongoProvider } from '@foxframework/db-mongo';

const MockMongoProvider = MongoProvider as jest.MockedClass<typeof MongoProvider>;

const mockCollection = {
  createIndex: jest.fn().mockResolvedValue('index_name'),
};
const mockDb = {
  listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
  createCollection: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn().mockReturnValue(mockCollection),
};

const mockInnerProvider = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn().mockReturnValue({}),
  isConnected: true,
  db: mockDb,
};

MockMongoProvider.mockImplementation(() => mockInnerProvider as any);

function makeConfig(overrides: Partial<DocumentDbConfig> = {}): DocumentDbConfig {
  return {
    uri: 'mongodb://user:pass@localhost:27017/mydb',
    database: 'mydb',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInnerProvider.connect.mockResolvedValue(undefined);
  mockInnerProvider.disconnect.mockResolvedValue(undefined);
  mockInnerProvider.collection.mockReturnValue({});
  mockDb.listCollections.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
  mockDb.createCollection.mockResolvedValue(undefined);
  mockDb.collection.mockReturnValue(mockCollection);
  mockCollection.createIndex.mockResolvedValue('index_name');
});

describe('DocumentDbProvider', () => {
  it('creates MongoProvider with TLS URI when tls is not false', async () => {
    const config = makeConfig();
    const provider = new DocumentDbProvider(config);
    await provider.connect();

    const constructedUri = MockMongoProvider.mock.calls[0][0] as string;
    const url = new URL(constructedUri);
    expect(url.searchParams.get('tls')).toBe('true');
    expect(url.searchParams.get('retryWrites')).toBe('false');
    expect(url.searchParams.get('readPreference')).toBe('secondaryPreferred');
  });

  it('creates MongoProvider with unchanged URI when tls=false', async () => {
    const config = makeConfig({ tls: false });
    const provider = new DocumentDbProvider(config);
    await provider.connect();

    const constructedUri = MockMongoProvider.mock.calls[0][0] as string;
    expect(constructedUri).toBe('mongodb://user:pass@localhost:27017/mydb');
  });

  it('calls inner connect()', async () => {
    const provider = new DocumentDbProvider(makeConfig());
    await provider.connect();
    expect(mockInnerProvider.connect).toHaveBeenCalledTimes(1);
  });

  it('sets isConnected to true after connect()', async () => {
    const provider = new DocumentDbProvider(makeConfig());
    expect(provider.isConnected).toBe(false);
    await provider.connect();
    expect(provider.isConnected).toBe(true);
  });

  it('calls CollectionInitializer when entities are provided', async () => {
    const config = makeConfig({
      entities: [{ name: 'users' }, { name: 'orders' }],
    });
    const provider = new DocumentDbProvider(config);
    await provider.connect();

    expect(mockDb.listCollections).toHaveBeenCalledTimes(2);
    expect(mockDb.createCollection).toHaveBeenCalledWith('users');
    expect(mockDb.createCollection).toHaveBeenCalledWith('orders');
  });

  it('does not call CollectionInitializer when no entities', async () => {
    const config = makeConfig({ entities: [] });
    const provider = new DocumentDbProvider(config);
    await provider.connect();

    expect(mockDb.listCollections).not.toHaveBeenCalled();
    expect(mockDb.createCollection).not.toHaveBeenCalled();
  });

  it('delegates disconnect to inner provider', async () => {
    const provider = new DocumentDbProvider(makeConfig());
    await provider.connect();
    await provider.disconnect();

    expect(mockInnerProvider.disconnect).toHaveBeenCalledTimes(1);
    expect(provider.isConnected).toBe(false);
  });

  it('delegates collection() to inner provider', async () => {
    const provider = new DocumentDbProvider(makeConfig());
    await provider.connect();
    provider.collection('users');

    expect(mockInnerProvider.collection).toHaveBeenCalledWith('users');
  });

  it('throws error when collection() called before connect()', () => {
    const provider = new DocumentDbProvider(makeConfig());
    expect(() => provider.collection('users')).toThrow(
      'DocumentDbProvider is not connected. Call connect() first.'
    );
  });
});
