# @foxframework/db-mongo

MongoDB provider for Fox Framework using the Repository pattern via the official `mongodb` driver.

## Installation

```bash
npm install @foxframework/db-mongo mongodb
```

## Usage

```typescript
import { MongoProvider } from '@foxframework/db-mongo';

interface User {
  id?: string;
  name: string;
  email: string;
}

const provider = new MongoProvider('mongodb://localhost:27017', 'mydb');

// Connect
await provider.connect();

// Get a typed repository
const users = provider.collection<User>('users');

// Create
const alice = await users.create({ name: 'Alice', email: 'alice@example.com' });

// Find by ID
const found = await users.findById(alice.id!);

// Find one with filter
const byEmail = await users.findOne({ email: 'alice@example.com' });

// Find all with options
const page = await users.findAll({ filter: { name: 'Alice' }, limit: 10, skip: 0, sort: { name: 1 } });

// Update
const updated = await users.update(alice.id!, { name: 'Alice Smith' });

// Delete
const deleted = await users.delete(alice.id!);

// Count
const total = await users.count({ name: 'Alice' });

// Disconnect
await provider.disconnect();
```

## API

### `MongoProvider(uri: string, dbName: string)`

| Method | Description |
|---|---|
| `connect()` | Opens the MongoDB connection |
| `disconnect()` | Closes the connection |
| `collection<T>(name)` | Returns an `IMongoRepository<T>` for the named collection |
| `isConnected` | Whether the provider is currently connected |

### `IMongoRepository<T>`

| Method | Description |
|---|---|
| `findById(id)` | Find document by string ID |
| `findOne(filter?)` | Find first matching document |
| `findAll(options?)` | Find all matching documents with optional filter, sort, limit, skip, projection |
| `create(data)` | Insert a new document |
| `update(id, data)` | Partially update a document by ID |
| `delete(id)` | Delete a document by ID, returns `boolean` |
| `count(filter?)` | Count matching documents |

Documents are serialized so that `_id: ObjectId` becomes `id: string`.

## License

MIT
