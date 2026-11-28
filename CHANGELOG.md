# Changelog

## 2.0.0-alpha.1 - Rust replacement (unreleased)

Breaking, intentionally reduced replacement of the TypeScript/Node.js
implementation. This change does not modify or unpublish existing npm releases.

Added a public independent `FoxFactory`, owned app builder, Fox router and async
middleware over Hyper/Tokio, typed request/response/error APIs, exact route
paths, named parameters, HEAD/405 handling, request and connection limits,
bounded shutdown, a Rust project CLI, integration tests and rustdoc CI.

Removed TypeScript, npm manifests, Next.js, legacy deployment workflows,
unported ecosystem packages and unsupported readiness/performance claims.
See `docs/migration.md` for the complete compatibility boundary.

No release, feature-parity, benchmark or production-readiness claim is made.
The 1.x history is preserved in Git.
