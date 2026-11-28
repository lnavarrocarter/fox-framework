# Migrating from Fox 1.x to Rust 2

## Compatibility boundary

This is a deliberately reduced Rust alpha, not a translation of all 1.x
functionality. Existing JavaScript/TypeScript programs cannot import this crate.
It has no Node bindings and the Rust version is not published to crates.io yet.
Do not upgrade an existing npm application expecting compatibility.

The complete previous tree is preserved at
`fd888a62bd762a986094cfb9b9ca9a216034a3c0`. Existing published npm packages remain
unchanged. Use a separate checkout of that revision if maintaining a 1.x app.

| Former component | Rust 2 status |
| --- | --- |
| FoxFactory and configuration | Replaced by public owned `FoxFactory`, `App`, `ServerConfig`, `Server` |
| Express HTTP and routing | Hyper HTTP/1.1 and a Fox-owned router; no automatic `/api` prefix |
| Middleware and errors | Async `Request`/`Next`, typed `HttpError`; private internal errors |
| Request logging | Optional tracing middleware; no query-string logging |
| JSON validation | serde JSON decoding, not the former schema builder |
| Security | Optional response headers only; no auth, CORS, CSRF, RBAC or rate limiter |
| CLI | `fox new` Rust scaffold only; no legacy `tsfox` generation/deployment commands |
| PostgreSQL/MySQL/SQLite/Mongo/Redis/RDS/DocumentDB/DynamoDB | Not ported; all eight adapters retired |
| JWT/2FA/OAuth/Cognito/Firebase/LDAP | Not ported; all six auth adapters retired |
| Anthropic/OpenAI/Ollama agents, vector backends, OpenTelemetry | Not ported; packages retired |
| Templates, cache, event sourcing/CQRS, plugins, resilience/microservices | Not ported |
| Serverless/cloud orchestration and monitoring stack | Not ported |
| Next.js/Nextra website | Removed; generated static rustdoc replaces it |

Application-specific integrations can be captured in handler closures with `Arc`,
but Fox supplies no adapters and makes no feature-parity claim.

## New lifecycle

`FoxFactory::create` validates an owned configuration. `App::route` rejects
ambiguous routes. `App::bind().await` actually binds the configured address and
returns a `Server`; binding errors propagate. Port zero selects an ephemeral
port, available from `Server::local_addr`. There is no singleton or early
`listen` callback. `Server::serve_until` stops accepting on the shutdown signal,
drains active connections and returns a timeout error if draining exceeds the
configured deadline.

Routes are exact, case-sensitive paths. Trailing slashes are significant.
Literal path segments take precedence over parameters, even if a less-specific
route handles a different method. `:name` captures a nonempty segment,
percent-decodes it to UTF-8 and does not include the query. Encoded slashes in
parameters are values, not additional path segments. No wildcard, regex,
parameterized host, route group, implicit CORS or automatic OPTIONS is supplied.

Register middleware in request order; responses unwind in reverse order.
Middleware may short-circuit without executing the route. HTTP parsing, body
limits and request deadlines happen outside the app middleware pipeline.

## Operational limits

Defaults: loopback port 3000, 1 MiB buffered bodies, 30-second header deadline,
another 30-second deadline for body plus handler, 1,024 accepted concurrent
connections and a 10-second shutdown drain. Excess connections are closed and
logged. Oversized bodies return 413 and timed-out requests return 408 with the
connection closed. Incomplete/malformed headers may be rejected by Hyper before
app middleware executes.

Handler futures must be nonblocking and cooperative: deadlines cannot preempt
blocking Rust code. Use `spawn_blocking` or an external job worker where needed.
The server buffers complete request and response bodies; it does not offer
streaming, TLS, HTTP/2, HTTP/3, WebSocket or upgrade APIs. Public deployments need
a TLS reverse proxy and application-specific authentication/authorization.

Internal handler error messages are logged but never sent to clients. Configure
a tracing subscriber in the application; no external telemetry exporter is
included. Do not put secrets in error messages.

## Development and pending GitHub work

Use Cargo, not npm. Run all validation commands from the README. Generate
applications using `fox new <directory> --framework-path <checkout>` until the
Rust crate is published. Static rustdoc is validated on PRs and only deployed
from `main`; there is no Next.js upgrade to perform.

The 17 open npm Dependabot PRs, including #42, become obsolete **when this
replacement is merged**. They are not automatically closed by this branch.
Cargo and GitHub Actions update configuration replaces npm maintenance.
GitHub Projects could not be inspected with the current token (`read:project`
was unavailable); no Projects items were modified.

There are no throughput, memory, coverage or production-readiness guarantees.
The new tests validate the reduced Rust contract, not the removed 1.x features.
