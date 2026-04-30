import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IDynamoProvider, IDynamoRepository, DynamoDbConfig, DynamoItem } from '@foxframework/core';
import { TableInitializer } from './table-initializer';
import { DynamoRepository } from './repository';

export class DynamoProvider implements IDynamoProvider {
  private dynamoClient: DynamoDBClient | null = null;
  private docClient: DynamoDBDocumentClient | null = null;
  private _isConnected = false;

  constructor(private readonly config: DynamoDbConfig) {}

  async connect(): Promise<void> {
    const clientConfig: any = { region: this.config.region };
    if (this.config.endpoint) clientConfig.endpoint = this.config.endpoint;
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        ...(this.config.sessionToken ? { sessionToken: this.config.sessionToken } : {}),
      };
    }

    this.dynamoClient = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(this.dynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    });

    if (this.config.entities?.length) {
      const initializer = new TableInitializer(this.dynamoClient);
      await initializer.ensureTables(this.config.entities);
    }

    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.dynamoClient?.destroy();
    this.dynamoClient = null;
    this.docClient = null;
    this._isConnected = false;
  }

  table<T extends DynamoItem = DynamoItem>(tableName: string): IDynamoRepository<T> {
    if (!this.docClient) {
      throw new Error('DynamoProvider is not connected. Call connect() first.');
    }
    return new DynamoRepository<T>(tableName, this.docClient);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }
}
