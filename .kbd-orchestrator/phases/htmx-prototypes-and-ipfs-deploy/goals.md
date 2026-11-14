# Goals

- Deploy any KnowDesign design to the operator's IPFS Kubo node (rpc.prometheusags.ai) from the web UI and the od CLI, returning a pinned CIDv1 gateway link and an optional per-project IPNS name; credentials live in the saved deploy config with an import from the shell env
- Vendored runtime kit: htmx 2.0.8, Alpine 3, and helpful htmx 2 extensions, plus an in-page od-mock router so prototypes are near-functional in the preview iframe and on IPFS without a backend
- An htmx-alpine-prototype design template and an htmx-alpine-runtime craft rule that steer generation toward working HTMX + Alpine prototypes without editing upstream prompt text
- An od-prototype.json manifest (routes, components, state, entities, tokens) emitted with each prototype as the conversion contract
- An Axum export scenario that turns a prototype into a Rust fragment server the same HTML runs against
- React and Flutter conversion specs that consume the manifest, with updates to convert-htmx-react and the hybrid-mobile-architecture skills
