# fox-fullstack

Full-stack [Fox Framework](https://foxframework.dev) app — JWT auth + blog CRUD + optional AI agent.

## Features

- JWT authentication (`/auth/register`, `/auth/login`, `/auth/me`)
- Protected blog posts CRUD (`/posts`)
- Optional AI agent with SSE streaming (`/ai/stream?q=...`) — requires `OPENAI_API_KEY`
- Docker Compose for Postgres + Redis infra

## Run

```bash
npm install

# App only (in-memory)
npm run dev

# App + Postgres + Redis via Docker Compose
npm run dev -- --infrastructure

# With AI agent
OPENAI_API_KEY=sk-... npm run dev -- --infrastructure
```

## Environment

```env
PORT=3004
JWT_SECRET=change-me-in-production
DATABASE_URL=postgresql://fox:fox@localhost:5433/fullstack
REDIS_URL=redis://localhost:6380
OPENAI_API_KEY=sk-...          # optional — enables /ai/stream
OPENAI_MODEL=gpt-4o-mini
```

## API

```
POST  /auth/register      { email, password }
POST  /auth/login         { email, password }
GET   /auth/me            Authorization: Bearer <token>

GET   /posts
POST  /posts              Authorization: Bearer <token>  { title, body }
DELETE /posts/:id         Authorization: Bearer <token>

GET   /ai/stream?q=...    Authorization: Bearer <token>  (SSE)
GET   /health
```
