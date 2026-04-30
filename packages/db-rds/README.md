# @foxframework/db-rds

AWS RDS provider for [Fox Framework](https://github.com/lnavarrocarter/fox-framework) — supports PostgreSQL, MySQL, Aurora PostgreSQL, and Aurora MySQL with SSL and automatic table creation on connect.

Wraps `@foxframework/db-postgres` or `@foxframework/db-mysql` depending on the engine, and adds AWS-specific SSL handling and a `SchemaBuilder` for entity auto-creation.

## Installation

For PostgreSQL / Aurora PostgreSQL:

```bash
npm install @foxframework/db-rds @foxframework/db-postgres pg
npm install --save-dev @types/pg
```

For MySQL / Aurora MySQL:

```bash
npm install @foxframework/db-rds @foxframework/db-mysql mysql2
```

## Quick start

```ts
import { RdsProvider } from '@foxframework/db-rds';
import type { EntityDefinition } from '@foxframework/db-rds';

const usersTable: EntityDefinition = {
  name: 'users',
  columns: [
    { name: 'id',         type: 'serial',    primaryKey: true },
    { name: 'email',      type: 'varchar',   length: 255, nullable: false, unique: true },
    { name: 'name',       type: 'varchar',   length: 100 },
    { name: 'active',     type: 'boolean',   default: 'true' },
    { name: 'created_at', type: 'timestamp', default: 'NOW()' },
  ],
  indexes: [
    { name: 'idx_users_email', columns: ['email'], unique: true },
  ],
};

const db = new RdsProvider({
  engine: 'aurora-postgres',   // 'postgres' | 'mysql' | 'aurora-postgres' | 'aurora-mysql'
  host: 'mydb.cluster-xyz.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'myapp',
  user: 'admin',
  password: process.env.DB_PASSWORD!,
  ssl: true,                   // recommended for RDS
  pool: { min: 2, max: 10 },
  entities: [usersTable],      // tables are created with CREATE TABLE IF NOT EXISTS
});

await db.connect(); // connects + auto-creates tables
```

## Repository & QueryBuilder

After connecting, use the underlying provider via `db.provider`:

```ts
interface User {
  id: number;
  email: string;
  name: string;
  active: boolean;
}

const users = db.provider.repository<User>('users');

const alice   = await users.findById(1);
const active  = await users.findAll({ where: { active: true }, limit: 20 });
const bob     = await users.create({ email: 'bob@example.com', name: 'Bob', active: true });
const updated = await users.update(bob.id, { name: 'Robert' });
const deleted = await users.delete(bob.id);

// QueryBuilder
const results = await db.provider.queryBuilder<User>()
  .from('users')
  .select('id', 'name', 'email')
  .where('active', '=', true)
  .orderBy('name', 'ASC')
  .limit(10)
  .execute();

// Raw SQL
const raw = await db.provider.raw<User>('SELECT * FROM users LIMIT $1', [5]);

await db.disconnect();
```

## Entity auto-creation

Tables are created with `CREATE TABLE IF NOT EXISTS` when `entities` is provided. `SchemaBuilder` handles SQL dialect differences automatically:

| Feature | PostgreSQL | MySQL |
|---|---|---|
| Auto-increment | `SERIAL` | `INT AUTO_INCREMENT` |
| Booleans | `BOOLEAN` | `TINYINT(1)` |
| JSON columns | `JSONB` | `JSON` |
| Identifier quoting | `"double quotes"` | `` `backticks` `` |
| Unique indexes | `CREATE UNIQUE INDEX IF NOT EXISTS` | `CREATE UNIQUE INDEX` |

## SSL

| `ssl` value | PostgreSQL | MySQL |
|---|---|---|
| `true` | `{ rejectUnauthorized: true }` | `{ rejectUnauthorized: false }` * |
| `{ ca: '/path/file' }` | reads file, passes as `ssl.ca` | reads file, passes as `ssl.ca` |
| `false` / omitted | no SSL | no SSL |

\* AWS RDS MySQL requires `rejectUnauthorized: false` with the RDS CA bundle.

## Configuration

```ts
interface RdsConfig {
  engine: 'postgres' | 'mysql' | 'aurora-postgres' | 'aurora-mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { ca?: string };
  pool?: {
    min?: number;   // default: 2
    max?: number;   // default: 10
  };
  entities?: EntityDefinition[]; // tables to auto-create on connect
}
```

## License

MIT
