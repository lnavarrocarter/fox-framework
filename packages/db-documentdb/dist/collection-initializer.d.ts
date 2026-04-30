import { Db } from 'mongodb';
import { CollectionDefinition } from '@foxframework/core';
export declare class CollectionInitializer {
    private readonly getDb;
    constructor(getDb: () => Db);
    ensureCollections(entities: CollectionDefinition[]): Promise<void>;
    private ensureCollection;
}
//# sourceMappingURL=collection-initializer.d.ts.map