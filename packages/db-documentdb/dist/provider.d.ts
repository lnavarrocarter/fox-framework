import { DocumentDbConfig, IMongoProvider, IMongoRepository } from '@foxframework/core';
export declare class DocumentDbProvider implements IMongoProvider {
    private readonly config;
    private inner;
    private _isConnected;
    constructor(config: DocumentDbConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    collection<T extends Record<string, unknown>>(name: string): IMongoRepository<T>;
    get isConnected(): boolean;
}
//# sourceMappingURL=provider.d.ts.map