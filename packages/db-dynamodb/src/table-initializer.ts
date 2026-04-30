import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
  ScalarAttributeType,
} from '@aws-sdk/client-dynamodb';
import { DynamoEntityDefinition, DynamoGSI } from '@foxframework/core';

export class TableInitializer {
  constructor(private readonly client: DynamoDBClient) {}

  async ensureTables(entities: DynamoEntityDefinition[]): Promise<void> {
    for (const entity of entities) {
      await this.ensureTable(entity);
    }
  }

  private async ensureTable(entity: DynamoEntityDefinition): Promise<void> {
    try {
      await this.client.send(new DescribeTableCommand({ TableName: entity.tableName }));
      // Table exists, nothing to do
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        await this.createTable(entity);
        await waitUntilTableExists(
          { client: this.client, maxWaitTime: 60 },
          { TableName: entity.tableName },
        );
      } else {
        throw err;
      }
    }
  }

  private async createTable(entity: DynamoEntityDefinition): Promise<void> {
    const keySchema: Array<{ AttributeName: string; KeyType: 'HASH' | 'RANGE' }> = [
      { AttributeName: entity.partitionKey.name, KeyType: 'HASH' as const },
    ];
    const attributeDefinitions: Array<{ AttributeName: string; AttributeType: ScalarAttributeType }> = [
      { AttributeName: entity.partitionKey.name, AttributeType: entity.partitionKey.type as ScalarAttributeType },
    ];

    if (entity.sortKey) {
      keySchema.push({ AttributeName: entity.sortKey.name, KeyType: 'RANGE' as const });
      attributeDefinitions.push({ AttributeName: entity.sortKey.name, AttributeType: entity.sortKey.type as ScalarAttributeType });
    }

    const billing = entity.billing ?? 'PAY_PER_REQUEST';

    const gsis = (entity.globalSecondaryIndexes ?? []).map((gsi) =>
      this.buildGSI(gsi, attributeDefinitions),
    );

    await this.client.send(
      new CreateTableCommand({
        TableName: entity.tableName,
        KeySchema: keySchema,
        AttributeDefinitions: attributeDefinitions,
        BillingMode: billing,
        ...(billing === 'PROVISIONED'
          ? {
              ProvisionedThroughput: {
                ReadCapacityUnits: entity.readCapacity ?? 5,
                WriteCapacityUnits: entity.writeCapacity ?? 5,
              },
            }
          : {}),
        ...(gsis.length > 0 ? { GlobalSecondaryIndexes: gsis } : {}),
      }),
    );
  }

  private buildGSI(
    gsi: DynamoGSI,
    attrDefs: Array<{ AttributeName: string; AttributeType: ScalarAttributeType }>,
  ): any {
    const keySchema: any[] = [{ AttributeName: gsi.partitionKey.name, KeyType: 'HASH' }];
    if (!attrDefs.find((a) => a.AttributeName === gsi.partitionKey.name)) {
      attrDefs.push({ AttributeName: gsi.partitionKey.name, AttributeType: gsi.partitionKey.type as ScalarAttributeType });
    }
    if (gsi.sortKey) {
      keySchema.push({ AttributeName: gsi.sortKey.name, KeyType: 'RANGE' });
      if (!attrDefs.find((a) => a.AttributeName === gsi.sortKey!.name)) {
        attrDefs.push({ AttributeName: gsi.sortKey.name, AttributeType: gsi.sortKey.type as ScalarAttributeType });
      }
    }
    return {
      IndexName: gsi.indexName,
      KeySchema: keySchema,
      Projection: { ProjectionType: 'ALL' },
      ...(gsi.billing === 'PROVISIONED'
        ? {
            ProvisionedThroughput: {
              ReadCapacityUnits: gsi.readCapacity ?? 5,
              WriteCapacityUnits: gsi.writeCapacity ?? 5,
            },
          }
        : {}),
    };
  }
}
