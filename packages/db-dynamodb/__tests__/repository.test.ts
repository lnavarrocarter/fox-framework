import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../src/repository';

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn().mockReturnValue({ send: jest.fn() }) },
  GetCommand: jest.fn().mockImplementation((input) => ({ input })),
  PutCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteCommand: jest.fn().mockImplementation((input) => ({ input })),
  QueryCommand: jest.fn().mockImplementation((input) => ({ input })),
  ScanCommand: jest.fn().mockImplementation((input) => ({ input })),
  BatchWriteCommand: jest.fn().mockImplementation((input) => ({ input })),
  BatchGetCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const { PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand, BatchGetCommand } =
  jest.requireMock('@aws-sdk/lib-dynamodb');

describe('DynamoRepository', () => {
  let docClient: DynamoDBDocumentClient;
  let repo: DynamoRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    docClient = DynamoDBDocumentClient.from({} as any);
    mockSend = (docClient as any).send as jest.Mock;
    repo = new DynamoRepository('MyTable', docClient);
  });

  it('put(item) sends PutCommand with correct TableName and Item', async () => {
    mockSend.mockResolvedValueOnce({});
    await repo.put({ pk: 'abc', value: 1 });

    expect(PutCommand).toHaveBeenCalledWith({ TableName: 'MyTable', Item: { pk: 'abc', value: 1 } });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('get(key) sends GetCommand and returns Item', async () => {
    mockSend.mockResolvedValueOnce({ Item: { pk: 'abc', value: 1 } });

    const result = await repo.get({ pk: 'abc' });

    expect(GetCommand).toHaveBeenCalledWith(
      expect.objectContaining({ TableName: 'MyTable', Key: { pk: 'abc' } }),
    );
    expect(result).toEqual({ pk: 'abc', value: 1 });
  });

  it('get(key) returns null when Item is undefined', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await repo.get({ pk: 'missing' });
    expect(result).toBeNull();
  });

  it('get(key, { consistentRead: true }) passes ConsistentRead', async () => {
    mockSend.mockResolvedValueOnce({ Item: { pk: 'abc' } });
    await repo.get({ pk: 'abc' }, { consistentRead: true });

    expect(GetCommand).toHaveBeenCalledWith(
      expect.objectContaining({ ConsistentRead: true }),
    );
  });

  it('delete(key) sends DeleteCommand', async () => {
    mockSend.mockResolvedValueOnce({});
    await repo.delete({ pk: 'abc' });

    expect(DeleteCommand).toHaveBeenCalledWith({ TableName: 'MyTable', Key: { pk: 'abc' } });
  });

  it('query(options) sends QueryCommand with all options and returns result', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [{ pk: 'a' }, { pk: 'b' }],
      Count: 2,
      LastEvaluatedKey: { pk: 'b' },
    });

    const result = await repo.query({
      keyConditionExpression: 'pk = :pk',
      expressionAttributeValues: { ':pk': 'a' },
      limit: 10,
      indexName: 'myIndex',
    });

    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'MyTable',
        KeyConditionExpression: 'pk = :pk',
        Limit: 10,
        IndexName: 'myIndex',
      }),
    );
    expect(result).toEqual({
      items: [{ pk: 'a' }, { pk: 'b' }],
      count: 2,
      lastEvaluatedKey: { pk: 'b' },
    });
  });

  it('scan() sends ScanCommand and returns all items', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ pk: 'x' }], Count: 1 });

    const result = await repo.scan();

    expect(ScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({ TableName: 'MyTable' }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.count).toBe(1);
  });

  it('scan({ filterExpression }) includes FilterExpression', async () => {
    mockSend.mockResolvedValueOnce({ Items: [], Count: 0 });

    await repo.scan({ filterExpression: 'attr = :val', expressionAttributeValues: { ':val': 1 } });

    expect(ScanCommand).toHaveBeenCalledWith(
      expect.objectContaining({ FilterExpression: 'attr = :val' }),
    );
  });

  it('batchPut with ≤25 items sends single BatchWriteCommand', async () => {
    mockSend.mockResolvedValueOnce({});
    const items = Array.from({ length: 25 }, (_, i) => ({ pk: `item-${i}` }));

    await repo.batchPut(items);

    expect(BatchWriteCommand).toHaveBeenCalledTimes(1);
  });

  it('batchPut with 26 items sends two BatchWriteCommands', async () => {
    mockSend.mockResolvedValue({});
    const items = Array.from({ length: 26 }, (_, i) => ({ pk: `item-${i}` }));

    await repo.batchPut(items);

    expect(BatchWriteCommand).toHaveBeenCalledTimes(2);
  });

  it('batchGet sends BatchGetCommand and returns flattened items', async () => {
    mockSend.mockResolvedValueOnce({ Responses: { MyTable: [{ pk: 'a' }, { pk: 'b' }] } });
    const keys = [{ pk: 'a' }, { pk: 'b' }];

    const result = await repo.batchGet(keys);

    expect(BatchGetCommand).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ pk: 'a' }, { pk: 'b' }]);
  });

  it('batchGet with 101 keys sends two BatchGetCommands', async () => {
    mockSend.mockResolvedValue({ Responses: { MyTable: [] } });
    const keys = Array.from({ length: 101 }, (_, i) => ({ pk: `k-${i}` }));

    await repo.batchGet(keys);

    expect(BatchGetCommand).toHaveBeenCalledTimes(2);
  });
});
