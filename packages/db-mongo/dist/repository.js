"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRepository = void 0;
const mongodb_1 = require("mongodb");
class MongoRepository {
    constructor(getCollection) {
        this.getCollection = getCollection;
    }
    async findById(id) {
        const doc = await this.getCollection().findOne({ _id: new mongodb_1.ObjectId(id) });
        return doc ? this.serialize(doc) : null;
    }
    async findOne(filter = {}) {
        const doc = await this.getCollection().findOne(filter);
        return doc ? this.serialize(doc) : null;
    }
    async findAll(options = {}) {
        const { filter = {}, sort, limit, skip, projection } = options;
        let cursor = this.getCollection().find(filter);
        if (sort)
            cursor = cursor.sort(sort);
        if (skip !== undefined)
            cursor = cursor.skip(skip);
        if (limit !== undefined)
            cursor = cursor.limit(limit);
        if (projection)
            cursor = cursor.project(projection);
        const docs = await cursor.toArray();
        return docs.map((doc) => this.serialize(doc));
    }
    async create(data) {
        const result = await this.getCollection().insertOne(data);
        return this.findById(result.insertedId.toString());
    }
    async update(id, data) {
        await this.getCollection().updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: data });
        return this.findById(id);
    }
    async delete(id) {
        const result = await this.getCollection().deleteOne({ _id: new mongodb_1.ObjectId(id) });
        return result.deletedCount > 0;
    }
    async count(filter = {}) {
        return this.getCollection().countDocuments(filter);
    }
    serialize(doc) {
        const { _id, ...rest } = doc;
        return { ...rest, id: _id.toString() };
    }
}
exports.MongoRepository = MongoRepository;
//# sourceMappingURL=repository.js.map