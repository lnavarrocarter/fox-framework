import { IDynamoProvider, IDynamoRepository, DynamoDbConfig, DynamoItem } from '@foxframework/core';
export declare class DynamoProvider implements IDynamoProvider {
    private readonly config;
    private dynamoClient;
    private docClient;
    private _isConnected;
    constructor(config: DynamoDbConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    table<T extends DynamoItem = DynamoItem>(tableName: string): IDynamoRepository<T>;
    get isConnected(): boolean;
}
//# sourceMappingURL=provider.d.ts.map