use crate::{Response, StatusCode, json};
use std::{error::Error, fmt};

/// An invalid server configuration.
#[derive(Debug)]
pub struct ConfigError(pub(crate) &'static str);

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.0)
    }
}

impl Error for ConfigError {}

/// An invalid or ambiguous route registration.
#[derive(Debug)]
pub struct RouteError(pub(crate) String);

impl fmt::Display for RouteError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl Error for RouteError {}

/// A handler failure. Internal error details are logged, never sent to clients.
#[derive(Debug)]
pub struct HttpError {
    status: StatusCode,
    message: String,
}

impl HttpError {
    /// Reject malformed input with HTTP 400.
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    /// Reject a request without valid credentials with HTTP 401.
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: message.into(),
        }
    }

    /// Reject a forbidden operation with HTTP 403.
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            message: message.into(),
        }
    }

    /// Report a missing resource with HTTP 404.
    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: message.into(),
        }
    }

    /// Report an internal error with HTTP 500; its message is private.
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }

    /// Return the HTTP status associated with this failure.
    pub fn status(&self) -> StatusCode {
        self.status
    }

    pub(crate) fn into_response(self) -> Response {
        let message = if self.status.is_server_error() {
            tracing::error!(error = %self.message, "request failed");
            "Internal Server Error"
        } else {
            tracing::debug!(status = self.status.as_u16(), error = %self.message, "request rejected");
            &self.message
        };
        let mut response = json(&serde_json::json!({ "error": message }))
            .expect("serializing a string JSON value cannot fail");
        *response.status_mut() = self.status;
        response
    }
}

impl fmt::Display for HttpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
    }
}

impl Error for HttpError {}
