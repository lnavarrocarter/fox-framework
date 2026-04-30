import { DocumentDbConfig, IMongoProvider, IMongoRepository } from '@foxframework/core';
import { MongoProvider } from '@foxframework/db-mongo';
import { buildDocumentDbUri } from './connection-builder';
import { CollectionInitializer } from './collection-initializer';

export class DocumentDbProvider implements IMongoProvider {
  private inner: MongoProvider | null = null;
  private _isConnected = false;

  constructor(private readonly config: DocumentDbConfig) {}

  async connect(): Promise<void> {
    const uri = buildDocumentDbUri(this.config);
    this.inner = new MongoProvider(uri, this.config.database);
    await this.inner.connect();
    this._isConnected = true;

    // Auto-create collections
    if (this.config.entities?.length) {
      const initializer = new CollectionInitializer(() => (this.inner as any).db);
      await initializer.ensureCollections(this.config.entities);
    }
  }

  async disconnect(): Promise<void> {
    await this.inner?.disconnect();
    this._isConnected = false;
  }

  collection<T extends Record<string, unknown>>(name: string): IMongoRepository<T> {
    if (!this.inner) {
      throw new Error('DocumentDbProvider is not connected. Call connect() first.');
    }
    return this.inner.collection<T>(name);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }
}
