# Contributing

Fox 2 is a reduced Rust alpha. Read `docs/migration.md` before proposing a port
of a retired 1.x feature. Acceptance criteria live in `.dev/tasks/` and GitHub
issues; old task-completion percentages are not evidence for this version.

Use the toolchain pinned in `rust-toolchain.toml`. No Node.js or npm is required.
Run the validation commands in the README before opening a PR. Integration tests
bind loopback port zero and the CLI test compiles a generated project offline
using dependencies already fetched by Cargo.

Keep routing and middleware Fox-owned. Do not introduce an HTTP application
framework, unsafe code, unsupported adapters, implicit route prefixes or global
singleton state. Use typed errors, document public APIs, and add focused tests
for new behavior. New dependencies require a ticket explaining their purpose.

Server instances bind before serving. Respect body/concurrency limits, preserve
HEAD and method semantics, and await graceful shutdown. A security-related
feature needs its own design and tests; do not implement homegrown cryptography.

To preview documentation, run `cargo doc --no-deps --lib --open`. Rustdoc is the
API reference and is compiled in PR CI. Do not report unmeasured throughput,
coverage percentages or production readiness.
