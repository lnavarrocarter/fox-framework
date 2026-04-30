import type { IDbProvider, IRepository, IQueryBuilder, QueryResult, RdsConfig } from '@foxframework/core';
export declare class RdsProvider implements IDbProvider {
    private readonly config;
    private inner;
    private schema;
    private _isConnected;
    constructor(config: RdsConfig);
    connect(): Promise<void>;
    private buildSslConfig;
    disconnect(): Promise<void>;
    raw<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    repository<T extends Record<string, unknown>, PK = number>(table: string): IRepository<T, PK>;
    queryBuilder<T extends Record<string, unknown> = Record<string, unknown>>(): IQueryBuilder<T>;
    get isConnected(): boolean;
}
//# sourceMappingURL=provider.d.ts.map