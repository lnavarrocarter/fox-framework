"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableInitializer = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
class TableInitializer {
    constructor(client) {
        this.client = client;
    }
    async ensureTables(entities) {
        for (const entity of entities) {
            await this.ensureTable(entity);
        }
    }
    async ensureTable(entity) {
        try {
            await this.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: entity.tableName }));
            // Table exists, nothing to do
        }
        catch (err) {
            if (err.name === 'ResourceNotFoundException') {
                await this.createTable(entity);
                await (0, client_dynamodb_1.waitUntilTableExists)({ client: this.client, maxWaitTime: 60 }, { TableName: entity.tableName });
            }
            else {
                throw err;
            }
        }
    }
    async createTable(entity) {
        const keySchema = [
            { AttributeName: entity.partitionKey.name, KeyType: 'HASH' },
        ];
        const attributeDefinitions = [
            { AttributeName: entity.partitionKey.name, AttributeType: entity.partitionKey.type },
        ];
        if (entity.sortKey) {
            keySchema.push({ AttributeName: entity.sortKey.name, KeyType: 'RANGE' });
            attributeDefinitions.push({ AttributeName: entity.sortKey.name, AttributeType: entity.sortKey.type });
        }
        const billing = entity.billing ?? 'PAY_PER_REQUEST';
        const gsis = (entity.globalSecondaryIndexes ?? []).map((gsi) => this.buildGSI(gsi, attributeDefinitions));
        await this.client.send(new client_dynamodb_1.CreateTableCommand({
            TableName: entity.tableName,
            KeySchema: keySchema,
            AttributeDefinitions: attributeDefinitions,
            BillingMode: billing,
            ...(billing === 'PROVISIONED'
                ? {
                    ProvisionedThroughput: {
                        ReadCapacityUnits: entity.readCapacity ?? 5,
                        WriteCapacityUnits: entity.writeCapacity ?? 5,
                    },
                }
                : {}),
            ...(gsis.length > 0 ? { GlobalSecondaryIndexes: gsis } : {}),
        }));
    }
    buildGSI(gsi, attrDefs) {
        const keySchema = [{ AttributeName: gsi.partitionKey.name, KeyType: 'HASH' }];
        if (!attrDefs.find((a) => a.AttributeName === gsi.partitionKey.name)) {
            attrDefs.push({ AttributeName: gsi.partitionKey.name, AttributeType: gsi.partitionKey.type });
        }
        if (gsi.sortKey) {
            keySchema.push({ AttributeName: gsi.sortKey.name, KeyType: 'RANGE' });
            if (!attrDefs.find((a) => a.AttributeName === gsi.sortKey.name)) {
                attrDefs.push({ AttributeName: gsi.sortKey.name, AttributeType: gsi.sortKey.type });
            }
        }
        return {
            IndexName: gsi.indexName,
            KeySchema: keySchema,
            Projection: { ProjectionType: 'ALL' },
            ...(gsi.billing === 'PROVISIONED'
                ? {
                    ProvisionedThroughput: {
                        ReadCapacityUnits: gsi.readCapacity ?? 5,
                        WriteCapacityUnits: gsi.writeCapacity ?? 5,
                    },
                }
                : {}),
        };
    }
}
exports.TableInitializer = TableInitializer;
//# sourceMappingURL=table-initializer.js.map