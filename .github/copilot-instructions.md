# Fox Framework contributor instructions

Fox 2 is a reduced Rust alpha replacing TypeScript, not a feature-parity port.
Read `docs/migration.md`, `docs/architecture/overview.md` and the relevant
`.dev/tasks/` ticket before changes. New dependencies need ticket justification.

Use the pinned Rust toolchain and types exported by `src/lib.rs`. Keep routing
and middleware Fox-owned; do not add Axum, Actix or another HTTP application
framework. Use owned app instances, typed errors and explicit configuration.
No unsafe code, silent failures, homegrown HTTP parser or cryptography.

Document public APIs, update the migration boundary for breaking changes and
add focused tests. Run fmt, Clippy with warnings denied, all target tests,
doctests and rustdoc with warnings denied as listed in README.md.
The CLI test must compile generated apps; server tests must use ephemeral
loopback ports and await shutdown.

Do not restore unsupported 1.x feature claims, fabricated metrics or obsolete
npm commands. Update ticket criteria only after validation and record significant
architecture decisions in `.dev/lessons_learned/`.
