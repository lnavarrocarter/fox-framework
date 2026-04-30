const mockSend = jest.fn();
const mockDestroy = jest.fn();
const mockEnsureTables = jest.fn().mockResolvedValue(undefined);

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockSend, destroy: mockDestroy })),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: mockSend }),
  },
}));

jest.mock('../src/table-initializer', () => ({
  TableInitializer: jest.fn().mockImplementation(() => ({
    ensureTables: mockEnsureTables,
  })),
}));

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoProvider } from '../src/provider';
import { DynamoRepository } from '../src/repository';
import { TableInitializer } from '../src/table-initializer';

describe('DynamoProvider', () => {
  it('connect() creates DynamoDBClient with correct region', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });
    await provider.connect();

    expect(DynamoDBClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1' }));
  });

  it('connect() with endpoint passes endpoint', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1', endpoint: 'http://localhost:8000' });
    await provider.connect();

    expect(DynamoDBClient).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'http://localhost:8000' }),
    );
  });

  it('connect() with credentials passes accessKeyId and secretAccessKey', async () => {
    const provider = new DynamoProvider({
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });
    await provider.connect();

    expect(DynamoDBClient).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: expect.objectContaining({
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        }),
      }),
    );
  });

  it('connect() with entities calls TableInitializer.ensureTables', async () => {
    const entities = [{ tableName: 'T1', partitionKey: { name: 'pk', type: 'S' as const } }];
    const provider = new DynamoProvider({ region: 'us-east-1', entities });
    await provider.connect();

    expect(TableInitializer).toHaveBeenCalled();
    expect(mockEnsureTables).toHaveBeenCalledWith(entities);
  });

  it('connect() without entities does not call TableInitializer', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });
    await provider.connect();

    expect(TableInitializer).not.toHaveBeenCalled();
  });

  it('disconnect() calls client.destroy()', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });
    await provider.connect();
    await provider.disconnect();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it('table() returns DynamoRepository instance', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });
    await provider.connect();

    const repo = provider.table('MyTable');
    expect(repo).toBeInstanceOf(DynamoRepository);
  });

  it('table() throws if not connected', () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });

    expect(() => provider.table('MyTable')).toThrow('DynamoProvider is not connected');
  });

  it('isConnected reflects connection state', async () => {
    const provider = new DynamoProvider({ region: 'us-east-1' });
    expect(provider.isConnected).toBe(false);

    await provider.connect();
    expect(provider.isConnected).toBe(true);

    await provider.disconnect();
    expect(provider.isConnected).toBe(false);
  });
});
