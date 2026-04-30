# @foxframework/db-mysql

MySQL / MariaDB provider for [Fox Framework](https://github.com/lnavarrocarter/fox-framework) — connection pooling via `mysql2`, Repository pattern, and a fluent QueryBuilder.

## Installation

```bash
npm install @foxframework/db-mysql mysql2
```

`mysql2` is a **peer dependency** — you control which version of the driver you use.

## Quick start

```ts
import { MySQLProvider } from '@foxframework/db-mysql';

const db = new MySQLProvider({
  host: 'localhost',
  port: 3306,
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

const alice   = await users.findById(1);
const active  = await users.findAll({ where: { active: true }, limit: 20 });
const bob     = await users.create({ name: 'Bob', email: 'bob@example.com', active: true });
const updated = await users.update(bob.id, { name: 'Robert' });
const deleted = await users.delete(bob.id);
const total   = await users.count({ where: { active: true } });

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
const raw = await db.raw<User>('SELECT * FROM users WHERE id = ?', [1]);

await db.disconnect();
```

## API

### `MySQLProvider`

| Method | Description |
|---|---|
| `connect()` | Creates the connection pool and validates connectivity |
| `disconnect()` | Drains the pool |
| `raw<T>(sql, params?)` | Executes a parameterised query, returns `QueryResult<T>` |
| `repository<T>(table)` | Returns a `MySQLRepository<T>` for the given table |
| `queryBuilder<T>()` | Returns a standalone `MySQLQueryBuilder<T>` |
| `isConnected` | `true` after `connect()` succeeds |

### `IRepository<T>` methods

| Method | Description |
|---|---|
| `findById(id)` | `T \| null` |
| `findOne(options)` | First match or `null` |
| `findAll(options?)` | All matching rows |
| `create(data)` | `INSERT … ` + re-select by `insertId` |
| `update(id, data)` | `UPDATE …` + re-select by id |
| `delete(id)` | `true` if a row was deleted |
| `count(options?)` | Row count |
| `query()` | QueryBuilder pre-seeded with this table |

### `IQueryBuilder<T>` methods

`from` · `select` · `where` · `andWhere` · `orWhere` · `orderBy` · `limit` · `offset` · `execute` · `toSQL`

Supported operators: `=` `!=` `<` `<=` `>` `>=` `LIKE` `IN` `NOT IN`

Uses `?` placeholders and backtick-quoted identifiers (MySQL style).

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
