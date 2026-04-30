import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TableInitializer } from '../src/table-initializer';
import { DynamoEntityDefinition } from '@foxframework/core';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  DescribeTableCommand: jest.fn().mockImplementation((input) => ({ input })),
  CreateTableCommand: jest.fn().mockImplementation((input) => ({ input })),
  waitUntilTableExists: jest.fn().mockResolvedValue(undefined),
  ResourceNotFoundException: class ResourceNotFoundException extends Error {
    constructor() {
      super('ResourceNotFoundException');
      this.name = 'ResourceNotFoundException';
    }
  },
}));

const { waitUntilTableExists, CreateTableCommand } = jest.requireMock('@aws-sdk/client-dynamodb');

describe('TableInitializer', () => {
  let client: DynamoDBClient;
  let initializer: TableInitializer;

  beforeEach(() => {
    client = new DynamoDBClient({});
    initializer = new TableInitializer(client);
  });

  const baseEntity: DynamoEntityDefinition = {
    tableName: 'TestTable',
    partitionKey: { name: 'pk', type: 'S' },
  };

  it('skips CreateTable when table already exists', async () => {
    mockSend.mockResolvedValueOnce({}); // DescribeTable succeeds

    await initializer.ensureTables([baseEntity]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(CreateTableCommand).not.toHaveBeenCalled();
    expect(waitUntilTableExists).not.toHaveBeenCalled();
  });

  it('creates table and waits when ResourceNotFoundException is thrown', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err); // DescribeTable fails
    mockSend.mockResolvedValueOnce({}); // CreateTable succeeds

    await initializer.ensureTables([baseEntity]);

    expect(CreateTableCommand).toHaveBeenCalled();
    expect(waitUntilTableExists).toHaveBeenCalledWith(
      { client, maxWaitTime: 60 },
      { TableName: 'TestTable' },
    );
  });

  it('uses PAY_PER_REQUEST billing (no ProvisionedThroughput)', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([{ ...baseEntity, billing: 'PAY_PER_REQUEST' }]);

    const createInput = CreateTableCommand.mock.calls[0][0];
    expect(createInput.BillingMode).toBe('PAY_PER_REQUEST');
    expect(createInput.ProvisionedThroughput).toBeUndefined();
  });

  it('uses PROVISIONED billing with ProvisionedThroughput', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([
      { ...baseEntity, billing: 'PROVISIONED', readCapacity: 10, writeCapacity: 20 },
    ]);

    const createInput = CreateTableCommand.mock.calls[0][0];
    expect(createInput.BillingMode).toBe('PROVISIONED');
    expect(createInput.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 20,
    });
  });

  it('includes sortKey in KeySchema when defined', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([
      { ...baseEntity, sortKey: { name: 'sk', type: 'S' } },
    ]);

    const createInput = CreateTableCommand.mock.calls[0][0];
    expect(createInput.KeySchema).toContainEqual({ AttributeName: 'sk', KeyType: 'RANGE' });
    expect(createInput.AttributeDefinitions).toContainEqual({ AttributeName: 'sk', AttributeType: 'S' });
  });

  it('includes GSI in CreateTable when defined', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([
      {
        ...baseEntity,
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: { name: 'gsiPk', type: 'S' },
          },
        ],
      },
    ]);

    const createInput = CreateTableCommand.mock.calls[0][0];
    expect(createInput.GlobalSecondaryIndexes).toHaveLength(1);
    expect(createInput.GlobalSecondaryIndexes[0].IndexName).toBe('gsi1');
  });

  it('adds attribute definitions for GSI keys', async () => {
    const err = new Error('ResourceNotFoundException');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([
      {
        ...baseEntity,
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: { name: 'gsiPk', type: 'N' },
            sortKey: { name: 'gsiSk', type: 'S' },
          },
        ],
      },
    ]);

    const createInput = CreateTableCommand.mock.calls[0][0];
    expect(createInput.AttributeDefinitions).toContainEqual({ AttributeName: 'gsiPk', AttributeType: 'N' });
    expect(createInput.AttributeDefinitions).toContainEqual({ AttributeName: 'gsiSk', AttributeType: 'S' });
  });

  it('re-throws errors other than ResourceNotFoundException', async () => {
    const err = new Error('SomeOtherError');
    err.name = 'SomeOtherError';
    mockSend.mockRejectedValueOnce(err);

    await expect(initializer.ensureTables([baseEntity])).rejects.toThrow('SomeOtherError');
  });

  it('processes multiple entities', async () => {
    // Both tables exist
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    await initializer.ensureTables([
      baseEntity,
      { tableName: 'Table2', partitionKey: { name: 'id', type: 'S' } },
    ]);

    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
