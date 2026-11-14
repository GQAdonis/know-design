# od-prototype.json conversion contract

## Why

Converting a prototype to Axum, React or Flutter needs a machine-readable description of its routes, components, state, entities and tokens that matches what the page actually does.

## What Changes

Add `references/od-prototype.schema.json`, `scripts/validate-manifest.ts`, a non-blocking `PROTOTYPE_MANIFEST_MISMATCH` deploy preflight warning, and make generation emit the manifest. Plan change 4; scenarios TPL-1, MAN-1.
