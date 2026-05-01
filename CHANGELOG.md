# Changelog

All notable changes to Fox Framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-05-01

### Major Features

#### AI Agents System (`tsfox/core/agents/`)
A complete AI agent architecture built into the core framework.

- **ReActAgent** — Reasoning + Acting loop (Thought → Action → Observation) with tool dispatch, memory, and AbortController support
- **Orchestrator** — LLM-driven multi-agent planner with wave-based execution, dependency resolution, and concurrency cap
- **BaseAgent** — Abstract base with status tracking, tool registry, and memory integration
- **InMemoryStore** — Keyword-scored semantic search for agent memory
- **Agent Integrations**:
  - `event.integration.ts` — Lifecycle events via IEventEmitter/IEventBus; agents as event subscribers
  - `auth.integration.ts` — Token-validated agents with role enforcement and per-user rate limiting
  - `cache.integration.ts` — SHA-256 keyed response cache with TTL eviction
  - `metrics.integration.ts` — Per-agent metrics: totalRuns, success/fail, totalTokens, avgLatency, p95, lastRunAt
- 53 tests (22 core + 31 integrations)

#### Model Providers (zero vendor SDKs, fetch-native)
- **`@foxframework/model-openai`** — OpenAI `/chat/completions`, tool calls, SSE streaming, Organization header, custom baseUrl (9 tests)
- **`@foxframework/model-anthropic`** — Anthropic `/messages`, tool_use blocks, SSE streaming, system extraction, anthropic-version header (8 tests)
- **`@foxframework/model-ollama`** — Ollama `/api/chat`, ndjson streaming, keep_alive, options passthrough (10 tests)

#### Serverless Adapters (`@foxframework/serverless`)
- **LambdaAdapter** — AWS API Gateway v1/v2/FunctionURL, binary base64, query string handling, multiValueHeaders fix
- **VercelAdapter** — Vercel serverless function adapter
- **GcpAdapter** — Google Cloud Functions HTTP adapter
- **`coldStartMiddleware`** — Cold start detection with `onColdStart()` callbacks and `createServerlessHandler()` factory
- 19 tests

#### Event System Enhancements (Epic A)
- **CQRS**: `CommandBus` and `QueryBus` with typed errors and handler registry
- **Event Sourcing**: `AggregateRoot` with `raise()`, `InMemoryEventSourcingRepository` with auto-snapshots (every 50 events), `ProjectionManager`, `SagaManager`
- **Adapters**: `SseAdapter` (zero-dep SSE), `RedisEventAdapter` (ioredis lazy peer dep — does not fail if not installed)
- **Middleware**: `EventLoggingMiddleware` (priority=100), `EventMetricsMiddleware` (priority=10, real latency, rolling RPS)
- 46 tests

### Packages Added
| Package | Description |
|---|---|
| `@foxframework/serverless` | AWS Lambda, Vercel, and GCP adapters |
| `@foxframework/model-openai` | OpenAI model provider (fetch-native) |
| `@foxframework/model-anthropic` | Anthropic model provider (fetch-native) |
| `@foxframework/model-ollama` | Ollama model provider (fetch-native) |

### CI/CD Updates
- Build and publish steps now include: `serverless`, `model-openai`, `model-anthropic`, `model-ollama`
- Publish summary updated to include all package categories

---

## [1.2.0] - 2026-04-15

### Major Features

#### Authentication Ecosystem
- **`@foxframework/auth-jwt`** — JWT provider with access/refresh tokens, role/permission claims
- **`@foxframework/auth-2fa`** — TOTP-based two-factor authentication (RFC 6238)
- **`@foxframework/auth-oauth`** — OAuth 2.0 / OpenID Connect provider
- **`@foxframework/auth-cognito`** — AWS Cognito provider
- **`@foxframework/auth-firebase`** — Firebase Authentication provider
- **`@foxframework/auth-ldap`** — LDAP/Active Directory provider
- Core auth interfaces: `IAuthProvider`, `ITokenValidator`, `AuthUser`, `AuthToken`
- Middleware: `createAuthMiddleware`, `requireRoles`, `requirePermissions`
- 112 tests

#### Database Ecosystem
- **`@foxframework/db-postgres`** — PostgreSQL adapter
- **`@foxframework/db-mysql`** — MySQL/MariaDB adapter
- **`@foxframework/db-sqlite`** — SQLite adapter
- **`@foxframework/db-mongo`** — MongoDB adapter
- **`@foxframework/db-redis`** — Redis adapter
- **`@foxframework/db-rds`** — AWS RDS adapter
- **`@foxframework/db-documentdb`** — AWS DocumentDB adapter
- **`@foxframework/db-dynamodb`** — AWS DynamoDB adapter

### CI/CD
- Automated `npm publish` on GitHub Release via `NODE_AUTH_TOKEN`
- All 14 packages (8 DB + 6 Auth) built in dependency order

---

## [1.1.0] - 2026-03-01

### Added
- Core framework stabilization
- Express integration layer
- Template engine (Handlebars)
- CLI tools (`tsfox` binary)
- Plugin system
- Logging and monitoring utilities
- Docker integration

---

## [1.0.0] - 2026-01-01

### Added
- Initial release of Fox Framework
- Modular routing system
- Middleware pipeline
- TypeScript-first design
- Factory pattern architecture
- Basic CLI scaffolding

---

## Roadmap

### [1.4.0] — Planned
- **Agent Tools Library** — Pre-built tools: HTTP, filesystem, SQL query, vector search
- **Vector Store Integration** — `@foxframework/vector-{pinecone,weaviate,chroma}` for semantic memory
- **Streaming UI** — SSE-based streaming response helper for AI output
- **Agent Observability** — OpenTelemetry traces per agent run, span per tool call

### [1.5.0] — Planned
- **Workflow Engine** — Durable multi-step workflows with checkpoint/resume
- **@foxframework/mcp** — Model Context Protocol (MCP) server/client implementation
- **GraphQL Layer** — Native GraphQL schema generation from Fox controllers
- **WebSocket Support** — First-class WebSocket channels alongside HTTP routes

### [2.0.0] — Future
- **Edge Runtime Support** — Cloudflare Workers / Deno Deploy compatibility
- **Database Migrations** — Built-in migration runner integrated with db-* packages
- **Schema Validation at Runtime** — Zod/Valibot integration in request pipeline
- **Fox Studio** — Visual dev tool for agent orchestration and event flow inspection
