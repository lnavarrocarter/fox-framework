# Fox Framework

Fox 2.0.0-alpha.1 is a **breaking, reduced Rust replacement** for the former
TypeScript framework. It is not feature-compatible with Fox 1.x and has not
been released to crates.io. The npm packages are not Rust bindings.

Fox owns its router, middleware pipeline and server lifecycle. Hyper supplies
HTTP/1.1 protocol handling and Tokio supplies asynchronous I/O. No Axum, Actix
or other HTTP application framework is used.

## Run from source

Install Rust with rustup, then:
Before this migration is merged, check out `migration/rust-framework` before
running Cargo commands.

```sh
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework
cargo run --locked --example hello
# In another terminal:
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/hello/Fox
```

The example listens on `127.0.0.1:3000`. Override it with `FOX_ADDR`, for example
`FOX_ADDR=127.0.0.1:8080 cargo run --locked --example hello`.
Ctrl-C stops accepting connections and drains active requests.

## Public API

```no_run
use fox_framework::{FoxFactory, Method, ServerConfig, json, middleware};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = ServerConfig {
        listen_addr: "127.0.0.1:8080".parse()?,
        ..ServerConfig::default()
    };
    let app = FoxFactory::create(config)?
        .middleware(middleware::security_headers)
        .route(Method::GET, "/hello/:name", |request| async move {
            json(&serde_json::json!({ "hello": request.param("name") }))
        })?;
    let server = app.bind().await?;
    println!("Ready at {}", server.local_addr()?);
    server.serve_until(async {
        tokio::signal::ctrl_c().await.expect("cannot receive Ctrl-C");
    }).await?;
    Ok(())
}
```

The factory is publicly exported, instances are independent, paths have no
implicit `/api` prefix, and readiness is established by successful binding, not
an early callback. Capture an `Arc` in handlers to share application state.

## Create an application

Before a crates.io release, generate against a local checkout:

```sh
cargo run --locked --bin fox -- new ../my-app --framework-path .
cd ../my-app
cargo run
```

Or install the CLI locally with `cargo install --path . --locked` and run
`fox new ../my-app --framework-path /absolute/path/to/fox-framework`.
The CLI never overwrites an existing directory. Omitting `--framework-path`
generates a crates.io dependency; that only works after this version is published.
There is no `npx`, npm runtime, deployment command or controller generator.

## Supported scope

- HTTP/1.1 method routing, named UTF-8 parameters and deterministic literal precedence.
- GET-to-HEAD fallback, explicit HEAD handlers, 404 and 405 with `Allow`.
- Async middleware, short-circuiting, typed JSON and explicit handler errors.
- Body limits, header/request deadlines, connection limits and bounded graceful shutdown.
- Tracing request logging and optional conservative response headers.
- A Rust project CLI, runnable example, Cargo tests and static rustdoc.

Authentication, databases, agents, vectors, templates, caching, events, plugins,
cloud deployment and the Next.js website are **not ported**. TLS, HTTP/2 and
WebSockets are also outside this alpha. Put public deployments behind an
appropriately configured TLS reverse proxy. Header middleware is not an
authentication or CSRF system. No benchmark, coverage or production-readiness
claims are made.

## Validation and documentation

```sh
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --all-targets --locked
cargo test --doc --locked
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --lib --locked
cargo doc --no-deps --lib --open
```

See the [migration guide](https://github.com/lnavarrocarter/fox-framework/blob/main/docs/migration.md),
[architecture](https://github.com/lnavarrocarter/fox-framework/blob/main/docs/architecture/overview.md)
and [contributing guide](https://github.com/lnavarrocarter/fox-framework/blob/main/CONTRIBUTING.md).
The documentation workflow builds rustdoc on PRs and deploys static pages only
after a push to `main` or a manual run on `main`.

MIT licensed. Historical TypeScript sources are available in Git history at
`fd888a62bd762a986094cfb9b9ca9a216034a3c0`.
