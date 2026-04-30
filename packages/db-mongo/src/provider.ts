import { MongoClient, Db } from 'mongodb';
import { IMongoProvider, IMongoRepository } from '@foxframework/core';
import { MongoRepository } from './repository';

export class MongoProvider implements IMongoProvider {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private _isConnected = false;

  constructor(private readonly uri: string, private readonly dbName: string) {}

  async connect(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoClient: MC } = require('mongodb') as { MongoClient: typeof MongoClient };
    this.client = new MC(this.uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    this._isConnected = false;
  }

  collection<T extends Record<string, unknown>>(name: string): IMongoRepository<T> {
    if (!this.db) {
      throw new Error('MongoProvider is not connected. Call connect() first.');
    }
    return new MongoRepository<T>(() => this.db!.collection<T>(name));
  }

  get isConnected(): boolean {
    return this._isConnected;
  }
}
