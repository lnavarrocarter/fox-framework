# Rust replacement decision

## Context

The owner requested replacing the whole TypeScript framework with Rust, approved
a reduced new major version, permitted Hyper/Tokio and specialized libraries but
no external HTTP application framework, and requested removing Next.js.

## Decision

Fox owns its router/middleware and uses Hyper for HTTP/1.1 correctness, Tokio for
I/O, serde for JSON and tracing for diagnostics. Unported adapters are removed
and explicitly documented, rather than stubbed or falsely advertised.
Readiness is a successful bind, not a synchronous callback. State is owned per
app, not a singleton. Rustdoc is validated on PRs and replaces the website.

## Alternatives

A complete feature-parity port was declined in favor of a reduced Rust version.
Axum and Actix were declined to keep application framework behavior Fox-owned.
Handwriting an HTTP parser or cryptography was avoided in favor of maintained
protocol libraries and an explicit unsupported-feature boundary.

## Rationale

The alpha should demonstrate a runnable, tested contract without carrying
unsupported claims forward. A major-version boundary makes the intentional
removals visible. Published npm packages and Git history preserve the 1.x line.
