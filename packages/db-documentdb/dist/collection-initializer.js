"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionInitializer = void 0;
class CollectionInitializer {
    constructor(getDb) {
        this.getDb = getDb;
    }
    async ensureCollections(entities) {
        for (const entity of entities) {
            await this.ensureCollection(entity);
        }
    }
    async ensureCollection(entity) {
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
exports.CollectionInitializer = CollectionInitializer;
//# sourceMappingURL=collection-initializer.js.map