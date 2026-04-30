import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  IDynamoRepository,
  DynamoItem,
  DynamoGetOptions,
  DynamoQueryOptions,
  DynamoScanOptions,
  DynamoQueryResult,
} from '@foxframework/core';

export class DynamoRepository<T extends DynamoItem = DynamoItem> implements IDynamoRepository<T> {
  constructor(
    private readonly tableName: string,
    private readonly client: DynamoDBDocumentClient,
  ) {}

  async put(item: T): Promise<void> {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  async get(key: DynamoItem, options: DynamoGetOptions = {}): Promise<T | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
        ConsistentRead: options.consistentRead,
        ProjectionExpression: options.projectionExpression,
      }),
    );
    return (result.Item as T) ?? null;
  }

  async delete(key: DynamoItem): Promise<void> {
    await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: key }));
  }

  async query(options: DynamoQueryOptions): Promise<DynamoQueryResult<T>> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: options.indexName,
        KeyConditionExpression: options.keyConditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        FilterExpression: options.filterExpression,
        Limit: options.limit,
        ScanIndexForward: options.scanIndexForward,
        ExclusiveStartKey: options.exclusiveStartKey,
      }),
    );
    return {
      items: (result.Items as T[]) ?? [],
      count: result.Count ?? 0,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async scan(options: DynamoScanOptions = {}): Promise<DynamoQueryResult<T>> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
      }),
    );
    return {
      items: (result.Items as T[]) ?? [],
      count: result.Count ?? 0,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async batchPut(items: T[]): Promise<void> {
    const chunks = this.chunk(items, 25);
    for (const chunk of chunks) {
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
          },
        }),
      );
    }
  }

  async batchGet(
    keys: DynamoItem[],
    options: Pick<DynamoGetOptions, 'consistentRead'> = {},
  ): Promise<T[]> {
    const results: T[] = [];
    const chunks = this.chunk(keys, 100);
    for (const chunk of chunks) {
      const result = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: chunk,
              ConsistentRead: options.consistentRead,
            },
          },
        }),
      );
      const items = (result.Responses?.[this.tableName] as T[]) ?? [];
      results.push(...items);
    }
    return results;
  }

  private chunk<U>(arr: U[], size: number): U[][] {
    const chunks: U[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
