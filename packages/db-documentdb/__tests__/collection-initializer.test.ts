import { CollectionInitializer } from '../src/collection-initializer';
import { CollectionDefinition } from '@foxframework/core';

function makeMockDb() {
  const mockCollection = {
    createIndex: jest.fn().mockResolvedValue('index_name'),
  };
  const mockDb = {
    listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    createCollection: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn().mockReturnValue(mockCollection),
  };
  return { mockDb, mockCollection };
}

describe('CollectionInitializer', () => {
  it('creates collection when it does not exist', async () => {
    const { mockDb } = makeMockDb();
    const initializer = new CollectionInitializer(() => mockDb as any);
    const entities: CollectionDefinition[] = [{ name: 'users' }];

    await initializer.ensureCollections(entities);

    expect(mockDb.listCollections).toHaveBeenCalledWith({ name: 'users' });
    expect(mockDb.createCollection).toHaveBeenCalledWith('users');
  });

  it('skips createCollection when collection already exists', async () => {
    const { mockDb } = makeMockDb();
    mockDb.listCollections.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([{ name: 'users' }]),
    });
    const initializer = new CollectionInitializer(() => mockDb as any);

    await initializer.ensureCollections([{ name: 'users' }]);

    expect(mockDb.createCollection).not.toHaveBeenCalled();
  });

  it('creates indexes when defined', async () => {
    const { mockDb, mockCollection } = makeMockDb();
    const initializer = new CollectionInitializer(() => mockDb as any);
    const entities: CollectionDefinition[] = [
      {
        name: 'orders',
        indexes: [
          { fields: { userId: 1 }, unique: false, name: 'idx_userId' },
          { fields: { createdAt: -1 }, unique: true, name: 'idx_createdAt' },
        ],
      },
    ];

    await initializer.ensureCollections(entities);

    expect(mockCollection.createIndex).toHaveBeenCalledTimes(2);
    expect(mockCollection.createIndex).toHaveBeenCalledWith(
      { userId: 1 },
      { unique: false, name: 'idx_userId' }
    );
    expect(mockCollection.createIndex).toHaveBeenCalledWith(
      { createdAt: -1 },
      { unique: true, name: 'idx_createdAt' }
    );
  });

  it('processes multiple entities', async () => {
    const { mockDb } = makeMockDb();
    const initializer = new CollectionInitializer(() => mockDb as any);
    const entities: CollectionDefinition[] = [
      { name: 'users' },
      { name: 'orders' },
      { name: 'products' },
    ];

    await initializer.ensureCollections(entities);

    expect(mockDb.createCollection).toHaveBeenCalledTimes(3);
    expect(mockDb.createCollection).toHaveBeenCalledWith('users');
    expect(mockDb.createCollection).toHaveBeenCalledWith('orders');
    expect(mockDb.createCollection).toHaveBeenCalledWith('products');
  });

  it('handles entities with no indexes', async () => {
    const { mockDb, mockCollection } = makeMockDb();
    const initializer = new CollectionInitializer(() => mockDb as any);

    await initializer.ensureCollections([{ name: 'sessions' }]);

    expect(mockDb.createCollection).toHaveBeenCalledWith('sessions');
    expect(mockCollection.createIndex).not.toHaveBeenCalled();
  });
});
