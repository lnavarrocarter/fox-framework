use crate::{Bytes, HeaderMap, HttpError, Method, Uri};
use serde::de::DeserializeOwned;
use std::{collections::HashMap, net::SocketAddr};

/// A buffered, size-limited request with matched route parameters.
pub struct Request {
    pub(crate) inner: http::Request<Bytes>,
    pub(crate) params: HashMap<String, String>,
    pub(crate) peer_addr: SocketAddr,
}

impl Request {
    /// Return the HTTP method.
    pub fn method(&self) -> &Method {
        self.inner.method()
    }

    /// Return the full URI, including the query string.
    pub fn uri(&self) -> &Uri {
        self.inner.uri()
    }

    /// Return the request headers.
    pub fn headers(&self) -> &HeaderMap {
        self.inner.headers()
    }

    /// Return the request bytes (at most `ServerConfig::max_body_bytes`).
    pub fn body(&self) -> &Bytes {
        self.inner.body()
    }

    /// Return a UTF-8, percent-decoded named route parameter.
    pub fn param(&self, name: &str) -> Option<&str> {
        self.params.get(name).map(String::as_str)
    }

    /// Return the TCP peer address, not a potentially untrusted forwarding header.
    pub fn peer_addr(&self) -> SocketAddr {
        self.peer_addr
    }

    /// Parse a JSON body. Requires `application/json` or `application/*+json`.
    pub fn json<T: DeserializeOwned>(&self) -> Result<T, HttpError> {
        let content_type = self
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .map(str::trim);
        let is_json = content_type.is_some_and(|value| {
            let value = value.to_ascii_lowercase();
            value == "application/json"
                || (value.starts_with("application/") && value.ends_with("+json"))
        });
        if !is_json {
            return Err(HttpError::bad_request("expected a JSON Content-Type"));
        }
        serde_json::from_slice(self.body()).map_err(|error| {
            tracing::debug!(%error, "invalid JSON body");
            HttpError::bad_request("invalid JSON body")
        })
    }
}
