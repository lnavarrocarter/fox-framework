import { Db } from 'mongodb';
import { CollectionDefinition } from '@foxframework/core';

export class CollectionInitializer {
  constructor(private readonly getDb: () => Db) {}

  async ensureCollections(entities: CollectionDefinition[]): Promise<void> {
    for (const entity of entities) {
      await this.ensureCollection(entity);
    }
  }

  private async ensureCollection(entity: CollectionDefinition): Promise<void> {
    const db = this.getDb();
    // Check if collection exists
    const existing = await db.listCollections({ name: entity.name }).toArray();
    if (existing.length === 0) {
      await db.createCollection(entity.name);
    }
    // Ensure indexes
    const collection = db.collection(entity.name);
    for (const idx of entity.indexes ?? []) {
      await collection.createIndex(idx.fields, {
        unique: idx.unique ?? false,
        name: idx.name,
      });
    }
  }
}
