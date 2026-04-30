import { Collection } from 'mongodb';
import { IMongoRepository, MongoFilter, MongoFindOptions } from '@foxframework/core';
export declare class MongoRepository<T extends Record<string, unknown>> implements IMongoRepository<T> {
    private readonly getCollection;
    constructor(getCollection: () => Collection<T>);
    findById(id: string): Promise<T | null>;
    findOne(filter?: MongoFilter<T>): Promise<T | null>;
    findAll(options?: MongoFindOptions<T>): Promise<T[]>;
    create(data: Omit<T, '_id'>): Promise<T>;
    update(id: string, data: Partial<Omit<T, '_id'>>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
    count(filter?: MongoFilter<T>): Promise<number>;
    private serialize;
}
//# sourceMappingURL=repository.d.ts.map