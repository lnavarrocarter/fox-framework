# @foxframework/db-dynamodb

AWS DynamoDB provider for Fox Framework — full DynamoDB API with automatic table creation on connect.

## Installation

```bash
npm install @foxframework/db-dynamodb @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Usage

### Basic setup with auto-table creation

```ts
import { DynamoProvider } from '@foxframework/db-dynamodb';

const provider = new DynamoProvider({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  entities: [
    {
      tableName: 'Users',
      partitionKey: { name: 'userId', type: 'S' },
      sortKey: { name: 'createdAt', type: 'N' },
      billing: 'PAY_PER_REQUEST',
      globalSecondaryIndexes: [
        {
          indexName: 'email-index',
          partitionKey: { name: 'email', type: 'S' },
        },
      ],
    },
  ],
});

await provider.connect(); // creates tables if they don't exist
```

### CRUD operations

```ts
const users = provider.table<{ userId: string; name: string; email: string }>('Users');

// Put an item
await users.put({ userId: 'u1', name: 'Alice', email: 'alice@example.com' });

// Get by primary key
const user = await users.get({ userId: 'u1' });

// Delete
await users.delete({ userId: 'u1' });
```

### Query and Scan

```ts
// Query by partition key
const result = await users.query({
  keyConditionExpression: 'userId = :uid',
  expressionAttributeValues: { ':uid': 'u1' },
});
console.log(result.items, result.count, result.lastEvaluatedKey);

// Scan with filter
const scanResult = await users.scan({
  filterExpression: 'contains(#name, :val)',
  expressionAttributeNames: { '#name': 'name' },
  expressionAttributeValues: { ':val': 'Alice' },
});
```

### Batch operations

```ts
// Batch write (auto-chunks at 25 items)
await users.batchPut([
  { userId: 'u1', name: 'Alice', email: 'alice@example.com' },
  { userId: 'u2', name: 'Bob', email: 'bob@example.com' },
]);

// Batch get (auto-chunks at 100 keys)
const items = await users.batchGet([{ userId: 'u1' }, { userId: 'u2' }]);
```

### Disconnect

```ts
await provider.disconnect();
```

## DynamoDB Local (development)

```ts
const provider = new DynamoProvider({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'local',
  secretAccessKey: 'local',
  entities: [ /* ... */ ],
});
```

Run DynamoDB Local with Docker:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

## License

MIT
