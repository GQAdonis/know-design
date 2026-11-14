PLAN: htmx-prototypes-and-ipfs-deploy
Project: KnowDesign (open-design fork)
Date: 2026-11-14
OpenSpec available: YES (`openspec/` present; changes emitted through the managed runner)
Changes to implement: 6
Plan input: `~/.claude/plans/wait-before-writing-all-federated-hummingbird.md` (operator-approved 2026-11-14). Assessment: `assessment.md` (G1–G3).
Contract: `adopted-contract.json` (digest stamped by `kbd-contract-adopt.sh`; see Contract binding).

## Lessons that shape this plan (prior-context.md)

- "External integrations require at least one real-service test." Fakes cannot prove Kubo behaviour (multipart dir layout, wrapper CID, key/gen). The boundary includes one live deploy to `rpc.prometheusags.ai` (approval required, collected at dispatch).
- "Boundary gates must launch the packaged artifact." The Finder-launch credential path (login-shell env import) is only real in a packaged app. The boundary builds and launches the packaged app once.
- "Bake packaged product profiles instead of relying on runtime flags" and the commerce-removal reflection: env present in `tools-dev` hides the packaged gap. Scenario IPFS-3 exercises import with the variables absent from the daemon env.
- "Collect zero-question execution approvals at dispatch." Execute asks once for: live IPFS publish, commits, and the packaged build.
- "Define upstream acceptance scope explicitly." The outbound hosts this phase adds are the configured Kubo RPC host and gateway host, plus `cdn.jsdelivr.net` for generated pages in API/BYOK mode only; all three are recorded in acceptance.

## Host policy vs selected method

Repo `AGENTS.md` (host policy) requires focused tests for changed files and `pnpm guard` + `pnpm typecheck` before publication. The KBD method defers generated-code verification to one boundary. Resolution: each change writes its focused tests with the change (host policy); the single boundary packet below is the acceptance evidence. Per-change focused test runs are host-policy checks, not acceptance.

## CHANGE LIST (ordered)

1. **ipfs-deploy-provider**: deploy any design to the operator's Kubo node from UI and CLI.
   - Scope: all (contracts, daemon, web UI, CLI, i18n)
   - Depends on: NONE
   - Recommended agent: Claude Code (this session)
   - Est. complexity: L · Complexity score: High · Model class: frontier · Customer value: HIGH
   - Details: new `apps/daemon/src/deploy/ipfs.ts` (config read/write/public, Kubo add/key/name, env import); additive branches in `deploy.ts`, `routes/deploy.ts`, `deploy/cloudflare-pages-helpers.ts` (`publicDeployment` derives `ipfs`), contracts, web registry, a new `IpfsDeployFields` component in the deploy modal, `od deploy --provider ipfs-kubo [--ipns]` and `od deploy config`, 19 locales, upstream-sync doc.
   - Criteria (restating assessment G1):
     - (a) config persisted per provider at the existing user-state path, mode 0600, with password masked in every response.
     - (b) `POST /api/deploy/config/import-env` reads only `IPFS_RPC_USER` / `IPFS_RPC_PASSWORD`, from `process.env`, else from `$SHELL -lc`. It never logs or returns the values. UI button and `od deploy config --from-env` both call it.
     - (c) deploy uses `assetUrlPolicy: 'share-relative'` and `hookScriptUrl: ''`.
     - (d) one multipart `add` with `pin=true&cid-version=1&raw-leaves=true&wrap-with-directory=true`, root CID from the wrapper line.
     - (e) IPNS key `kd-<projectId>` is created once and reused; `{cid, gatewayUrl, ipnsKey, ipnsName}` is stored in `provider_metadata_json`.
     - (f) D-008: on the hosted web surface, deploy requires a signed-in member.
2. **htmx-runtime-kit**: vendored htmx 2.0.8, Alpine 3.x, extensions, and the `od-mock` extension.
   - Scope: design-templates assets, guard allowlist, TypeScript source for `od-mock`
   - Depends on: NONE
   - Recommended agent: Claude Code · L · High · frontier · HIGH
   - Details:
     - Vendor `htmx.org@2.0.8` and the extensions `head-support`, `preload`, `response-targets`, `loading-states`, `class-tools`, `sse` and `idiomorph`, plus Alpine (latest 3.x, verified on npm), into `design-templates/htmx-alpine-prototype/assets/vendor/`.
     - Record a `vendor/MANIFEST.json` (version, source URL, sha256, license) for those files.
     - `od-mock`:
       - TypeScript source under the template, compiled once to a vendored `.js`.
       - Intercepts `htmx:beforeRequest`, so the request never reaches the network.
       - Routes `METHOD /path/:param` to `<template data-od-route>` fragments with an in-memory store.
       - Handles OOB swaps, `HX-Trigger` and `HX-Redirect`.
       - Disables itself when `<meta name="od-backend">` is set.
     - Narrow guard allowlist pattern.
   - Criteria: the assessment WARNING is resolved by a scoped `residualAllowedPathPatterns` entry; `selfRequestsOnly` is set explicitly in the bootstrap and does not affect mocked requests.
3. **htmx-prototype-template**: template + craft rule that produce working prototypes.
   - Scope: `design-templates/htmx-alpine-prototype/`, `craft/htmx-alpine-runtime.md`
   - Depends on: htmx-runtime-kit
   - Recommended agent: Claude Code · M · Medium · frontier · HIGH
   - Details: `SKILL.md` (`od.mode: prototype`, `od.craft.requires: [htmx-alpine-runtime, state-coverage]`), `assets/template.html`, `references/conventions.md`, a CRUD `example.html`; craft rules (server state via mock routes, small flat `x-data`, `data-od-component`, role-named tokens, no inline scripts in fragments).
   - Criteria: first task verifies whether OD Next frozen packages stage template `assets/` (assessment UNKNOWN); if not, the template instructs an inline/CDN fallback. API/BYOK mode gets a CDN-with-SRI fallback instruction. `pnpm lint:craft` passes.
4. **prototype-manifest**: `od-prototype.json` schema, validator, preflight warning.
   - Scope: template references/scripts, contracts preflight warning code, daemon preflight
   - Depends on: htmx-prototype-template
   - Recommended agent: Claude Code · M · Medium · frontier · MEDIUM
   - Details: JSON Schema in `references/od-prototype.schema.json`; `scripts/validate-manifest.ts`; non-blocking `PROTOTYPE_MANIFEST_MISMATCH` preflight warning when manifest routes ≠ HTML `data-od-route` set.
   - Criteria (restating G2): the HTML route templates are what `od-mock` executes; the manifest adds types, entities and components; the validator enforces route-set equality; 05 and 06 read the manifest.
   - **Emission (plan review round 1, CRITICAL):** task 3 updates the template's `SKILL.md`, `references/conventions.md` and the CRUD `example.html` so every generation writes `od-prototype.json` with all five sections (`routes`, `components`, `state` (x-data shapes), `entities`, `tokens`). The template ships the example's manifest. Acceptance (TPL-1, MAN-1) validates the manifest **produced by a real generation run**, and axum-export and the conversion specs consume that produced file, not a hand-written one.
5. **axum-export**: prototype → Rust Axum fragment server.
   - Scope: `plugins/_official/scenarios/od-axum-export/`
   - Depends on: prototype-manifest (consumes the manifest produced by its task 3)
   - Recommended agent: Claude Code · L · High · frontier · MEDIUM
   - Details: scenario cloned from `od-react-export`; emits a Cargo crate with one handler per manifest route returning `Html<String>` fragments (from the HTML templates), a repository trait plus in-memory impl per entity; the page drops `od-mock` and sets `od-backend`.
6. **react-flutter-conversion-specs**: mapping specs + skill updates.
   - Scope: `docs/knowdesign/htmx-conversion.md` here; PRs in `Prometheus-AGS/prometheus-skills-mini` (`convert-htmx-react`) and `hybrid-mobile-architecture-src`
   - Depends on: prototype-manifest
   - Recommended agent: Claude Code · M · Medium · frontier · MEDIUM
   - Criteria (restating G3): React mapping (routes → TanStack Query hooks, components split by `data-od-component`, `x-data` → typed state, entities → TS types, tokens → shadcn vars); Flutter mapping (routes/entities → `mini-app-module` manifest, tokens → `tokens.toml`, components → A2UI). Skill repo changes are proposed as PRs; the operator merges.

## Trade-offs and cuts (S-03)

- No provider-registry refactor: ~8 additive branch edits in upstream-hot files are accepted, each recorded in `docs/knowdesign-upstream-sync.md`.
- Template is opt-in (no keyword auto-selection). First-class prompt mode deferred.
- Full React/Flutter generators deferred to a later phase; this phase ships specs and skill PRs only.
- API/BYOK mode gets a degraded CDN fallback, not vendored files. **Outbound-host exception (plan review round 1):** in that mode only, generated pages may load htmx, the extensions and Alpine from `https://cdn.jsdelivr.net/npm/` with pinned versions and SRI. This host is added to the acceptance scope for that mode only. Vendored mode (filesystem agents, the default) makes no CDN request.

## Plan review round 1 resolutions

- CRITICAL (no manifest emission) → prototype-manifest task 3; TPL-1/MAN-1 validate generated output.
- WARNING (i18n `types.ts`) → ipfs-deploy-provider task 6 adds keys to `types.ts` before the 19 locales.
- WARNING (prototype on IPFS) → MOCK-2 now depends on both changes and exercises mocked reads, writes and fragment swaps at the gateway URL.
- WARNING (CDN host) → recorded as an API/BYOK-only exception in trade-offs and acceptance scope.

## TASK MODEL ASSIGNMENTS

All tasks: phase path `htmx-prototypes-and-ipfs-deploy`. Route: native Claude Code session, provider Anthropic, model `claude-opus-5-5`, reasoning default. Evidence (2026-11-14): this session already holds the codebase context for every touched file. Native alternative: Codex CLI on the same files, unverified for this repo. No liter-llm inference route is used for implementation; liter-llm is used only for adversarial review (judge `k3.1-pro`, critic `MiniMax-M3`). Unresolved: `k3.1-pro` returned upstream 524 twice on 2026-11-14.

| Change | Task | Summary | Model | Route |
|---|---|---|---|---|
| ipfs-deploy-provider | 1 | contracts: provider id, config fields, `ipfs` on DeploymentInfo, import-env types | claude-opus-5-5 | native |
| ipfs-deploy-provider | 2 | daemon `deploy/ipfs.ts` + dispatcher branches + route + import-env | claude-opus-5-5 | native |
| ipfs-deploy-provider | 3 | daemon tests with fake Kubo server | claude-opus-5-5 | native |
| ipfs-deploy-provider | 4 | CLI `--provider ipfs-kubo`, `--ipns`, `od deploy config` | claude-opus-5-5 | native |
| ipfs-deploy-provider | 5 | web registry + `IpfsDeployFields` + modal branch + result card | claude-opus-5-5 | native |
| ipfs-deploy-provider | 6 | i18n keys: add to `apps/web/src/i18n/types.ts` first, then all 19 locales; typecheck; upstream-sync doc | claude-opus-5-5 | native |
| htmx-runtime-kit | 1 | fetch + verify vendored files, MANIFEST.json, licenses | claude-opus-5-5 | native |
| htmx-runtime-kit | 2 | `od-mock` TypeScript source + build to vendored js | claude-opus-5-5 | native |
| htmx-runtime-kit | 3 | `od-mock` unit tests | claude-opus-5-5 | native |
| htmx-runtime-kit | 4 | guard allowlist entry | claude-opus-5-5 | native |
| htmx-prototype-template | 1 | verify OD Next staging of template assets | claude-opus-5-5 | native |
| htmx-prototype-template | 2 | SKILL.md, template.html, conventions, example.html | claude-opus-5-5 | native |
| htmx-prototype-template | 3 | craft rule + lint:craft | claude-opus-5-5 | native |
| prototype-manifest | 1 | schema + validator | claude-opus-5-5 | native |
| prototype-manifest | 2 | preflight warning code + daemon check + test | claude-opus-5-5 | native |
| prototype-manifest | 3 | template SKILL.md/conventions/example emit `od-prototype.json` with all five sections | claude-opus-5-5 | native |
| axum-export | 1 | scenario plugin + generator instructions/templates | claude-opus-5-5 | native |
| axum-export | 2 | export the example, cargo build/run | claude-opus-5-5 | native |
| react-flutter-conversion-specs | 1 | conversion spec doc | claude-opus-5-5 | native |
| react-flutter-conversion-specs | 2 | convert-htmx-react manifest input (PR) | claude-opus-5-5 | native |
| react-flutter-conversion-specs | 3 | hybrid skills manifest mapping (PR) | claude-opus-5-5 | native |

## EXECUTION ROUND ORDER

- Round 1: ipfs-deploy-provider, htmx-runtime-kit
- Round 2: htmx-prototype-template
- Round 3: prototype-manifest
- Round 4: axum-export, react-flutter-conversion-specs

## COMMANDS TO RUN

Through the managed runner (`node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change <id>`):
ipfs-deploy-provider, htmx-runtime-kit, htmx-prototype-template, prototype-manifest, axum-export, react-flutter-conversion-specs.

## Contract binding

- Contract: `.kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/adopted-contract.json`, digest via `jq -S -c 'del(.identity.contractDigest) | del(.identity.planRevision)' | sha256`, stamped by `kbd-contract-adopt.sh`.
- Scenario → task coverage: IPFS-1..4 → ipfs-deploy-provider T1–T6; MOCK-1..2 → htmx-runtime-kit T1–T4 + htmx-prototype-template T2; TPL-1 → htmx-prototype-template T1–T3; MAN-1 → prototype-manifest T1–T3; MOCK-2 → ipfs-deploy-provider T2 + htmx-prototype-template T2 + htmx-runtime-kit T2; AXUM-1 → axum-export T1–T2; CONV-1 → react-flutter-conversion-specs T1–T3.
- Worker route: Claude Code / `claude-opus-5-5`.
- Freshness keys: contract digest, `main` HEAD at boundary, vendored file sha256s, Kubo RPC host.
- Budgets and the single boundary packet: in the contract.

PLAN COMPLETE

## Unresolved review findings

- Round 1 (`k3.1-pro`, BLOCK; `review/plan/findings-r1.json`): 1 CRITICAL + 3 WARNING, all resolved in "Plan review round 1 resolutions".
- Round 2 did not complete: the gateway returned upstream HTTP 524 (`review/plan/dispatch-r2.log`). The round-1 resolutions are therefore **not independently re-verified**. The execute-stage diff review re-checks them against the produced code.

## Dispatch approvals (operator, 2026-11-14)

Pre-approved at dispatch: live IPFS publish to rpc.prometheusags.ai (example prototype, CID + IPNS key `kd-<projectId>`); commits on a feature branch (no push/PR without asking); one packaged app build + install; PRs (not merges) in prometheus-skills-mini and hybrid-mobile-architecture-src.
