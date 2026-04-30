# @foxframework/db-documentdb

AWS DocumentDB provider for [Fox Framework](https://github.com/lnavarrocarter/fox-framework) — MongoDB-compatible with TLS support and automatic collection/index creation on connect.

Wraps `@foxframework/db-mongo` and adds DocumentDB-specific TLS connection handling via `buildDocumentDbUri`.

## Installation

```bash
npm install @foxframework/db-documentdb @foxframework/db-mongo mongodb
npm install --save-dev @types/mongodb
```

Both `@foxframework/db-mongo` and `mongodb` are **peer dependencies** — you control which versions you use.

## Quick start

```ts
import { DocumentDbProvider } from '@foxframework/db-documentdb';

const db = new DocumentDbProvider({
  uri: 'mongodb://admin:secret@mydb.cluster.docdb.amazonaws.com:27017',
  database: 'myapp',
  tls: true,
  tlsCaFile: '/path/to/global-bundle.pem', // AWS DocumentDB CA bundle
  entities: [usersCollection],
});

await db.connect(); // connects + auto-creates collections and indexes

interface User {
  id?: string;
  name: string;
  email: string;
}

const users = db.collection<User>('users');

const alice   = await users.create({ name: 'Alice', email: 'alice@example.com' });
const found   = await users.findById(alice.id!);
const all     = await users.findAll({ filter: { name: 'Alice' }, limit: 10 });
const updated = await users.update(alice.id!, { name: 'Alice Smith' });
const deleted = await users.delete(alice.id!);
const total   = await users.count({ name: 'Alice' });

await db.disconnect();
```

## Collection auto-creation

Pass `entities` to have collections and indexes created automatically on `connect()`. The initializer is idempotent — it checks for the collection before creating it.

```ts
import type { CollectionDefinition } from '@foxframework/db-documentdb';

const usersCollection: CollectionDefinition = {
  name: 'users',
  indexes: [
    { name: 'email_unique', fields: { email: 1 }, unique: true },
    { name: 'name_idx',     fields: { name: 1 } },
  ],
};

const db = new DocumentDbProvider({
  uri: 'mongodb://...',
  database: 'myapp',
  tls: true,
  tlsCaFile: '/path/to/global-bundle.pem',
  entities: [usersCollection],
});

await db.connect(); // users collection + indexes are ready
```

## TLS / Connection

`buildDocumentDbUri` appends the required DocumentDB query params when `tls: true`:

| Param | Value |
|---|---|
| `tls` | `true` |
| `retryWrites` | `false` |
| `readPreference` | `secondaryPreferred` |
| `tlsCAFile` | value of `config.tlsCaFile` (if provided) |

When `tls: false` the URI is used as-is (useful for local testing with a real MongoDB instance).

## API

### `DocumentDbProvider`

| Method / Property | Description |
|---|---|
| `connect()` | Builds the TLS URI, connects via MongoProvider, auto-creates collections |
| `disconnect()` | Closes the connection |
| `collection<T>(name)` | Returns an `IMongoRepository<T>` for the named collection |
| `isConnected` | `true` after `connect()` succeeds |

### `IMongoRepository<T>`

| Method | Description |
|---|---|
| `findById(id)` | Find document by string ID (`_id` → `id`) |
| `findOne(filter?)` | First matching document |
| `findAll(options?)` | All matching documents with filter, sort, limit, skip, projection |
| `create(data)` | Insert a document, returns it with `id` string |
| `update(id, data)` | Partial update by ID |
| `delete(id)` | Delete by ID, returns `boolean` |
| `count(filter?)` | Count matching documents |

### `CollectionInitializer`

Low-level helper used internally by `DocumentDbProvider`. Can be used standalone if you need to manage collections outside of the provider lifecycle.

```ts
import { CollectionInitializer } from '@foxframework/db-documentdb';

const initializer = new CollectionInitializer(() => mongoDb);
await initializer.ensureCollections([usersCollection, ordersCollection]);
```

### `buildDocumentDbUri(config)`

Utility that constructs a TLS-enabled DocumentDB connection string from a `DocumentDbConfig`.

```ts
import { buildDocumentDbUri } from '@foxframework/db-documentdb';

const uri = buildDocumentDbUri({
  uri: 'mongodb://user:pass@host:27017',
  database: 'mydb',
  tls: true,
  tlsCaFile: '/etc/ssl/rds-ca.pem',
});
// → 'mongodb://user:pass@host:27017/?tls=true&retryWrites=false&readPreference=secondaryPreferred&tlsCAFile=%2Fetc%2Fssl%2Frds-ca.pem'
```

## Configuration

```ts
interface DocumentDbConfig {
  uri: string;         // MongoDB-compatible connection string
  database: string;    // Database name
  tls?: boolean;       // Enable TLS (default: true for DocumentDB)
  tlsCaFile?: string;  // Path to the AWS DocumentDB CA bundle (.pem)
  entities?: CollectionDefinition[]; // Collections to auto-create on connect
}

interface CollectionDefinition {
  name: string;
  indexes?: Array<{
    name: string;
    fields: Record<string, 1 | -1>;
    unique?: boolean;
  }>;
}
```

## Local development

Use a standard MongoDB instance with `tls: false` to develop locally:

```ts
const db = new DocumentDbProvider({
  uri: 'mongodb://localhost:27017',
  database: 'myapp',
  tls: false,
});
```

Or with Docker:

```bash
docker run -p 27017:27017 mongo:7
```

## License

MIT
