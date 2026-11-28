use crate::{HttpError, Method, RouteError, StatusCode, middleware::Handler, text};
use http::{HeaderValue, header};
use percent_encoding::percent_decode_str;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

enum Segment {
    Literal(String),
    Param(String),
}

pub(crate) struct Route {
    method: Method,
    path: String,
    segments: Vec<Segment>,
    handler: Handler,
}

impl Route {
    pub(crate) fn new(method: Method, path: &str, handler: Handler) -> Result<Self, RouteError> {
        if !path.starts_with('/')
            || path.contains(['?', '#', '%'])
            || path.parse::<http::Uri>().is_err()
        {
            return Err(RouteError(
                "routes must be absolute paths without queries, fragments or percent escapes"
                    .into(),
            ));
        }
        let mut names = HashSet::new();
        let segments = path
            .split('/')
            .map(|part| {
                if let Some(name) = part.strip_prefix(':') {
                    if name.is_empty()
                        || !name
                            .bytes()
                            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
                        || !names.insert(name)
                    {
                        return Err(RouteError(format!(
                            "invalid or repeated parameter in {path}"
                        )));
                    }
                    Ok(Segment::Param(name.to_owned()))
                } else if part.contains([':', '*']) {
                    Err(RouteError(
                        "wildcards and embedded parameters are not supported".into(),
                    ))
                } else {
                    Ok(Segment::Literal(part.to_owned()))
                }
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self {
            method,
            path: path.to_owned(),
            segments,
            handler,
        })
    }

    pub(crate) fn conflicts(&self, other: &Self) -> bool {
        self.method == other.method
            && self.segments.len() == other.segments.len()
            && self
                .segments
                .iter()
                .zip(&other.segments)
                .all(|(left, right)| match (left, right) {
                    (Segment::Literal(left), Segment::Literal(right)) => left == right,
                    (Segment::Param(_), Segment::Param(_)) => true,
                    _ => false,
                })
    }

    fn matches(&self, path: &str) -> Option<Vec<bool>> {
        let parts: Vec<_> = path.split('/').collect();
        if parts.len() != self.segments.len() {
            return None;
        }
        self.segments
            .iter()
            .zip(parts)
            .map(|(segment, part)| match segment {
                Segment::Literal(value) if value == part => Some(true),
                Segment::Param(_) if !part.is_empty() => Some(false),
                _ => None,
            })
            .collect()
    }

    fn params(&self, path: &str) -> Result<HashMap<String, String>, HttpError> {
        self.segments
            .iter()
            .zip(path.split('/'))
            .filter_map(|(segment, part)| match segment {
                Segment::Param(name) => Some(
                    percent_decode_str(part)
                        .decode_utf8()
                        .map(|value| (name.clone(), value.into_owned()))
                        .map_err(|_| HttpError::bad_request("route parameter is not valid UTF-8")),
                ),
                _ => None,
            })
            .collect()
    }
}

pub(crate) fn register(routes: &mut Vec<Route>, route: Route) -> Result<(), RouteError> {
    if routes.iter().any(|existing| existing.conflicts(&route)) {
        return Err(RouteError(format!(
            "ambiguous route {} {}",
            route.method, route.path
        )));
    }
    routes.push(route);
    Ok(())
}

pub(crate) fn resolve(
    routes: &[Route],
    method: &Method,
    path: &str,
) -> Result<(Handler, HashMap<String, String>), HttpError> {
    let candidates: Vec<_> = routes
        .iter()
        .filter_map(|route| route.matches(path).map(|rank| (route, rank)))
        .collect();
    let Some(best) = candidates.iter().map(|(_, rank)| rank).max() else {
        return Ok((
            Arc::new(|_| Box::pin(async { Err(HttpError::not_found("route not found")) })),
            HashMap::new(),
        ));
    };
    let matching: Vec<_> = candidates
        .iter()
        .filter(|(_, rank)| rank == best)
        .map(|(route, _)| *route)
        .collect();
    let selected = matching
        .iter()
        .find(|route| route.method == *method)
        .or_else(|| {
            if *method == Method::HEAD {
                matching.iter().find(|route| route.method == Method::GET)
            } else {
                None
            }
        });
    if let Some(route) = selected {
        return Ok((route.handler.clone(), route.params(path)?));
    }
    let mut allowed: Vec<_> = matching.iter().map(|route| route.method.as_str()).collect();
    if allowed.contains(&"GET") {
        allowed.push("HEAD");
    }
    allowed.sort_unstable();
    allowed.dedup();
    let allowed = HeaderValue::from_str(&allowed.join(", "))
        .expect("HTTP method names are valid header values");
    Ok((
        Arc::new(move |_| {
            let allowed = allowed.clone();
            Box::pin(async move {
                let mut response = text("Method Not Allowed");
                *response.status_mut() = StatusCode::METHOD_NOT_ALLOWED;
                response.headers_mut().insert(header::ALLOW, allowed);
                Ok(response)
            })
        }),
        HashMap::new(),
    ))
}
