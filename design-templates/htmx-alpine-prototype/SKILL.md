---
name: htmx-alpine-prototype
description: |
  Working, near-functional web prototype built with htmx 2 and Alpine.js.
  Server interactions are real htmx requests answered in the page by a mock
  router, so lists, forms, create/edit/delete, inline validation and partial
  updates actually work in the preview and when deployed to IPFS — no backend.
  The structure is designed to convert later into an Axum fragment server,
  React or Flutter. Use when the brief asks for an interactive / clickable /
  functional prototype, CRUD screens, a dashboard with real interactions,
  "htmx", "alpine", or a prototype that will become a real app.
triggers:
  - "htmx"
  - "alpine"
  - "alpine.js"
  - "functional prototype"
  - "working prototype"
  - "interactive prototype"
  - "clickable prototype"
  - "crud"
od:
  mode: prototype
  platform: desktop
  scenario: design
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
    sections: [color, typography, layout, components]
  craft:
    requires: [htmx-alpine-runtime, state-coverage]
  example_prompt: "Build a working task tracker prototype: list, add, complete, edit and delete tasks, with a filter and an empty state."
---

# htmx + Alpine Prototype

Produce a prototype that **works**: every button, form and list in the brief does what it says, through htmx requests answered by the page's mock router (`od-mock`). Follow the `htmx-alpine-runtime` craft rules; this file covers the workflow and the files.

## Files this template ships

Copy these into the project exactly; do not retype or edit them.

Runtime (copy the whole folder `assets/vendor/` to the project as `vendor/`):

- `assets/vendor/htmx.min.js` — htmx 2.0.8
- `assets/vendor/alpine.min.js` — Alpine.js 3
- `assets/vendor/od-mock.js` — in-page mock router (must load after htmx)
- `assets/vendor/ext/head-support.min.js`
- `assets/vendor/ext/preload.min.js`
- `assets/vendor/ext/response-targets.min.js`
- `assets/vendor/ext/loading-states.min.js`
- `assets/vendor/ext/class-tools.min.js`
- `assets/vendor/ext/sse.min.js`
- `assets/vendor/ext/idiomorph-ext.min.js`
- `assets/vendor/MANIFEST.json` — versions, sha256 and licenses
- `assets/vendor/licenses/htmx.org.LICENSE`
- `assets/vendor/licenses/alpinejs.LICENSE`
- `assets/vendor/licenses/htmx-ext-head-support.LICENSE`
- `assets/vendor/licenses/htmx-ext-preload.LICENSE`
- `assets/vendor/licenses/htmx-ext-response-targets.LICENSE`
- `assets/vendor/licenses/htmx-ext-loading-states.LICENSE`
- `assets/vendor/licenses/htmx-ext-class-tools.LICENSE`
- `assets/vendor/licenses/htmx-ext-sse.LICENSE`
- `assets/vendor/licenses/idiomorph.LICENSE`

Seed and conventions:

- `assets/template.html` — the page skeleton; copy it to `index.html` and fill it in.
- `references/conventions.md` — route, component, state and token conventions (read before writing).
- `example.html` — a complete working CRUD screen to imitate.

## Workflow

1. Read `references/conventions.md`, then `example.html` to see every convention in use.
2. Copy `assets/vendor/` to `vendor/` in the project (a directory copy with your file tools or `cp -R`). If you cannot copy files (no filesystem access), use the CDN fallback in `references/conventions.md` instead.
3. Copy `assets/template.html` to `index.html`. Keep its `<head>` script order: htmx, extensions, `od-mock.js`, then Alpine with `defer`.
4. Model the domain first: list the entities (for example `tasks`, `projects`) and seed realistic records in `<script type="application/json" id="od-mock-data">`.
5. Declare one `<template data-od-route="METHOD /api/...">` per server interaction the brief needs: list, detail, create, update, delete, search/filter, validation errors. Use `data-od-action` for writes so the in-memory store changes and the next read shows it.
6. Build the screens with `hx-*` attributes calling those routes. Use Alpine only for state that never leaves the browser (open/closed, selected tab, a draft field).
7. Cover the states: loading (`.htmx-indicator`), empty (`data-od-unless`), error (a `data-od-status="422"` route plus `hx-target-422`), and success feedback (`HX-Trigger` header via `data-od-headers`).
8. Click through every flow in the preview. A request with no matching route shows "No mock route for …"; add the route instead of removing the control.

## Output contract

- `index.html` plus `vendor/` (and any extra pages, each with the same `<head>`).
- No backend calls: every htmx request has a matching route template.
- Root-relative API paths (`/api/...`), so the same page works in the preview, on IPFS, and later against a real server via `<meta name="od-backend">`.
