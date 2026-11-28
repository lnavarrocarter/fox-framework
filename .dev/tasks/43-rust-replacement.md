# Task 43: Rust replacement

Tracking issue: https://github.com/lnavarrocarter/fox-framework/issues/43

## Approved scope

Rust 2.0 is a deliberately reduced, breaking replacement, not a port with
TypeScript feature parity. No Axum, Actix or other HTTP application framework.
Fox owns routing, middleware and server configuration. Hyper handles HTTP/1.1;
Tokio handles asynchronous I/O and lifecycle. HTTP types/body utilities, bytes,
percent-encoding, serde and tracing supply protocol, JSON and logging primitives.
These dependencies are approved by this ticket.

## Acceptance criteria

- [x] Public factory, independent apps and explicitly bound server address.
- [x] Method routing, named parameters, deterministic precedence, HEAD and 405.
- [x] Asynchronous middleware with short-circuiting and typed handler errors.
- [x] Bounded bodies, request/header deadlines and connection concurrency.
- [x] Graceful shutdown with a bounded drain period and surfaced errors.
- [x] CLI creates a project that compiles against the local framework.
- [x] TypeScript, Next.js and unported packages retired; breaks documented.
- [x] Static rustdoc, CI, Docker example and accurate contributor instructions.
- [x] Formatting, Clippy, unit/integration tests and real HTTP smoke pass.
- [ ] Branch and PR published without merging or releasing.

No TLS, HTTP/2, WebSocket, database, authentication, cache, template, event,
agent, vector, OpenTelemetry or cloud adapters are promised in this version.
Existing 1.x sources remain in Git history and published npm packages.

## Local validation

Formatting, Clippy with warnings denied, 14 integration tests, one doctest,
rustdoc with warnings denied, distributable package verification and a real
HTTP smoke passed. The smoke checked ephemeral binding, health, decoded UTF-8,
HEAD, 404, 405, invalid environment settings and a successful SIGINT drain.
Docker base image manifests were verified; the local Docker socket is not
accessible to this user, so the container build must pass in PR CI.
