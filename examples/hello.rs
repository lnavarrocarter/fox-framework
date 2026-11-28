use fox_framework::{FoxFactory, Method, ServerConfig, json, middleware};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let filter = match std::env::var("RUST_LOG") {
        Ok(value) => tracing_subscriber::EnvFilter::try_new(value)?,
        Err(std::env::VarError::NotPresent) => tracing_subscriber::EnvFilter::new("info"),
        Err(error) => return Err(error.into()),
    };
    tracing_subscriber::fmt().with_env_filter(filter).init();
    let address = match std::env::var("FOX_ADDR") {
        Ok(value) => value,
        Err(std::env::VarError::NotPresent) => "127.0.0.1:3000".into(),
        Err(error) => return Err(error.into()),
    };
    let config = ServerConfig {
        listen_addr: address.parse()?,
        ..ServerConfig::default()
    };
    let app = FoxFactory::create(config)?
        .middleware(middleware::request_logging)
        .middleware(middleware::security_headers)
        .route(Method::GET, "/", |_| async {
            json(&json!({ "message": "Hello Fox!" }))
        })?
        .route(Method::GET, "/health", |_| async {
            json(&json!({ "status": "ok" }))
        })?
        .route(Method::GET, "/hello/:name", |request| async move {
            json(&json!({ "hello": request.param("name") }))
        })?;
    let server = app.bind().await?;
    tracing::info!(address = %server.local_addr()?, "Fox is ready");
    let (shutdown, receiver) = tokio::sync::oneshot::channel();
    let mut task = tokio::spawn(server.serve_until(async {
        let _ = receiver.await;
    }));
    tokio::select! {
        result = &mut task => result??,
        result = tokio::signal::ctrl_c() => {
            result?;
            shutdown.send(()).map_err(|_| "server stopped before shutdown")?;
            task.await??;
        }
    }
    Ok(())
}
