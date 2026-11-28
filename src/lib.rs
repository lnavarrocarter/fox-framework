#![doc = include_str!("../README.md")]
#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod app;
mod error;
pub mod middleware;
mod request;
mod response;
mod router;
mod server;

pub use app::{App, FoxFactory, ServerConfig};
pub use bytes::Bytes;
pub use error::{ConfigError, HttpError, RouteError};
pub use http::{HeaderMap, Method, StatusCode, Uri};
pub use middleware::Next;
pub use request::Request;
pub use response::{Response, json, text};
pub use server::Server;
