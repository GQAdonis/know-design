# Export a prototype as a Rust Axum fragment server

## Why

The fastest path from prototype to a working app is to keep the same HTML and back it with real handlers.

## What Changes

Add `plugins/_official/scenarios/od-axum-export/` (cloned from `od-react-export`) that reads the generated `od-prototype.json` and HTML fragments and emits a Cargo crate: one `Html<String>` handler per route, a repository trait plus in-memory implementation per entity; the page drops `od-mock` and sets `od-backend`. Plan change 5; scenario AXUM-1.
