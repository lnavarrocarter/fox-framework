import type { IRedisProvider, RedisSetOptions } from '@foxframework/core';
export interface RedisConnectionOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    tls?: boolean;
    keyPrefix?: string;
}
export declare class RedisProvider implements IRedisProvider {
    private readonly options;
    private client;
    private _isConnected;
    constructor(options: RedisConnectionOptions);
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private requireClient;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: RedisSetOptions): Promise<void>;
    del(...keys: string[]): Promise<number>;
    exists(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    hset(key: string, field: string, value: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string> | null>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    lpush(key: string, ...values: string[]): Promise<number>;
    rpush(key: string, ...values: string[]): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    llen(key: string): Promise<number>;
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, ...members: string[]): Promise<number>;
    incr(key: string): Promise<number>;
    decr(key: string): Promise<number>;
    incrby(key: string, increment: number): Promise<number>;
    getJSON<T>(key: string): Promise<T | null>;
    setJSON<T>(key: string, value: T, options?: RedisSetOptions): Promise<void>;
}
//# sourceMappingURL=provider.d.ts.map