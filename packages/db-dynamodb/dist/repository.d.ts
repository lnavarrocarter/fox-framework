import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IDynamoRepository, DynamoItem, DynamoGetOptions, DynamoQueryOptions, DynamoScanOptions, DynamoQueryResult } from '@foxframework/core';
export declare class DynamoRepository<T extends DynamoItem = DynamoItem> implements IDynamoRepository<T> {
    private readonly tableName;
    private readonly client;
    constructor(tableName: string, client: DynamoDBDocumentClient);
    put(item: T): Promise<void>;
    get(key: DynamoItem, options?: DynamoGetOptions): Promise<T | null>;
    delete(key: DynamoItem): Promise<void>;
    query(options: DynamoQueryOptions): Promise<DynamoQueryResult<T>>;
    scan(options?: DynamoScanOptions): Promise<DynamoQueryResult<T>>;
    batchPut(items: T[]): Promise<void>;
    batchGet(keys: DynamoItem[], options?: Pick<DynamoGetOptions, 'consistentRead'>): Promise<T[]>;
    private chunk;
}
//# sourceMappingURL=repository.d.ts.map