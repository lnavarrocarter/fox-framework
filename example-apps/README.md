# Fox Framework — Example Apps

Five runnable example apps demonstrating different aspects of Fox Framework.

| App | Description | Port | Infra |
|-----|-------------|------|-------|
| [`basic-api`](./basic-api) | Hello World — minimal HTTP server | 3000 | none |
| [`rest-api`](./rest-api) | CRUD todos with PostgreSQL | 3001 | Postgres |
| [`agent-chat`](./agent-chat) | Streaming AI chat (OpenAI / Ollama) | 3002 | Redis (optional) |
| [`event-sourcing`](./event-sourcing) | Bank account aggregate, event log | 3003 | Redis (optional) |
| [`fullstack`](./fullstack) | JWT auth + blog CRUD + AI agent | 3004 | Postgres + Redis |

## Quick start

Each app is self-contained. Navigate to its directory and run:

```bash
cd basic-api
npm install
npm run dev
```

For apps with infrastructure dependencies:

```bash
cd rest-api
npm install
npm run dev -- --infrastructure    # starts Docker Compose infra then the app
```

## Dev script options

All apps (except `basic-api`) use the same `scripts/dev.js` pattern:

```bash
npm run dev                                # app only
npm run dev -- --infrastructure            # infra + app
npm run dev -- --option infrastructure     # same as above
```

## Prerequisites

- Node 18+
- Docker + Docker Compose (for infra-dependent apps)
- `OPENAI_API_KEY` env var (for `agent-chat` and `fullstack` AI features)
