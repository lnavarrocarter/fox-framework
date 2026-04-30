"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisProvider = void 0;
class RedisProvider {
    constructor(options) {
        this.options = options;
        this.client = null;
        this._isConnected = false;
    }
    get isConnected() {
        return this._isConnected;
    }
    async connect() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: Redis } = require('ioredis');
        this.client = new Redis(this.options);
        await this.client.ping();
        this._isConnected = true;
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
        this._isConnected = false;
    }
    requireClient() {
        if (!this.client)
            throw new Error('RedisProvider is not connected. Call connect() first.');
        return this.client;
    }
    // Strings
    async get(key) {
        return this.requireClient().get(key);
    }
    async set(key, value, options) {
        const client = this.requireClient();
        if (!options || Object.keys(options).length === 0) {
            await client.set(key, value);
            return;
        }
        const args = [key, value];
        if (options.ex !== undefined) {
            args.push('EX', options.ex);
        }
        else if (options.px !== undefined) {
            args.push('PX', options.px);
        }
        if (options.nx)
            args.push('NX');
        else if (options.xx)
            args.push('XX');
        await client.set(...args);
    }
    async del(...keys) {
        return this.requireClient().del(...keys);
    }
    async exists(...keys) {
        return this.requireClient().exists(...keys);
    }
    async expire(key, seconds) {
        return (await this.requireClient().expire(key, seconds)) === 1;
    }
    async ttl(key) {
        return this.requireClient().ttl(key);
    }
    // Hash
    async hset(key, field, value) {
        return this.requireClient().hset(key, field, value);
    }
    async hget(key, field) {
        return this.requireClient().hget(key, field);
    }
    async hgetall(key) {
        const result = await this.requireClient().hgetall(key);
        if (!result || Object.keys(result).length === 0)
            return null;
        return result;
    }
    async hdel(key, ...fields) {
        return this.requireClient().hdel(key, ...fields);
    }
    // List
    async lpush(key, ...values) {
        return this.requireClient().lpush(key, ...values);
    }
    async rpush(key, ...values) {
        return this.requireClient().rpush(key, ...values);
    }
    async lrange(key, start, stop) {
        return this.requireClient().lrange(key, start, stop);
    }
    async llen(key) {
        return this.requireClient().llen(key);
    }
    // Set
    async sadd(key, ...members) {
        return this.requireClient().sadd(key, ...members);
    }
    async smembers(key) {
        return this.requireClient().smembers(key);
    }
    async srem(key, ...members) {
        return this.requireClient().srem(key, ...members);
    }
    // Counters
    async incr(key) {
        return this.requireClient().incr(key);
    }
    async decr(key) {
        return this.requireClient().decr(key);
    }
    async incrby(key, increment) {
        return this.requireClient().incrby(key, increment);
    }
    // JSON helpers
    async getJSON(key) {
        const raw = await this.requireClient().get(key);
        if (raw === null)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async setJSON(key, value, options) {
        return this.set(key, JSON.stringify(value), options);
    }
}
exports.RedisProvider = RedisProvider;
//# sourceMappingURL=provider.js.map