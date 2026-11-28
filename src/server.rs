use crate::{App, Bytes, Response, StatusCode, text};
use http::{HeaderValue, header};
use http_body_util::{BodyExt, Full, LengthLimitError, Limited};
use hyper::{
    body::{Body, Incoming},
    server::conn::http1,
    service::service_fn,
};
use hyper_util::rt::{TokioIo, TokioTimer};
use std::{convert::Infallible, future::Future, io, net::SocketAddr, sync::Arc};
use tokio::{
    net::TcpListener,
    sync::{Semaphore, watch},
    task::JoinSet,
    time::timeout,
};

/// A bound server. Readiness means `App::bind` has succeeded.
pub struct Server {
    pub(crate) listener: TcpListener,
    pub(crate) app: Arc<App>,
}

impl Server {
    /// Return the actual bound address, including an OS-assigned port.
    pub fn local_addr(&self) -> io::Result<SocketAddr> {
        self.listener.local_addr()
    }

    /// Accept HTTP/1.1 connections until `shutdown` resolves, then stop accepting,
    /// gracefully drain connections and enforce the configured shutdown deadline.
    ///
    /// Accept errors, connection-task panics and drain timeouts are returned.
    /// Malformed/disconnected individual clients are logged without stopping
    /// other connections.
    pub async fn serve_until<F: Future<Output = ()>>(self, shutdown: F) -> io::Result<()> {
        let slots = Arc::new(Semaphore::new(self.app.config.max_connections));
        let (stop, _) = watch::channel(false);
        let mut tasks = JoinSet::new();
        tokio::pin!(shutdown);
        let result = loop {
            tokio::select! {
                biased;
                _ = &mut shutdown => break Ok(()),
                result = tasks.join_next(), if !tasks.is_empty() => {
                    if let Some(Err(error)) = result {
                        break Err(io::Error::other(error));
                    }
                }
                accepted = self.listener.accept() => {
                    let (stream, peer) = match accepted {
                        Ok(accepted) => accepted,
                        Err(error) => break Err(error),
                    };
                    let Ok(slot) = slots.clone().try_acquire_owned() else {
                        tracing::warn!(%peer, "connection limit reached; closing client");
                        continue;
                    };
                    let app = self.app.clone();
                    let mut stopping = stop.subscribe();
                    tasks.spawn(async move {
                        let _slot = slot;
                        let mut builder = http1::Builder::new();
                        builder.timer(TokioTimer::new()).header_read_timeout(app.config.request_timeout);
                        let service = service_fn(move |request| handle(app.clone(), request, peer));
                        let connection = builder.serve_connection(TokioIo::new(stream), service);
                        tokio::pin!(connection);
                        tokio::select! {
                            result = &mut connection => {
                                if let Err(error) = result {
                                    tracing::warn!(%peer, %error, "HTTP connection ended with an error");
                                }
                            }
                            _ = stopping.changed() => {
                                connection.as_mut().graceful_shutdown();
                                if let Err(error) = connection.await {
                                    tracing::warn!(%peer, %error, "HTTP connection failed during shutdown");
                                }
                            }
                        }
                    });
                }
            }
        };
        drop(self.listener);
        stop.send_replace(true);
        let drained = timeout(self.app.config.shutdown_timeout, async {
            while let Some(result) = tasks.join_next().await {
                result.map_err(io::Error::other)?;
            }
            Ok::<_, io::Error>(())
        })
        .await;
        match drained {
            Ok(drain_result) => {
                result?;
                drain_result
            }
            Err(_) => {
                tasks.abort_all();
                while tasks.join_next().await.is_some() {}
                result?;
                Err(io::Error::new(
                    io::ErrorKind::TimedOut,
                    "connection drain deadline exceeded",
                ))
            }
        }
    }
}

async fn handle(
    app: Arc<App>,
    request: http::Request<Incoming>,
    peer: SocketAddr,
) -> Result<Response, Infallible> {
    let head = request.method() == http::Method::HEAD;
    let mut response = match timeout(app.config.request_timeout, process(&app, request, peer)).await
    {
        Ok(response) => response,
        Err(_) => {
            tracing::warn!(%peer, "request deadline exceeded");
            closing_response(StatusCode::REQUEST_TIMEOUT)
        }
    };
    if head {
        if !response.headers().contains_key(header::CONTENT_LENGTH)
            && let Some(length) = response.body().size_hint().exact()
        {
            response
                .headers_mut()
                .insert(header::CONTENT_LENGTH, HeaderValue::from(length));
        }
        *response.body_mut() = Full::new(Bytes::new());
    }
    Ok(response)
}

async fn process(app: &App, request: http::Request<Incoming>, peer: SocketAddr) -> Response {
    let (parts, body) = request.into_parts();
    let body = match Limited::new(body, app.config.max_body_bytes)
        .collect()
        .await
    {
        Ok(body) => body.to_bytes(),
        Err(error) => {
            if error.downcast_ref::<LengthLimitError>().is_some() {
                tracing::warn!(%peer, "request body limit exceeded");
                return closing_response(StatusCode::PAYLOAD_TOO_LARGE);
            }
            tracing::warn!(%peer, %error, "failed to read request body");
            return closing_response(StatusCode::BAD_REQUEST);
        }
    };
    match app
        .dispatch(http::Request::from_parts(parts, body), peer)
        .await
    {
        Ok(response) => response,
        Err(error) => error.into_response(),
    }
}

fn closing_response(status: StatusCode) -> Response {
    let mut response = text(status.canonical_reason().unwrap_or("Request rejected"));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert(header::CONNECTION, HeaderValue::from_static("close"));
    response
}
