//! Asynchronous middleware. Registration order is request order; responses unwind
//! in reverse order. A middleware may return without calling `Next::run`.

use crate::{HttpError, Request, Response};
use http::{HeaderValue, header};
use std::{future::Future, pin::Pin, sync::Arc, time::Instant};

pub(crate) type HandlerFuture = Pin<Box<dyn Future<Output = Result<Response, HttpError>> + Send>>;
pub(crate) type Handler = Arc<dyn Fn(Request) -> HandlerFuture + Send + Sync>;
pub(crate) type Middleware = Arc<dyn Fn(Request, Next) -> HandlerFuture + Send + Sync>;

/// The remaining middleware pipeline followed by the matched route.
pub struct Next {
    pub(crate) middleware: Arc<Vec<Middleware>>,
    pub(crate) index: usize,
    pub(crate) handler: Handler,
}

impl Next {
    /// Execute the next middleware or route handler exactly once.
    pub async fn run(self, request: Request) -> Result<Response, HttpError> {
        if let Some(middleware) = self.middleware.get(self.index).cloned() {
            let next = Self {
                index: self.index + 1,
                ..self
            };
            middleware(request, next).await
        } else {
            (self.handler)(request).await
        }
    }
}

/// Log method, path (without query), status and duration through `tracing`.
pub async fn request_logging(request: Request, next: Next) -> Result<Response, HttpError> {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let start = Instant::now();
    let result = next.run(request).await;
    let status = match &result {
        Ok(response) => response.status(),
        Err(error) => error.status(),
    };
    tracing::info!(%method, %path, status = status.as_u16(), elapsed_ms = start.elapsed().as_millis(), "HTTP request");
    result
}

/// Add conservative response headers, including on handler failures.
///
/// This is not authentication, CSRF protection, CORS or TLS configuration.
pub async fn security_headers(request: Request, next: Next) -> Result<Response, HttpError> {
    let mut response = match next.run(request).await {
        Ok(response) => response,
        Err(error) => error.into_response(),
    };
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("no-referrer"),
    );
    Ok(response)
}
