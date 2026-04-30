import { IMongoProvider, IMongoRepository } from '@foxframework/core';
export declare class MongoProvider implements IMongoProvider {
    private readonly uri;
    private readonly dbName;
    private client;
    private db;
    private _isConnected;
    constructor(uri: string, dbName: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    collection<T extends Record<string, unknown>>(name: string): IMongoRepository<T>;
    get isConnected(): boolean;
}
//# sourceMappingURL=provider.d.ts.map