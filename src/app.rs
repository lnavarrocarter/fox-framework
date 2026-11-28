use crate::{
    ConfigError, HttpError, Method, Request, Response, RouteError, Server,
    middleware::{Handler, Middleware, Next},
    router::{self, Route},
};
use std::{future::Future, io, net::SocketAddr, sync::Arc, time::Duration};
use tokio::net::TcpListener;

/// Server limits and the address actually passed to `TcpListener::bind`.
#[derive(Clone, Debug)]
pub struct ServerConfig {
    /// Bind address. Port zero requests an OS-assigned port.
    pub listen_addr: SocketAddr,
    /// Maximum buffered request bytes. Defaults to 1 MiB.
    pub max_body_bytes: usize,
    /// Deadline for reading headers and, separately, body plus handler execution.
    pub request_timeout: Duration,
    /// Maximum time to drain existing connections on shutdown.
    pub shutdown_timeout: Duration,
    /// Maximum number of concurrently accepted connections.
    pub max_connections: usize,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            listen_addr: SocketAddr::from(([127, 0, 0, 1], 3000)),
            max_body_bytes: 1024 * 1024,
            request_timeout: Duration::from_secs(30),
            shutdown_timeout: Duration::from_secs(10),
            max_connections: 1024,
        }
    }
}

/// Factory for independent application instances; no global singleton.
pub struct FoxFactory;

impl FoxFactory {
    /// Validate configuration and create a new app without binding any sockets.
    pub fn create(config: ServerConfig) -> Result<App, ConfigError> {
        if config.max_body_bytes == 0 || config.max_body_bytes > isize::MAX as usize {
            return Err(ConfigError(
                "max_body_bytes must be between 1 and isize::MAX",
            ));
        }
        if config.request_timeout.is_zero() || config.shutdown_timeout.is_zero() {
            return Err(ConfigError(
                "request and shutdown timeouts must be positive",
            ));
        }
        let now = std::time::Instant::now();
        if now.checked_add(config.request_timeout).is_none()
            || now.checked_add(config.shutdown_timeout).is_none()
        {
            return Err(ConfigError("timeouts exceed the supported clock range"));
        }
        if config.max_connections == 0
            || config.max_connections > tokio::sync::Semaphore::MAX_PERMITS
        {
            return Err(ConfigError(
                "max_connections is outside the supported range",
            ));
        }
        Ok(App {
            config,
            routes: Vec::new(),
            middleware: Vec::new(),
        })
    }
}

/// An owned application builder with a Fox router and middleware pipeline.
pub struct App {
    pub(crate) config: ServerConfig,
    pub(crate) routes: Vec<Route>,
    pub(crate) middleware: Vec<Middleware>,
}

impl App {
    /// Register an async route. Paths are exact and never gain an `/api` prefix.
    ///
    /// `:name` matches one nonempty segment. Literal segments take precedence
    /// over parameters independently of registration order.
    pub fn route<F, Fut>(
        mut self,
        method: Method,
        path: &str,
        handler: F,
    ) -> Result<Self, RouteError>
    where
        F: Fn(Request) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<Response, HttpError>> + Send + 'static,
    {
        let handler: Handler = Arc::new(move |request| Box::pin(handler(request)));
        router::register(&mut self.routes, Route::new(method, path, handler)?)?;
        Ok(self)
    }

    /// Append a global asynchronous middleware, including for 404/405 responses.
    pub fn middleware<F, Fut>(mut self, middleware: F) -> Self
    where
        F: Fn(Request, Next) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<Response, HttpError>> + Send + 'static,
    {
        self.middleware.push(Arc::new(move |request, next| {
            Box::pin(middleware(request, next))
        }));
        self
    }

    /// Bind the configured address before returning. Binding errors propagate.
    /// Call `Server::local_addr` to obtain the bound address, then serve requests.
    pub async fn bind(self) -> io::Result<Server> {
        let listener = TcpListener::bind(self.config.listen_addr).await?;
        Ok(Server {
            listener,
            app: Arc::new(self),
        })
    }

    pub(crate) async fn dispatch(
        &self,
        inner: http::Request<crate::Bytes>,
        peer_addr: SocketAddr,
    ) -> Result<Response, HttpError> {
        let (handler, params) = router::resolve(&self.routes, inner.method(), inner.uri().path())?;
        let next = Next {
            middleware: Arc::new(self.middleware.clone()),
            index: 0,
            handler,
        };
        next.run(Request {
            inner,
            params,
            peer_addr,
        })
        .await
    }
}
