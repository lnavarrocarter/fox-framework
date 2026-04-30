import { RedisProvider } from '../src/provider';
import { createMockRedis } from './helpers/redis-mock';

let mockRedisInstance: ReturnType<typeof createMockRedis>;

jest.mock('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => mockRedisInstance),
  };
});

function makeProvider() {
  return new RedisProvider({ host: 'localhost', port: 6379 });
}

describe('RedisProvider', () => {
  beforeEach(() => {
    mockRedisInstance = createMockRedis();
  });

  describe('connect / disconnect', () => {
    it('connect() calls ping() and sets isConnected=true', async () => {
      const provider = makeProvider();
      expect(provider.isConnected).toBe(false);
      await provider.connect();
      expect(mockRedisInstance.ping).toHaveBeenCalled();
      expect(provider.isConnected).toBe(true);
    });

    it('disconnect() calls quit() and sets isConnected=false', async () => {
      const provider = makeProvider();
      await provider.connect();
      await provider.disconnect();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(provider.isConnected).toBe(false);
    });

    it('disconnect() is safe without connect()', async () => {
      const provider = makeProvider();
      await expect(provider.disconnect()).resolves.toBeUndefined();
      expect(provider.isConnected).toBe(false);
    });
  });

  describe('Strings', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('get() returns value', async () => {
      mockRedisInstance.get.mockResolvedValue('hello');
      expect(await provider.get('mykey')).toBe('hello');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('mykey');
    });

    it('get() returns null when key missing', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      expect(await provider.get('missing')).toBeNull();
    });

    it('set() with no options', async () => {
      await provider.set('k', 'v');
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v');
    });

    it('set() with EX option', async () => {
      await provider.set('k', 'v', { ex: 60 });
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
    });

    it('set() with NX option', async () => {
      await provider.set('k', 'v', { nx: true });
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v', 'NX');
    });

    it('set() with PX option', async () => {
      await provider.set('k', 'v', { px: 5000 });
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v', 'PX', 5000);
    });

    it('set() with XX option', async () => {
      await provider.set('k', 'v', { xx: true });
      expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v', 'XX');
    });

    it('del() returns count', async () => {
      mockRedisInstance.del.mockResolvedValue(2);
      expect(await provider.del('a', 'b')).toBe(2);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('a', 'b');
    });

    it('exists() returns count', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);
      expect(await provider.exists('k')).toBe(1);
    });

    it('expire() returns true when key exists', async () => {
      mockRedisInstance.expire.mockResolvedValue(1);
      expect(await provider.expire('k', 30)).toBe(true);
    });

    it('expire() returns false when key does not exist', async () => {
      mockRedisInstance.expire.mockResolvedValue(0);
      expect(await provider.expire('missing', 30)).toBe(false);
    });

    it('ttl() returns seconds', async () => {
      mockRedisInstance.ttl.mockResolvedValue(120);
      expect(await provider.ttl('k')).toBe(120);
    });
  });

  describe('Hash', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('hset() returns number of fields added', async () => {
      mockRedisInstance.hset.mockResolvedValue(1);
      expect(await provider.hset('h', 'f', 'v')).toBe(1);
      expect(mockRedisInstance.hset).toHaveBeenCalledWith('h', 'f', 'v');
    });

    it('hget() returns field value', async () => {
      mockRedisInstance.hget.mockResolvedValue('val');
      expect(await provider.hget('h', 'f')).toBe('val');
    });

    it('hget() returns null when field missing', async () => {
      mockRedisInstance.hget.mockResolvedValue(null);
      expect(await provider.hget('h', 'missing')).toBeNull();
    });

    it('hgetall() returns record when hash exists', async () => {
      mockRedisInstance.hgetall.mockResolvedValue({ a: '1', b: '2' });
      expect(await provider.hgetall('h')).toEqual({ a: '1', b: '2' });
    });

    it('hgetall() returns null when hash missing', async () => {
      mockRedisInstance.hgetall.mockResolvedValue(null);
      expect(await provider.hgetall('missing')).toBeNull();
    });

    it('hgetall() returns null for empty hash', async () => {
      mockRedisInstance.hgetall.mockResolvedValue({});
      expect(await provider.hgetall('empty')).toBeNull();
    });

    it('hdel() returns count of removed fields', async () => {
      mockRedisInstance.hdel.mockResolvedValue(1);
      expect(await provider.hdel('h', 'f1', 'f2')).toBe(1);
      expect(mockRedisInstance.hdel).toHaveBeenCalledWith('h', 'f1', 'f2');
    });
  });

  describe('List', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('lpush() returns new list length', async () => {
      mockRedisInstance.lpush.mockResolvedValue(3);
      expect(await provider.lpush('list', 'a', 'b', 'c')).toBe(3);
      expect(mockRedisInstance.lpush).toHaveBeenCalledWith('list', 'a', 'b', 'c');
    });

    it('rpush() returns new list length', async () => {
      mockRedisInstance.rpush.mockResolvedValue(2);
      expect(await provider.rpush('list', 'x', 'y')).toBe(2);
      expect(mockRedisInstance.rpush).toHaveBeenCalledWith('list', 'x', 'y');
    });

    it('lrange() returns elements', async () => {
      mockRedisInstance.lrange.mockResolvedValue(['a', 'b', 'c']);
      expect(await provider.lrange('list', 0, -1)).toEqual(['a', 'b', 'c']);
      expect(mockRedisInstance.lrange).toHaveBeenCalledWith('list', 0, -1);
    });

    it('llen() returns list length', async () => {
      mockRedisInstance.llen.mockResolvedValue(5);
      expect(await provider.llen('list')).toBe(5);
    });
  });

  describe('Set', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('sadd() returns count of added members', async () => {
      mockRedisInstance.sadd.mockResolvedValue(2);
      expect(await provider.sadd('s', 'a', 'b')).toBe(2);
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith('s', 'a', 'b');
    });

    it('smembers() returns all members', async () => {
      mockRedisInstance.smembers.mockResolvedValue(['a', 'b']);
      expect(await provider.smembers('s')).toEqual(['a', 'b']);
    });

    it('srem() returns count of removed members', async () => {
      mockRedisInstance.srem.mockResolvedValue(1);
      expect(await provider.srem('s', 'a')).toBe(1);
      expect(mockRedisInstance.srem).toHaveBeenCalledWith('s', 'a');
    });
  });

  describe('Counters', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('incr() returns incremented value', async () => {
      mockRedisInstance.incr.mockResolvedValue(5);
      expect(await provider.incr('counter')).toBe(5);
    });

    it('decr() returns decremented value', async () => {
      mockRedisInstance.decr.mockResolvedValue(3);
      expect(await provider.decr('counter')).toBe(3);
    });

    it('incrby() returns new value', async () => {
      mockRedisInstance.incrby.mockResolvedValue(10);
      expect(await provider.incrby('counter', 5)).toBe(10);
      expect(mockRedisInstance.incrby).toHaveBeenCalledWith('counter', 5);
    });
  });

  describe('JSON helpers', () => {
    let provider: RedisProvider;
    beforeEach(async () => { provider = makeProvider(); await provider.connect(); });

    it('getJSON() deserializes stored JSON', async () => {
      mockRedisInstance.get.mockResolvedValue('{"name":"fox","version":1}');
      const result = await provider.getJSON<{ name: string; version: number }>('obj');
      expect(result).toEqual({ name: 'fox', version: 1 });
    });

    it('getJSON() returns null when key is missing', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      expect(await provider.getJSON('missing')).toBeNull();
    });

    it('getJSON() returns null on invalid JSON', async () => {
      mockRedisInstance.get.mockResolvedValue('not-json{{{');
      expect(await provider.getJSON('bad')).toBeNull();
    });

    it('setJSON() serializes and calls set', async () => {
      const obj = { foo: 'bar', count: 42 };
      await provider.setJSON('obj', obj);
      expect(mockRedisInstance.set).toHaveBeenCalledWith('obj', JSON.stringify(obj));
    });

    it('setJSON() passes options through to set', async () => {
      await provider.setJSON('obj', { x: 1 }, { ex: 300 });
      expect(mockRedisInstance.set).toHaveBeenCalledWith('obj', JSON.stringify({ x: 1 }), 'EX', 300);
    });
  });

  describe('Error handling — not connected', () => {
    let provider: RedisProvider;
    beforeEach(() => { provider = makeProvider(); });

    const errMsg = 'RedisProvider is not connected. Call connect() first.';

    it('get() throws when not connected', async () => {
      await expect(provider.get('k')).rejects.toThrow(errMsg);
    });
    it('set() throws when not connected', async () => {
      await expect(provider.set('k', 'v')).rejects.toThrow(errMsg);
    });
    it('del() throws when not connected', async () => {
      await expect(provider.del('k')).rejects.toThrow(errMsg);
    });
    it('exists() throws when not connected', async () => {
      await expect(provider.exists('k')).rejects.toThrow(errMsg);
    });
    it('expire() throws when not connected', async () => {
      await expect(provider.expire('k', 10)).rejects.toThrow(errMsg);
    });
    it('ttl() throws when not connected', async () => {
      await expect(provider.ttl('k')).rejects.toThrow(errMsg);
    });
    it('hset() throws when not connected', async () => {
      await expect(provider.hset('h', 'f', 'v')).rejects.toThrow(errMsg);
    });
    it('hget() throws when not connected', async () => {
      await expect(provider.hget('h', 'f')).rejects.toThrow(errMsg);
    });
    it('hgetall() throws when not connected', async () => {
      await expect(provider.hgetall('h')).rejects.toThrow(errMsg);
    });
    it('hdel() throws when not connected', async () => {
      await expect(provider.hdel('h', 'f')).rejects.toThrow(errMsg);
    });
    it('lpush() throws when not connected', async () => {
      await expect(provider.lpush('l', 'v')).rejects.toThrow(errMsg);
    });
    it('rpush() throws when not connected', async () => {
      await expect(provider.rpush('l', 'v')).rejects.toThrow(errMsg);
    });
    it('lrange() throws when not connected', async () => {
      await expect(provider.lrange('l', 0, -1)).rejects.toThrow(errMsg);
    });
    it('llen() throws when not connected', async () => {
      await expect(provider.llen('l')).rejects.toThrow(errMsg);
    });
    it('sadd() throws when not connected', async () => {
      await expect(provider.sadd('s', 'm')).rejects.toThrow(errMsg);
    });
    it('smembers() throws when not connected', async () => {
      await expect(provider.smembers('s')).rejects.toThrow(errMsg);
    });
    it('srem() throws when not connected', async () => {
      await expect(provider.srem('s', 'm')).rejects.toThrow(errMsg);
    });
    it('incr() throws when not connected', async () => {
      await expect(provider.incr('c')).rejects.toThrow(errMsg);
    });
    it('decr() throws when not connected', async () => {
      await expect(provider.decr('c')).rejects.toThrow(errMsg);
    });
    it('incrby() throws when not connected', async () => {
      await expect(provider.incrby('c', 5)).rejects.toThrow(errMsg);
    });
    it('getJSON() throws when not connected', async () => {
      await expect(provider.getJSON('k')).rejects.toThrow(errMsg);
    });
    it('setJSON() throws when not connected', async () => {
      await expect(provider.setJSON('k', {})).rejects.toThrow(errMsg);
    });
  });
});
