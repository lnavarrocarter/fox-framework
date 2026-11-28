use crate::{Bytes, HttpError};
use http::{HeaderValue, header};
use http_body_util::Full;
use serde::Serialize;

/// A complete HTTP response. Modify status and headers through the `http` API.
pub type Response = http::Response<Full<Bytes>>;

/// Build a UTF-8 plain text response.
pub fn text(body: impl Into<Bytes>) -> Response {
    let mut response = Response::new(Full::new(body.into()));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    response
}

/// Serialize a typed JSON value; serialization failures become internal errors.
pub fn json<T: Serialize + ?Sized>(value: &T) -> Result<Response, HttpError> {
    let body = serde_json::to_vec(value).map_err(|error| HttpError::internal(error.to_string()))?;
    let mut response = Response::new(Full::new(Bytes::from(body)));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    Ok(response)
}
