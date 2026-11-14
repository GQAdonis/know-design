# Export To Axum

Use this plugin when the user wants a working htmx + Alpine prototype (made with the `htmx-alpine-prototype` template) to run against a real Rust server instead of its in-page mock router.

The export keeps the same page and the same HTML fragments. A generic Axum server answers the prototype's routes with the same create, update, delete and toggle behaviour, so nothing in the page changes except `<meta name="od-backend">`.

## Workflow

1. Check the project has `od-prototype.json` next to its entry page. If it is missing or stale, write or fix it first (see the template's `references/conventions.md`, section 7) and run the template's `scripts/validate-manifest.ts` until it reports `ok`.
2. Run the exporter from this plugin's folder:
   `node --experimental-strip-types scripts/export-axum.ts <project-folder> <project-folder>/server --port 3000`
   It writes `server/` with `Cargo.toml`, `src/main.rs`, `routes.json`, `templates/*.html`, `seed.json`, `site/` (the page plus `vendor/`, pointed at the server) and a copy of `od-prototype.json`.
3. Read `references/mapping.md` and check every row for this prototype: each route template became one entry in `routes.json` and one minijinja template; guards (`data-od-when`, `data-od-when-not`), `data-od-item` and `data-od-action` carried over.
4. Build and run: `cd server && cargo run` (needs a Rust toolchain; the first build downloads crates). Open `http://127.0.0.1:3000/` and click through every flow. The page must behave exactly as it did in the preview.
5. If the user wants persistence, replace the in-memory `Store` in `src/main.rs` with a repository (SQLite or Postgres), keeping the handler and template code as is. Do not change `routes.json` semantics.
6. Finish with: how to run it, the routes it serves, what is still in memory, and the next step (database, auth, deployment).

## Quality bar

- Do not hand-rewrite the fragments; the exporter's conversion is the contract. Fix the prototype and re-export instead.
- Keep CORS open only while the page is served from another origin (the preview or IPFS); tighten `CorsLayer` once the page and API share an origin.
- Never put secrets in `seed.json`, templates or `site/`.
