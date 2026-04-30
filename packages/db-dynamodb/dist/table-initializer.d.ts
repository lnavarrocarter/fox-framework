import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoEntityDefinition } from '@foxframework/core';
export declare class TableInitializer {
    private readonly client;
    constructor(client: DynamoDBClient);
    ensureTables(entities: DynamoEntityDefinition[]): Promise<void>;
    private ensureTable;
    private createTable;
    private buildGSI;
}
//# sourceMappingURL=table-initializer.d.ts.map