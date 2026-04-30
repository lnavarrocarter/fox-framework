import type { Redis as IRedis } from 'ioredis';
import type { IRedisProvider, RedisSetOptions } from '@foxframework/core';

export interface RedisConnectionOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
}

export class RedisProvider implements IRedisProvider {
  private client: IRedis | null = null;
  private _isConnected = false;

  constructor(private readonly options: RedisConnectionOptions) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: Redis } = require('ioredis') as typeof import('ioredis');
    this.client = new Redis(this.options as any);
    await this.client.ping();
    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this._isConnected = false;
  }

  private requireClient(): IRedis {
    if (!this.client) throw new Error('RedisProvider is not connected. Call connect() first.');
    return this.client;
  }

  // Strings
  async get(key: string): Promise<string | null> {
    return this.requireClient().get(key);
  }

  async set(key: string, value: string, options?: RedisSetOptions): Promise<void> {
    const client = this.requireClient();
    if (!options || Object.keys(options).length === 0) {
      await client.set(key, value);
      return;
    }
    const args: any[] = [key, value];
    if (options.ex !== undefined) { args.push('EX', options.ex); }
    else if (options.px !== undefined) { args.push('PX', options.px); }
    if (options.nx) args.push('NX');
    else if (options.xx) args.push('XX');
    await (client.set as any)(...args);
  }

  async del(...keys: string[]): Promise<number> {
    return this.requireClient().del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return this.requireClient().exists(...keys);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return (await this.requireClient().expire(key, seconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.requireClient().ttl(key);
  }

  // Hash
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.requireClient().hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.requireClient().hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const result = await this.requireClient().hgetall(key);
    if (!result || Object.keys(result).length === 0) return null;
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.requireClient().hdel(key, ...fields);
  }

  // List
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.requireClient().lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.requireClient().rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.requireClient().lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.requireClient().llen(key);
  }

  // Set
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.requireClient().sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.requireClient().smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.requireClient().srem(key, ...members);
  }

  // Counters
  async incr(key: string): Promise<number> {
    return this.requireClient().incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.requireClient().decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.requireClient().incrby(key, increment);
  }

  // JSON helpers
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.requireClient().get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, options?: RedisSetOptions): Promise<void> {
    return this.set(key, JSON.stringify(value), options);
  }
}
