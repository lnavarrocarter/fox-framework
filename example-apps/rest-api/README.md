# fox-rest-api

CRUD REST API built with [Fox Framework](https://foxframework.dev) and PostgreSQL.

## Run

```bash
npm install

# App only (in-memory store)
npm run dev

# App + PostgreSQL via Docker Compose
npm run dev -- --infrastructure
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /todos | List all todos |
| GET | /todos/:id | Get by id |
| POST | /todos | Create todo (body: `{ title }`) |
| PATCH | /todos/:id | Update todo |
| DELETE | /todos/:id | Delete todo |

## Environment

```env
PORT=3001
DATABASE_URL=postgresql://fox:fox@localhost:5432/todos
```
