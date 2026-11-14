# Vendored HTMX + Alpine runtime with an in-page mock router

## Why

Generated prototypes are static. The preview iframe has an opaque origin, so real `hx-*` requests fail, and IPFS has no backend. Prototypes need HTMX 2.0.8, Alpine and helpful extensions vendored locally plus a mock layer that answers requests in the page.

## What Changes

Vendor htmx 2.0.8, Alpine 3.x and the htmx extensions head-support, preload, response-targets, loading-states, class-tools, sse and idiomorph into `design-templates/htmx-alpine-prototype/assets/vendor/` with `MANIFEST.json`; author the `od-mock` htmx extension in TypeScript and vendor its compiled output; add a scoped guard allowlist pattern. Plan change 2; scenarios MOCK-1, MOCK-2.
