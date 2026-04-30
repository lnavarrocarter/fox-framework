import { Collection, ObjectId } from 'mongodb';
import { IMongoRepository, MongoFilter, MongoFindOptions } from '@foxframework/core';

export class MongoRepository<T extends Record<string, unknown>> implements IMongoRepository<T> {
  constructor(private readonly getCollection: () => Collection<T>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.getCollection().findOne({ _id: new ObjectId(id) } as any);
    return doc ? this.serialize(doc) : null;
  }

  async findOne(filter: MongoFilter<T> = {}): Promise<T | null> {
    const doc = await this.getCollection().findOne(filter as any);
    return doc ? this.serialize(doc) : null;
  }

  async findAll(options: MongoFindOptions<T> = {}): Promise<T[]> {
    const { filter = {}, sort, limit, skip, projection } = options;
    let cursor = this.getCollection().find(filter as any);
    if (sort) cursor = cursor.sort(sort as any);
    if (skip !== undefined) cursor = cursor.skip(skip);
    if (limit !== undefined) cursor = cursor.limit(limit);
    if (projection) cursor = cursor.project(projection as any);
    const docs = await cursor.toArray();
    return docs.map((doc) => this.serialize(doc));
  }

  async create(data: Omit<T, '_id'>): Promise<T> {
    const result = await this.getCollection().insertOne(data as any);
    return this.findById(result.insertedId.toString()) as Promise<T>;
  }

  async update(id: string, data: Partial<Omit<T, '_id'>>): Promise<T | null> {
    await this.getCollection().updateOne({ _id: new ObjectId(id) } as any, { $set: data } as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount > 0;
  }

  async count(filter: MongoFilter<T> = {}): Promise<number> {
    return this.getCollection().countDocuments(filter as any);
  }

  private serialize(doc: any): T {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toString() } as T;
  }
}
