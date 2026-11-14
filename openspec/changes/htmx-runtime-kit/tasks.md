# Tasks: htmx-runtime-kit

## 1. Implementation

- [ ] 1.1 Fetch each vendored file at its pinned version from npm, verify integrity, record version, source URL, sha256 and license in `vendor/MANIFEST.json`.
- [ ] 1.2 `od-mock` TypeScript source: intercept `htmx:beforeRequest`, route `METHOD /path/:param` to `<template data-od-route>` fragments, in-memory store for POST/PUT/DELETE, OOB swaps, `HX-Trigger`/`HX-Redirect`, disabled by `<meta name="od-backend">`; explicit `selfRequestsOnly` in the bootstrap; compile to the vendored `.js`.
- [ ] 1.3 `od-mock` tests (`design-templates/htmx-alpine-prototype/tests/od-mock.test.ts`, node --test): params, mutations, OOB, response-targets, backend passthrough.
- [ ] 1.4 Guard: add a `residualAllowedPathPatterns` entry scoped to `design-templates/htmx-alpine-prototype/assets/vendor/`; `pnpm guard` passes.
