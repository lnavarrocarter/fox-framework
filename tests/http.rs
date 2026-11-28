use fox_framework::{
    App, FoxFactory, HttpError, Method, ServerConfig, StatusCode, json, middleware, text,
};
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    sync::oneshot,
    task::JoinHandle,
    time::timeout,
};

struct Running {
    address: SocketAddr,
    shutdown: oneshot::Sender<()>,
    task: JoinHandle<std::io::Result<()>>,
}

fn app() -> App {
    FoxFactory::create(ServerConfig {
        listen_addr: SocketAddr::from(([127, 0, 0, 1], 0)),
        ..ServerConfig::default()
    })
    .unwrap()
}

async fn start(app: App) -> Running {
    let server = app.bind().await.unwrap();
    let address = server.local_addr().unwrap();
    let (shutdown, receiver) = oneshot::channel();
    let task = tokio::spawn(server.serve_until(async {
        let _ = receiver.await;
    }));
    Running {
        address,
        shutdown,
        task,
    }
}

async fn request(address: SocketAddr, request: &str) -> String {
    timeout(Duration::from_secs(5), async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        stream.write_all(request.as_bytes()).await.unwrap();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        String::from_utf8(response).unwrap()
    })
    .await
    .expect("HTTP test deadline exceeded")
}

async fn get(address: SocketAddr, path: &str) -> String {
    request(
        address,
        &format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"),
    )
    .await
}

async fn stop(server: Running) {
    server.shutdown.send(()).unwrap();
    timeout(Duration::from_secs(5), server.task)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn public_factory_binds_independent_instances_and_exact_paths() {
    let first = start(
        app()
            .route(Method::GET, "/", |_| async { Ok(text("first")) })
            .unwrap(),
    )
    .await;
    let second = start(
        app()
            .route(Method::GET, "/", |_| async { Ok(text("second")) })
            .unwrap(),
    )
    .await;
    assert_ne!(first.address, second.address);
    assert!(get(first.address, "/").await.ends_with("first"));
    assert!(get(second.address, "/").await.ends_with("second"));
    assert!(
        get(first.address, "/api/")
            .await
            .starts_with("HTTP/1.1 404")
    );
    stop(first).await;
    stop(second).await;
}

#[tokio::test]
async fn literal_routes_win_parameters_decode_and_methods_are_explicit() {
    let server = start(
        app()
            .route(Method::GET, "/users/:id", |request| async move {
                Ok(text(request.param("id").unwrap().to_owned()))
            })
            .unwrap()
            .route(Method::GET, "/users/new", |_| async { Ok(text("literal")) })
            .unwrap()
            .route(Method::POST, "/users/:id", |_| async { Ok(text("post")) })
            .unwrap(),
    )
    .await;
    assert!(get(server.address, "/users/new").await.ends_with("literal"));
    assert!(
        get(server.address, "/users/Jos%C3%A9?unused=1")
            .await
            .ends_with("José")
    );
    assert!(
        get(server.address, "/users/%FF")
            .await
            .starts_with("HTTP/1.1 400")
    );
    assert!(
        get(server.address, "/users/")
            .await
            .starts_with("HTTP/1.1 404")
    );
    assert!(
        get(server.address, "/users/new/")
            .await
            .starts_with("HTTP/1.1 404")
    );
    let wrong_method = request(server.address, "POST /users/new HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Length: 0\r\n\r\n").await;
    assert!(wrong_method.starts_with("HTTP/1.1 405"));
    assert!(wrong_method.to_lowercase().contains("allow: get, head\r\n"));
    let head = request(
        server.address,
        "HEAD /users/new HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
    )
    .await;
    assert!(head.starts_with("HTTP/1.1 200"));
    assert!(head.to_lowercase().contains("content-length: 7\r\n"));
    assert!(head.ends_with("\r\n\r\n"));
    stop(server).await;
}

#[tokio::test]
async fn explicit_head_handler_overrides_get() {
    let server = start(
        app()
            .route(Method::GET, "/", |_| async { Ok(text("get")) })
            .unwrap()
            .route(Method::HEAD, "/", |_| async {
                let mut response = text("head");
                *response.status_mut() = StatusCode::ACCEPTED;
                Ok(response)
            })
            .unwrap(),
    )
    .await;
    let response = request(
        server.address,
        "HEAD / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
    )
    .await;
    assert!(response.starts_with("HTTP/1.1 202"));
    assert!(response.ends_with("\r\n\r\n"));
    stop(server).await;
}

#[test]
fn ambiguous_routes_and_invalid_configuration_are_rejected() {
    assert!(
        app()
            .route(Method::GET, "/:id", |_| async { Ok(text("")) })
            .unwrap()
            .route(Method::GET, "/:name", |_| async { Ok(text("")) })
            .is_err()
    );
    for path in ["relative", "/:id/:id", "/:", "/files/*", "/path?query=1"] {
        assert!(
            app()
                .route(Method::GET, path, |_| async { Ok(text("")) })
                .is_err(),
            "{path}"
        );
    }
    let config = ServerConfig {
        max_body_bytes: 0,
        ..ServerConfig::default()
    };
    assert!(FoxFactory::create(config).is_err());
    let config = ServerConfig {
        request_timeout: Duration::ZERO,
        ..ServerConfig::default()
    };
    assert!(FoxFactory::create(config).is_err());
    let config = ServerConfig {
        max_connections: 0,
        ..ServerConfig::default()
    };
    assert!(FoxFactory::create(config).is_err());
    let config = ServerConfig {
        shutdown_timeout: Duration::MAX,
        ..ServerConfig::default()
    };
    assert!(FoxFactory::create(config).is_err());
    assert!(
        app()
            .route(Method::GET, "/has space", |_| async { Ok(text("")) })
            .is_err()
    );
}

#[tokio::test]
async fn middleware_unwinds_in_order_and_can_short_circuit() {
    let events = Arc::new(Mutex::new(Vec::new()));
    let outer_events = events.clone();
    let inner_events = events.clone();
    let server = start(
        app()
            .middleware(move |request, next| {
                let events = outer_events.clone();
                async move {
                    events.lock().unwrap().push("outer-in");
                    let response = next.run(request).await;
                    events.lock().unwrap().push("outer-out");
                    response
                }
            })
            .middleware(move |request, next| {
                let events = inner_events.clone();
                async move {
                    events.lock().unwrap().push("inner-in");
                    if request.headers().contains_key("x-deny") {
                        return Err(HttpError::forbidden("blocked"));
                    }
                    let response = next.run(request).await;
                    events.lock().unwrap().push("inner-out");
                    response
                }
            })
            .route(Method::GET, "/", |_| async { Ok(text("route")) })
            .unwrap(),
    )
    .await;
    assert!(get(server.address, "/").await.ends_with("route"));
    assert_eq!(
        *events.lock().unwrap(),
        ["outer-in", "inner-in", "inner-out", "outer-out"]
    );
    events.lock().unwrap().clear();
    let blocked = request(
        server.address,
        "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nX-Deny: 1\r\n\r\n",
    )
    .await;
    assert!(blocked.starts_with("HTTP/1.1 403"));
    assert_eq!(
        *events.lock().unwrap(),
        ["outer-in", "inner-in", "outer-out"]
    );
    stop(server).await;
}

#[tokio::test]
async fn typed_json_and_internal_errors_are_handled_without_leaks() {
    let server = start(
        app()
            .middleware(middleware::security_headers)
            .route(Method::POST, "/echo", |request| async move {
                let body: serde_json::Value = request.json()?;
                json(&body)
            })
            .unwrap()
            .route(Method::GET, "/error", |_| async {
                Err(HttpError::internal("private database credentials"))
            })
            .unwrap(),
    )
    .await;
    let valid = request(server.address, "POST /echo HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: 7\r\n\r\n{\"n\":1}").await;
    assert!(valid.starts_with("HTTP/1.1 200"));
    assert!(valid.ends_with("{\"n\":1}"));
    let invalid = request(server.address, "POST /echo HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: 1\r\n\r\n{").await;
    assert!(invalid.starts_with("HTTP/1.1 400"));
    let missing_type = request(server.address, "POST /echo HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Length: 2\r\n\r\n{}").await;
    assert!(missing_type.starts_with("HTTP/1.1 400"));
    let internal = get(server.address, "/error").await;
    assert!(internal.starts_with("HTTP/1.1 500"));
    assert!(internal.contains("Internal Server Error"));
    assert!(!internal.contains("private database"));
    assert!(
        internal
            .to_lowercase()
            .contains("x-content-type-options: nosniff\r\n")
    );
    assert!(
        get(server.address, "/missing")
            .await
            .to_lowercase()
            .contains("x-frame-options: deny\r\n")
    );
    stop(server).await;
}

#[tokio::test]
async fn body_limit_applies_to_content_length_and_chunked_requests() {
    let config = ServerConfig {
        max_body_bytes: 4,
        listen_addr: ([127, 0, 0, 1], 0).into(),
        ..ServerConfig::default()
    };
    let server = start(
        FoxFactory::create(config)
            .unwrap()
            .route(Method::POST, "/", |request| async move {
                Ok(text(request.body().clone()))
            })
            .unwrap(),
    )
    .await;
    let exact = request(
        server.address,
        "POST / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Length: 4\r\n\r\n1234",
    )
    .await;
    assert!(exact.starts_with("HTTP/1.1 200"));
    for body in [
        "Content-Length: 5\r\n\r\n12345",
        "Transfer-Encoding: chunked\r\n\r\n3\r\n123\r\n2\r\n45\r\n0\r\n\r\n",
    ] {
        let response = request(
            server.address,
            &format!("POST / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n{body}"),
        )
        .await;
        assert!(response.starts_with("HTTP/1.1 413"));
    }
    stop(server).await;
}

#[tokio::test]
async fn request_deadline_and_bind_failures_are_visible() {
    let config = ServerConfig {
        request_timeout: Duration::from_millis(50),
        listen_addr: ([127, 0, 0, 1], 0).into(),
        ..ServerConfig::default()
    };
    let server = start(
        FoxFactory::create(config)
            .unwrap()
            .route(Method::GET, "/", |_| async {
                tokio::time::sleep(Duration::from_secs(1)).await;
                Ok(text("too late"))
            })
            .unwrap(),
    )
    .await;
    assert!(get(server.address, "/").await.starts_with("HTTP/1.1 408"));
    let config = ServerConfig {
        listen_addr: server.address,
        ..ServerConfig::default()
    };
    assert!(FoxFactory::create(config).unwrap().bind().await.is_err());
    stop(server).await;
}

#[tokio::test]
async fn graceful_shutdown_waits_for_an_in_flight_request() {
    let (entered, mut started) = tokio::sync::mpsc::channel(1);
    let server = start(
        app()
            .route(Method::GET, "/", move |_| {
                let entered = entered.clone();
                async move {
                    entered.send(()).await.unwrap();
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    Ok(text("drained"))
                }
            })
            .unwrap(),
    )
    .await;
    let address = server.address;
    let response = tokio::spawn(async move { get(address, "/").await });
    started.recv().await.unwrap();
    server.shutdown.send(()).unwrap();
    assert!(response.await.unwrap().ends_with("drained"));
    server.task.await.unwrap().unwrap();
    assert!(TcpStream::connect(address).await.is_err());
}

#[tokio::test]
async fn shutdown_deadline_returns_an_error() {
    let (entered, mut started) = tokio::sync::mpsc::channel(1);
    let config = ServerConfig {
        shutdown_timeout: Duration::from_millis(30),
        listen_addr: ([127, 0, 0, 1], 0).into(),
        ..ServerConfig::default()
    };
    let server = start(
        FoxFactory::create(config)
            .unwrap()
            .route(Method::GET, "/", move |_| {
                let entered = entered.clone();
                async move {
                    entered.send(()).await.unwrap();
                    std::future::pending::<()>().await;
                    Ok(text(""))
                }
            })
            .unwrap(),
    )
    .await;
    let mut connection = TcpStream::connect(server.address).await.unwrap();
    connection
        .write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")
        .await
        .unwrap();
    started.recv().await.unwrap();
    server.shutdown.send(()).unwrap();
    let error = server.task.await.unwrap().unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::TimedOut);
}

#[tokio::test]
async fn incomplete_bodies_time_out_and_incomplete_headers_are_closed() {
    let config = ServerConfig {
        request_timeout: Duration::from_millis(50),
        listen_addr: ([127, 0, 0, 1], 0).into(),
        ..ServerConfig::default()
    };
    let server = start(
        FoxFactory::create(config)
            .unwrap()
            .route(Method::POST, "/", |_| async { Ok(text("complete")) })
            .unwrap(),
    )
    .await;
    let incomplete = request(
        server.address,
        "POST / HTTP/1.1\r\nHost: localhost\r\nContent-Length: 10\r\n\r\nx",
    )
    .await;
    assert!(incomplete.starts_with("HTTP/1.1 408"));
    let headers = request(server.address, "GET / HTTP/1.1\r\nHost: local").await;
    assert!(!headers.starts_with("HTTP/1.1 200"));
    stop(server).await;
}

#[tokio::test]
async fn excess_connections_are_closed_without_interrupting_the_active_request() {
    let (entered, mut started) = tokio::sync::mpsc::channel(1);
    let release = Arc::new(tokio::sync::Notify::new());
    let notify = release.clone();
    let config = ServerConfig {
        max_connections: 1,
        listen_addr: ([127, 0, 0, 1], 0).into(),
        ..ServerConfig::default()
    };
    let server = start(
        FoxFactory::create(config)
            .unwrap()
            .route(Method::GET, "/", move |_| {
                let entered = entered.clone();
                let notify = notify.clone();
                async move {
                    entered.send(()).await.unwrap();
                    notify.notified().await;
                    Ok(text("finished"))
                }
            })
            .unwrap(),
    )
    .await;
    let address = server.address;
    let first = tokio::spawn(async move { get(address, "/").await });
    started.recv().await.unwrap();
    let mut second = TcpStream::connect(address).await.unwrap();
    let mut response = Vec::new();
    let result = timeout(Duration::from_secs(2), second.read_to_end(&mut response))
        .await
        .unwrap();
    assert!(matches!(result, Ok(0)) || result.is_err());
    release.notify_one();
    assert!(first.await.unwrap().ends_with("finished"));
    stop(server).await;
}
