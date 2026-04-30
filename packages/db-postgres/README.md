# @foxframework/db-postgres

PostgreSQL provider for [Fox Framework](https://github.com/lnavarrocarter/fox-framework) — connection pooling via `pg`, Repository pattern, and a fluent QueryBuilder.

## Installation

```bash
npm install @foxframework/db-postgres pg
npm install --save-dev @types/pg
```

`pg` is a **peer dependency** — you control which version of the driver you use.

## Quick start

```ts
import { PostgresProvider } from '@foxframework/db-postgres';

const db = new PostgresProvider({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'admin',
  password: 'secret',
  pool: { min: 2, max: 10 },
});

await db.connect();

// --- Repository ---
interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

const users = db.repository<User>('users');

const alice  = await users.findById(1);
const active = await users.findAll({ where: { active: true }, limit: 20 });
const bob    = await users.create({ name: 'Bob', email: 'bob@example.com', active: true });
const updated = await users.update(1, { name: 'Alice Smith' });
const deleted  = await users.delete(99);
const total    = await users.count({ where: { active: true } });

// --- QueryBuilder ---
const results = await db.queryBuilder<User>()
  .from('users')
  .select('id', 'name', 'email')
  .where('active', '=', true)
  .andWhere('name', 'LIKE', 'A%')
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(0)
  .execute();

// --- Raw SQL ---
const raw = await db.raw<User>(
  'SELECT * FROM users WHERE id = ANY($1::int[])',
  [[1, 2, 3]],
);

await db.disconnect();
```

## API

### `PostgresProvider`

| Method | Description |
|--------|-------------|
| `connect()` | Creates the connection pool and validates connectivity |
| `disconnect()` | Drains the pool |
| `raw<T>(sql, params?)` | Executes a parameterised query, returns `QueryResult<T>` |
| `repository<T>(table)` | Returns a `PostgresRepository<T>` for the given table |
| `queryBuilder<T>()` | Returns a standalone `PostgresQueryBuilder<T>` |
| `isConnected` | `true` after `connect()` succeeds |

### `IRepository<T>` methods

| Method | Description |
|--------|-------------|
| `findById(id)` | `T \| null` |
| `findOne(options)` | First match or `null` |
| `findAll(options?)` | All matching rows |
| `create(data)` | `INSERT … RETURNING *` |
| `update(id, data)` | `UPDATE … RETURNING *` |
| `delete(id)` | `true` if row was deleted |
| `count(options?)` | Row count |
| `query()` | QueryBuilder pre-seeded with this table |

### `IQueryBuilder<T>` methods

`from` · `select` · `where` · `andWhere` · `orWhere` · `orderBy` · `limit` · `offset` · `execute` · `toSQL`

Supported operators: `=` `!=` `<` `<=` `>` `>=` `LIKE` `ILIKE` `IN` `NOT IN`

## Configuration

```ts
interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  pool?: {
    min?: number;                  // default: 2
    max?: number;                  // default: 10
    idleTimeoutMillis?: number;    // default: 30000
    acquireTimeoutMillis?: number; // default: 5000
  };
}
```

## License

MIT
