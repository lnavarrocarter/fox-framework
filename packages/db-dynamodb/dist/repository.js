"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class DynamoRepository {
    constructor(tableName, client) {
        this.tableName = tableName;
        this.client = client;
    }
    async put(item) {
        await this.client.send(new lib_dynamodb_1.PutCommand({ TableName: this.tableName, Item: item }));
    }
    async get(key, options = {}) {
        const result = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: key,
            ConsistentRead: options.consistentRead,
            ProjectionExpression: options.projectionExpression,
        }));
        return result.Item ?? null;
    }
    async delete(key) {
        await this.client.send(new lib_dynamodb_1.DeleteCommand({ TableName: this.tableName, Key: key }));
    }
    async query(options) {
        const result = await this.client.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: options.indexName,
            KeyConditionExpression: options.keyConditionExpression,
            ExpressionAttributeNames: options.expressionAttributeNames,
            ExpressionAttributeValues: options.expressionAttributeValues,
            FilterExpression: options.filterExpression,
            Limit: options.limit,
            ScanIndexForward: options.scanIndexForward,
            ExclusiveStartKey: options.exclusiveStartKey,
        }));
        return {
            items: result.Items ?? [],
            count: result.Count ?? 0,
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }
    async scan(options = {}) {
        const result = await this.client.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: options.filterExpression,
            ExpressionAttributeNames: options.expressionAttributeNames,
            ExpressionAttributeValues: options.expressionAttributeValues,
            Limit: options.limit,
            ExclusiveStartKey: options.exclusiveStartKey,
        }));
        return {
            items: result.Items ?? [],
            count: result.Count ?? 0,
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }
    async batchPut(items) {
        const chunks = this.chunk(items, 25);
        for (const chunk of chunks) {
            await this.client.send(new lib_dynamodb_1.BatchWriteCommand({
                RequestItems: {
                    [this.tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
                },
            }));
        }
    }
    async batchGet(keys, options = {}) {
        const results = [];
        const chunks = this.chunk(keys, 100);
        for (const chunk of chunks) {
            const result = await this.client.send(new lib_dynamodb_1.BatchGetCommand({
                RequestItems: {
                    [this.tableName]: {
                        Keys: chunk,
                        ConsistentRead: options.consistentRead,
                    },
                },
            }));
            const items = result.Responses?.[this.tableName] ?? [];
            results.push(...items);
        }
        return results;
    }
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}
exports.DynamoRepository = DynamoRepository;
//# sourceMappingURL=repository.js.map