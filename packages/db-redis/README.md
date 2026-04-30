# @foxframework/db-redis

Redis provider for Fox Framework — strings, hashes, lists, sets, counters, and JSON helpers via [ioredis](https://github.com/redis/ioredis).

## Installation

```bash
npm install @foxframework/db-redis ioredis
```

## Usage

```ts
import { RedisProvider } from '@foxframework/db-redis';

const redis = new RedisProvider({
  host: 'localhost',
  port: 6379,
  password: 'secret',  // optional
  db: 0,               // optional, default: 0
  keyPrefix: 'app:',   // optional prefix for all keys
});

await redis.connect();
```

### Strings

```ts
await redis.set('name', 'fox');
await redis.set('session', 'abc', { ex: 3600 }); // expire in 1 hour
await redis.set('lock', '1', { nx: true });       // set only if not exists

const name = await redis.get('name'); // 'fox'
await redis.del('name', 'session');
await redis.exists('name');           // 0
await redis.expire('key', 60);        // true / false
await redis.ttl('session');           // seconds remaining
```

### Hashes

```ts
await redis.hset('user:1', 'email', 'user@example.com');
const email = await redis.hget('user:1', 'email');
const all = await redis.hgetall('user:1'); // Record<string, string> | null
await redis.hdel('user:1', 'email');
```

### Lists

```ts
await redis.lpush('queue', 'job1', 'job2');
await redis.rpush('log', 'entry1');
const items = await redis.lrange('queue', 0, -1);
const len = await redis.llen('queue');
```

### Sets

```ts
await redis.sadd('tags', 'typescript', 'redis');
const members = await redis.smembers('tags');
await redis.srem('tags', 'redis');
```

### Counters

```ts
await redis.incr('visits');
await redis.decr('stock');
await redis.incrby('score', 10);
```

### JSON helpers

```ts
interface User { id: number; name: string; }

await redis.setJSON<User>('user:1', { id: 1, name: 'Alice' }, { ex: 300 });
const user = await redis.getJSON<User>('user:1'); // User | null
```

### Disconnect

```ts
await redis.disconnect();
```

## License

MIT
