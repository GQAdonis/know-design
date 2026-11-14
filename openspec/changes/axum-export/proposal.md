# Export a prototype as a Rust Axum fragment server

## Why

The fastest path from prototype to a working app is to keep the same HTML and back it with real handlers.

## What Changes

Add `plugins/_official/scenarios/od-axum-export/` (cloned from `od-react-export`) that reads the generated `od-prototype.json` and HTML fragments and emits a Cargo crate: one `Html<String>` handler per route, a repository trait plus in-memory implementation per entity; the page drops `od-mock` and sets `od-backend`. Plan change 5; scenario AXUM-1.

## Findings

- Design: no per-prototype Rust codegen. `scripts/export-axum.ts` extracts the page's route templates into `routes.json` plus minijinja templates and `seed.json`. A generic server (`assets/server/src/main.rs`) answers them with od-mock's guard and action semantics.
- minijinja 3.1 dropped the `loader` feature and `Value::from_serialize`. The server uses a closure loader restricted to plain file names in `templates/`, and `Value::from(Serde(..))` behind the `serde` feature.
- minijinja renders booleans as `True`/`False`. A formatter renders them lowercase so `done-{{ item.done }}` matches the prototype's CSS (found by the browser check).
- AXUM-1 evidence (2026-11-14): export of the template example wrote 8 route templates. `cargo build`, `cargo fmt --check` and `cargo clippy -- -D warnings` are clean. curl exercised every route (422 guard, HX-Trigger, OOB count, 404 for a missing id, escaped `<img>` payload, CORS allow/expose). In Chromium the exported page (mock off, templates stripped) ran list, validation, create, toggle and delete against the server.
