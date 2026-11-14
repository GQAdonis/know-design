//! Fragment server exported from a KnowDesign htmx + Alpine prototype.
//!
//! It answers the prototype's routes (`routes.json`) with the same HTML
//! fragments (`templates/`) and the same create/update/delete/toggle
//! semantics as the page's in-browser mock router, so the page behaves the
//! same against it. The store is in memory and seeded from `seed.json`.
//! Replace `Store` with a real repository when the prototype becomes a product;
//! the handlers and templates stay as they are.

use std::collections::{BTreeMap, HashMap};
use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Query, RawPathParams, State};
use axum::http::{header, HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{MethodFilter, MethodRouter};
use axum::Router;
use minijinja::Environment;
use serde::Deserialize;
use serde_json::{Map, Value};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RouteSpec {
    method: String,
    path: String,
    axum_path: String,
    template: String,
    status: u16,
    #[serde(default)]
    headers: BTreeMap<String, String>,
    action: Option<String>,
    item: Option<String>,
    when: Option<String>,
    when_not: Option<String>,
}

type Store = Arc<RwLock<Map<String, Value>>>;

#[derive(Clone)]
struct AppState {
    store: Store,
    templates: Arc<Environment<'static>>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let routes: Vec<RouteSpec> = serde_json::from_str(&std::fs::read_to_string("routes.json")?)?;
    let seed: Value = serde_json::from_str(&std::fs::read_to_string("seed.json")?)?;
    let store = match seed {
        Value::Object(map) => map,
        _ => Map::new(),
    };

    let mut templates = Environment::new();
    templates.set_loader(|name| {
        // Only plain file names from templates/ (routes.json names them).
        if name.contains('/') || name.contains('\\') || name.starts_with('.') {
            return Ok(None);
        }
        match std::fs::read_to_string(std::path::Path::new("templates").join(name)) {
            Ok(source) => Ok(Some(source)),
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(err) => Err(minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                format!("could not read template {name}: {err}"),
            )),
        }
    });
    // Render booleans as `true` / `false`, like the page's mock router
    // (minijinja's default is Python-style `True` / `False`), so classes such
    // as `done-{{ item.done }}` match the prototype's CSS.
    templates.set_formatter(|out, state, value| {
        if value.kind() == minijinja::value::ValueKind::Bool {
            return write!(out, "{}", value.is_true()).map_err(minijinja::Error::from);
        }
        minijinja::escape_formatter(out, state, value)
    });
    let state = AppState {
        store: Arc::new(RwLock::new(store)),
        templates: Arc::new(templates),
    };

    // Group the templates by path, then by method, keeping page order so
    // guarded templates are tried in the order the page declares them.
    let mut by_path: BTreeMap<String, BTreeMap<String, Vec<RouteSpec>>> = BTreeMap::new();
    for route in routes {
        by_path
            .entry(route.axum_path.clone())
            .or_default()
            .entry(route.method.clone())
            .or_default()
            .push(route);
    }

    let mut app = Router::new();
    for (path, methods) in by_path {
        let mut method_router: MethodRouter<AppState> = MethodRouter::new();
        for (method, candidates) in methods {
            let filter =
                method_filter(&method).ok_or_else(|| format!("unsupported method {method}"))?;
            let candidates = Arc::new(candidates);
            method_router = method_router.on(
                filter,
                move |State(state): State<AppState>,
                      params: RawPathParams,
                      Query(query): Query<HashMap<String, String>>,
                      headers: HeaderMap,
                      body: Bytes| {
                    let candidates = Arc::clone(&candidates);
                    async move { respond(state, &candidates, params, query, headers, body).await }
                },
            );
        }
        app = app.route(&path, method_router);
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        // htmx reads HX-Trigger / HX-Redirect from cross-origin responses.
        .expose_headers(Any);
    let app = app
        .fallback_service(ServeDir::new("site"))
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("prototype server on http://{addr}/");
    axum::serve(listener, app).await?;
    Ok(())
}

fn method_filter(method: &str) -> Option<MethodFilter> {
    Some(match method {
        "GET" => MethodFilter::GET,
        "POST" => MethodFilter::POST,
        "PUT" => MethodFilter::PUT,
        "PATCH" => MethodFilter::PATCH,
        "DELETE" => MethodFilter::DELETE,
        _ => return None,
    })
}

async fn respond(
    state: AppState,
    candidates: &[RouteSpec],
    params: RawPathParams,
    query: HashMap<String, String>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let params: Map<String, Value> = params
        .iter()
        .map(|(k, v)| (k.to_string(), Value::String(v.to_string())))
        .collect();
    let query: Map<String, Value> = query
        .into_iter()
        .map(|(k, v)| (k, Value::String(v)))
        .collect();
    let method = candidates
        .first()
        .map(|c| c.method.as_str())
        .unwrap_or("GET");
    let form = if method == "GET" || method == "DELETE" {
        query.clone()
    } else {
        parse_body(&headers, &body)
    };

    let mut store = state.store.write().await;
    for route in candidates {
        let guard_scope = Value::Object(Map::from_iter([
            ("params".into(), Value::Object(params.clone())),
            ("form".into(), Value::Object(form.clone())),
            ("query".into(), Value::Object(query.clone())),
            ("data".into(), Value::Object(store.clone())),
        ]));
        if let Some(when) = &route.when {
            if !truthy(resolve(&guard_scope, when)) {
                continue;
            }
        }
        if let Some(when_not) = &route.when_not {
            if truthy(resolve(&guard_scope, when_not)) {
                continue;
            }
        }

        let id = params
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let item = if let Some(action) = &route.action {
            match apply_action(action, &mut store, &id, &form) {
                Ok(item) => item,
                Err(()) => return StatusCode::NOT_FOUND.into_response(),
            }
        } else if let Some(list) = &route.item {
            match find_item(&store, list, &id) {
                Some(item) => Some(item),
                None => return StatusCode::NOT_FOUND.into_response(),
            }
        } else {
            None
        };

        let context = Value::Object(Map::from_iter([
            ("params".into(), Value::Object(params.clone())),
            ("form".into(), Value::Object(form.clone())),
            ("query".into(), Value::Object(query.clone())),
            ("data".into(), Value::Object(store.clone())),
            ("item".into(), item.unwrap_or(Value::Null)),
        ]));
        drop(store);
        return render(&state, route, &context);
    }
    (
        StatusCode::NOT_FOUND,
        format!(
            "<div data-od-mock-missing>No route for {} {}</div>",
            method,
            candidates.first().map(|c| c.path.as_str()).unwrap_or("")
        ),
    )
        .into_response()
}

fn render(state: &AppState, route: &RouteSpec, context: &Value) -> Response {
    let rendered = state
        .templates
        .get_template(&route.template)
        .and_then(|template| {
            template.render(minijinja::Value::from(minijinja::value::Serde(context)))
        });
    let html = match rendered {
        Ok(html) => html,
        Err(err) => {
            eprintln!("template {} failed: {err}", route.template);
            return (StatusCode::INTERNAL_SERVER_ERROR, "template error").into_response();
        }
    };
    let status = StatusCode::from_u16(route.status).unwrap_or(StatusCode::OK);
    let mut response = (
        status,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        html,
    )
        .into_response();
    for (name, value) in &route.headers {
        if let (Ok(name), Ok(value)) = (
            HeaderName::try_from(name.as_str()),
            HeaderValue::from_str(value),
        ) {
            response.headers_mut().insert(name, value);
        }
    }
    response
}

fn parse_body(headers: &HeaderMap, body: &Bytes) -> Map<String, Value> {
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    if content_type.starts_with("application/json") {
        if let Ok(Value::Object(map)) = serde_json::from_slice::<Value>(body) {
            return map
                .into_iter()
                .map(|(k, v)| {
                    (
                        k,
                        Value::String(
                            v.as_str()
                                .map(str::to_string)
                                .unwrap_or_else(|| v.to_string()),
                        ),
                    )
                })
                .collect();
        }
        return Map::new();
    }
    serde_urlencoded::from_bytes::<Vec<(String, String)>>(body)
        .unwrap_or_default()
        .into_iter()
        .map(|(k, v)| (k, Value::String(v)))
        .collect()
}

/// Same semantics as the page's mock router (`applyAction` in od-mock).
fn apply_action(
    action: &str,
    store: &mut Map<String, Value>,
    id: &str,
    form: &Map<String, Value>,
) -> Result<Option<Value>, ()> {
    let mut parts = action.split(':');
    let verb = parts.next().unwrap_or_default();
    let list_name = parts.next().unwrap_or_default().to_string();
    let field = parts.next().map(str::to_string);
    if list_name.is_empty() {
        return Ok(None);
    }
    let list = store
        .entry(list_name)
        .or_insert_with(|| Value::Array(Vec::new()))
        .as_array_mut()
        .ok_or(())?;
    if verb == "create" {
        let mut item = coerce(form);
        let next_id = form
            .get("id")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| next_id(list));
        item.insert("id".into(), Value::String(next_id));
        let item = Value::Object(item);
        list.push(item.clone());
        return Ok(Some(item));
    }
    let index = list
        .iter()
        .position(|candidate| id_of(candidate) == id)
        .ok_or(())?;
    match verb {
        "update" => {
            if let Some(object) = list[index].as_object_mut() {
                for (k, v) in coerce(form) {
                    if k != "id" {
                        object.insert(k, v);
                    }
                }
            }
            Ok(Some(list[index].clone()))
        }
        "delete" => Ok(Some(list.remove(index))),
        "toggle" => {
            if let (Some(field), Some(object)) = (field, list[index].as_object_mut()) {
                let current = truthy(object.get(&field));
                object.insert(field, Value::Bool(!current));
            }
            Ok(Some(list[index].clone()))
        }
        _ => Ok(None),
    }
}

fn find_item(store: &Map<String, Value>, list: &str, id: &str) -> Option<Value> {
    store
        .get(list)?
        .as_array()?
        .iter()
        .find(|candidate| id_of(candidate) == id)
        .cloned()
}

fn id_of(value: &Value) -> String {
    match value.get("id") {
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
        None => String::new(),
    }
}

fn next_id(list: &[Value]) -> String {
    let max = list
        .iter()
        .filter_map(|item| id_of(item).parse::<i64>().ok())
        .max();
    match max {
        Some(max) => (max + 1).to_string(),
        None => (list.len() + 1).to_string(),
    }
}

fn coerce(form: &Map<String, Value>) -> Map<String, Value> {
    form.iter()
        .map(|(k, v)| {
            let value = match v.as_str() {
                Some("on") | Some("true") => Value::Bool(true),
                Some("false") => Value::Bool(false),
                _ => v.clone(),
            };
            (k.clone(), value)
        })
        .collect()
}

fn resolve<'a>(scope: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = scope;
    for key in path.split('.') {
        current = match current {
            Value::Object(map) => map.get(key)?,
            Value::Array(items) => items.get(key.parse::<usize>().ok()?)?,
            _ => return None,
        };
    }
    Some(current)
}

/// Same truthiness as the page's mock router.
fn truthy(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        Some(Value::String(s)) => !(s.is_empty() || s == "false" || s == "0" || s == "off"),
        Some(Value::Array(items)) => !items.is_empty(),
        Some(Value::Object(_)) => true,
    }
}
