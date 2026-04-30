# @foxframework/db-sqlite

SQLite provider for [Fox Framework](https://github.com/lnavarrocarter/fox-framework) — Repository pattern + QueryBuilder via `better-sqlite3`.

## Installation

```bash
npm install @foxframework/db-sqlite better-sqlite3
npm install --save-dev @types/better-sqlite3
```

`better-sqlite3` is a **peer dependency** — you control which version of the driver you use.

## Quick start

```ts
import { SQLiteProvider } from '@foxframework/db-sqlite';

interface User {
  id: number;
  name: string;
  email: string;
  active: number; // SQLite stores booleans as 0/1
}

// File-based database
const db = new SQLiteProvider({ filename: './myapp.db' });

// Or in-memory (great for tests)
// const db = new SQLiteProvider({ filename: ':memory:' });

await db.connect();

const users = db.repository<User>('users');

const alice   = await users.findById(1);
const active  = await users.findAll({ where: { active: 1 }, limit: 50 });
const bob     = await users.create({ name: 'Bob', email: 'bob@example.com', active: 1 });
const updated = await users.update(bob.id, { name: 'Robert' });
const deleted = await users.delete(bob.id);
const total   = await users.count({ where: { active: 1 } });

// QueryBuilder
const results = await db.queryBuilder<User>()
  .from('users')
  .select('id', 'name', 'email')
  .where('active', '=', 1)
  .andWhere('name', 'LIKE', 'A%')
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(0)
  .execute();

// Raw SQL
const raw = await db.raw<User>('SELECT * FROM users WHERE id = ?', [1]);

await db.disconnect();
```

## API

### `SQLiteProvider`

| Method | Description |
|---|---|
| `connect()` | Opens the database file |
| `disconnect()` | Closes the database file |
| `raw<T>(sql, params?)` | Executes a parameterised statement, returns `QueryResult<T>` |
| `repository<T>(table)` | Returns an `SQLiteRepository<T>` for the given table |
| `queryBuilder<T>()` | Returns a standalone `SQLiteQueryBuilder<T>` |
| `isConnected` | `true` after `connect()` succeeds |

### `IRepository<T>` methods

| Method | Description |
|---|---|
| `findById(id)` | `T \| null` |
| `findOne(options)` | First match or `null` |
| `findAll(options?)` | All matching rows |
| `create(data)` | `INSERT … RETURNING *` |
| `update(id, data)` | `UPDATE … RETURNING *` |
| `delete(id)` | `true` if a row was deleted |
| `count(options?)` | Row count |
| `query()` | QueryBuilder pre-seeded with this table |

### `IQueryBuilder<T>` methods

`from` · `select` · `where` · `andWhere` · `orWhere` · `orderBy` · `limit` · `offset` · `execute` · `toSQL`

Supported operators: `=` `!=` `<` `<=` `>` `>=` `LIKE` `IN` `NOT IN`

Uses `?` placeholders (not `$1`, `$2` like PostgreSQL).

## Configuration

```ts
interface FileDbConfig {
  filename: string;   // path to the SQLite file, or ':memory:' for in-memory
  readonly?: boolean; // open in read-only mode (default: false)
}
```

## Notes

- `better-sqlite3` is **synchronous** — all methods are wrapped in `Promise.resolve()` for interface compatibility.
- `RETURNING *` requires SQLite ≥ 3.35 (released March 2021). Node.js ships a sufficiently recent version via the native `better-sqlite3` bindings.
- Booleans are stored as integers (`0` / `1`); use `active: 1` in queries.

## License

MIT
