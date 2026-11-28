# Rust architecture

```text
TcpListener -> Hyper HTTP/1.1 -> bounded body/deadline -> Fox route resolution
            -> Fox middleware -> async handler -> complete HTTP response
```

`FoxFactory` validates `ServerConfig` and creates independent `App` builders.
Route and middleware closures are `Send + Sync` and own captured dependencies.
`App::bind` creates a socket before returning an owned `Server`. No process-wide
singleton, hidden server instance or handler registry exists.

The router is implemented in `src/router.rs`. It compares literal/parameter
segments lexicographically, selects the most specific path independently of the
HTTP method, and supports explicit HEAD or GET fallback. Equivalent parameter
patterns for the same method are rejected at registration.

`Next` is an owned, one-use continuation. Middleware futures can return an error,
modify a response, or omit the continuation to short-circuit. The app maps
internal errors to sanitized JSON responses.

The server limits buffered bodies and accepted connections, applies read/request
deadlines, and drains Hyper connections through a watch signal and task set.
Individual protocol/disconnect failures are logged; accept errors, task panics
and drain failures are surfaced to the owner.

Hyper and Tokio are infrastructure libraries, not application routers. Fox has
no dependency on Axum, Actix, tower routing, Express, Node.js or Next.js.
See the migration guide for explicitly unsupported features.
