ASSESSMENT: htmx-prototypes-and-ipfs-deploy
Project: KnowDesign (fork of nexu-io/open-design, checkout `open-design`)
Date: 2026-11-14
Codebase baseline: `main` at 794064e9e2 (upstream merged at 46fd9dcd74); KnowDesign profile gates in place; guard and typecheck pass.
Cross-tool progress: none (new phase, no changes registered)

Sources: three read-only explorations on 2026-11-14 (deploy system and goals; prompt/template injection points; operator skills and IPFS scripts). Plan input: `~/.claude/plans/wait-before-writing-all-federated-hummingbird.md` (operator-approved 2026-11-14).

## Lessons cited (prior-context.md)

- Know Meet session (2026-10-19): "Leave a `publish-ipfs.sh` script that republishes to the same link. It reads your login from environment variables, so the credentials never end up in a file." Shapes this assessment: credentials must never be written into project files or the deployed site. It also recorded that `console.prometheusags.ai` was tried first; that host now returns 403 (memory `ipfs-publish-endpoint`). The provider must default to `rpc.prometheusags.ai`.
- Commerce-removal reflection: the packaged e2e passed only because `OD_BUILD_PROFILE` was set in the launch environment, which a Finder launch lacks. Same trap here: `IPFS_RPC_*` exist in `~/.bash_profile` but a Finder-launched app does not inherit them. Assessment treats "env-only credentials" as non-working for the packaged app.

## IMPLEMENTATION STATUS

- IPFS deploy provider: MISSING — no IPFS/Kubo/CID code anywhere in apps or packages. Only planning mentions (`commerce-removal/assessment.md:61`, `identity-and-collaboration/plan.md:47`).
- Deploy system to extend: DONE (upstream) — `apps/daemon/src/deploy.ts` providers `vercel-self` / `cloudflare-pages` (`:13-19`); `buildDeployFilePlan` collects entry + referenced files (`:268-328`); `assetUrlPolicy: 'share-relative'` (`:58`) suits `/ipfs/<cid>/` path gateways; routes `apps/daemon/src/routes/deploy.ts` (deploy `:99-226`, preflight `:228`, check-link `:282`); storage `db.ts:352-372` `deployments` with `provider_metadata_json`; UI `FileViewer.tsx:715-738` `DEPLOY_PROVIDER_OPTIONS`; CLI `cli.ts:12930` `runDeploy`, `--provider` free text.
- Provider abstraction: MISSING — the provider union is copied in `deploy.ts:19`, `packages/contracts/src/api/projects.ts:847`, `apps/web/src/providers/registry.ts:143`; selection is two-way `if`/ternaries (`deploy.ts:99-231`, `routes/deploy.ts:159-200`, `:309`).
- HTMX/Alpine prototype mode: MISSING — zero `hx-`/`x-data` in source, prompts, skills, templates or plugins.
- Preview runtime for HTMX: MISSING — preview iframe sandbox `allow-scripts allow-forms allow-downloads` (`FileViewer.tsx:440`), opaque origin; `/raw/` OPTIONS allows only GET + Content-Type (`routes/project/index.ts:7138-7145`); routes are GET-only. Real `hx-*` requests (custom `HX-*` headers → preflight; POST/PUT/DELETE) fail. CDN `<script src>` does load (no CSP on `/raw/` or srcDoc).
- Extension points: DONE (upstream) — `design-templates/` (`od.mode: prototype`; example `design-templates/kanban-board/SKILL.md`), `craft/` via `od.craft.requires` (`apps/daemon/src/craft.ts:45,78`), plugins (`plugins/_official/scenarios/od-react-export` as an export model). All reach both prompt paths (legacy `apps/daemon/src/prompts/system.ts:1325-1338`; OD Next `initial-prompt-bundle-service.ts:384`, `od-next-strategy.ts:603-613`).
- Conversion contract (manifest): MISSING.
- Axum export: MISSING (no Rust export scenario; `htmx-alpine-lit` skill holds an `axum_fragment_handler.rs.tera` template to reuse).
- React/Flutter conversion: PARTIAL (outside repo) — `convert-htmx-react` converts Alpine forms but sends every `hx-*` to a TODO sidecar; `scaffold-flutter-a2ui` takes A2UI JSON, not HTMX.

## Integration gap detail (added after adversarial review round 1)

### G1 · Saved config, env import, and IPNS reuse (goal 1)

- **Config persistence today:** one JSON file per provider at `$OD_USER_STATE_DIR` or `~/<userStateDirName>/` (`deploy.ts:99-105`), written mode 0600 (`writeDeployConfigFile`, `deploy.ts:~180`). The brand descriptor makes the KnowDesign folder distinct (`brand.ts:26`). Reads/writes branch two ways (`readDeployConfig`/`writeDeployConfig`/`publicDeployConfigForProvider`, `deploy.ts:~205-230`). The public response masks secrets with a sentinel (`SAVED_TOKEN_MASK`) and reports `configured`. **Gap:** `DeployConfig` is token-shaped (`token`, `teamId`, `accountId`); IPFS needs `rpcUrl`, `username`, `password`, `gatewayUrl`, `ipnsDefault`. The IPFS config gets its own read/write/public functions in a new module, with one branch per dispatcher. `DeployConfigResponse`/`UpdateDeployConfigRequest` (`contracts/projects.ts:942,954`) need additive optional fields (`rpcUrl`, `username`, `gatewayUrl`, `ipnsDefault`, `passwordMask`).
- **Env-import entry points today:** NONE. No deploy provider imports from the environment. **Per launch environment:**
  - `tools-dev` and `od` CLI: daemon inherits the shell env, so `process.env.IPFS_RPC_USER`/`IPFS_RPC_PASSWORD` are present.
  - Packaged app, Finder launch: env absent (lesson from commerce-removal). The daemon must read only those two names from a non-interactive login shell (`$SHELL -lc` printing the two values, NUL-separated), triggered only by an explicit user action.
  - CLI entry: `od deploy` has no config subcommand today (`cli.ts:12930-12990` help lists only deploy flags). **Gap:** add `od deploy config --provider ipfs-kubo [--from-env|--rpc-url …]` calling `PUT /api/deploy/config`, plus a `POST /api/deploy/config/import-env` route that both UI and CLI call (one endpoint, dual-track).
  - UI entry: the token row in the deploy modal (`FileViewer.tsx:~19045-19085`). **Gap:** IPFS renders its own fields component in place of the token row.
- **Kubo operations required:** `POST add?pin=true&cid-version=1&raw-leaves=true&wrap-with-directory=true` (multipart, one part per file with its relative path as filename), then root CID from the last NDJSON line (the wrapper, `Name: ""`). IPNS: `POST key/list`, `POST key/gen?arg=<name>&type=ed25519` when missing, `POST name/publish?arg=/ipfs/<cid>&key=<name>&allow-offline=true&lifetime=8760h`. All basic-auth. Reference implementation: `~/Projects/know-me/locus/docs/design/publish-ipfs.sh` (key/list → key/gen → name/publish).
- **Where the IPNS key/name is stored and reused:** the `deployments` row is unique per `(project_id, file_name, provider_id)` (`db.ts:352-372`) and keeps `provider_metadata_json` across redeploys (the route passes `prior?.providerMetadata`). Store `{cid, gatewayUrl, ipnsKey, ipnsName}` there. The key name is deterministic, `kd-<projectId>`, so it is reused across redeploys and across files of the same project; the IPNS name (key id) is read back from `key/list` and cached in the metadata. **Gap:** the route currently overwrites `providerMetadata` only for Cloudflare; IPFS needs its own branch, and `publicDeployment` (`deploy/cloudflare-pages-helpers.ts:69`) strips `providerMetadata`, so the public `ipfs` field must be derived there.
- **Asset URLs:** the deploy route builds files without `assetUrlPolicy` (`routes/deploy.ts:~148`). IPFS path gateways mount the site under `/ipfs/<cid>/`, so root-absolute URLs would break. IPFS must pass `assetUrlPolicy: 'share-relative'` and `hookScriptUrl: ''`.
- **check-link:** works unchanged; the non-Cloudflare branch probes `existing.url` (`routes/deploy.ts`, check-link handler).

### G2 · How the manifest gets emitted and consumed (goal 4)

- **Generation path:** a selected design template is staged into the agent's cwd at `.od-skills/<folder>/` before spawn (`server.ts:12257-12285`, `cwd-aliases.ts:99`), and its SKILL.md body is prefixed with a preamble naming that path (`skills.ts:533-580`). The SKILL.md instructs the agent to copy `assets/vendor/` into the project's `vendor/` and to write `od-prototype.json` beside the entry HTML. The agent writes project files with its own file tools; no daemon code writes the manifest.
- **Legacy vs OD Next:** legacy runs receive `skillBody` (`apps/daemon/src/prompts/system.ts:1325-1338`) and the staged side files. OD Next runs receive the selected skill as `userSelectedSkills` (`initial-prompt-bundle-service.ts:384`); frozen strategy tasks materialize a frozen skill package (`server.ts:12285`, `materializeFrozenSkillPackage`). **UNKNOWN:** whether the frozen package for an OD Next run includes a user-selected design template's `assets/` side files. Must be verified at the start of change 03 by running one generation each way; if not included, the template carries the vendor files inline as a fallback instruction.
- **API/BYOK mode** (no filesystem agent) cannot copy vendor files. **Gap/risk:** that mode emits a single artifact; the template must state a CDN-with-SRI fallback for it. Accepted as degraded for v1.
- **Schema and validation location:** `design-templates/htmx-alpine-prototype/references/od-prototype.schema.json` (staged with the template, so the agent can read it). A validator in TypeScript under the same template (`scripts/validate-manifest.ts`, run by the agent with `node --experimental-strip-types`), plus a non-blocking deploy preflight warning (new warning code in the existing preflight list, `contracts/projects.ts` after `:997`) when `od-prototype.json` routes and the HTML's `data-od-route` templates disagree.
- **Single source for downstream consumers:** the HTML's `<template data-od-route>` fragments are what `od-mock` executes at runtime. The manifest lists the same routes plus types, entities and components. The validator enforces route-set equality. Axum export (05) reads the manifest for handler signatures and the HTML fragments for bodies; conversion specs (06) read only the manifest.

### G3 · Conversion skills: where they live and what they consume (goal 6)

- **convert-htmx-react:** installed from the Prometheus skill pack (`~/.prometheus/plugins/prometheus-skill-pack/current`, homepage `github.com/Prometheus-AGS/prometheus-skill-system`; no local checkout of that repo found). Local editable copies exist at `/Volumes/T7/Projects/prometheus/prometheus-skills-mini/skills/convert-htmx-react` (remote `Prometheus-AGS/prometheus-skills-mini`). **Current input:** one HTML file parsed with parse5; every `hx-*` attribute goes to the `.ambiguous.md` sidecar. **Gap for the manifest:** routes → TanStack Query hooks; components → file split by `data-od-component`; `x-data` shapes → typed state; entities → TypeScript types; tokens → shadcn/Tailwind variables via `scaffold-react-vite --brand`.
- **hybrid-mobile-architecture:** source at `~/Projects/hybrid-mobile-architecture-src/skills/` (published as plugin `knowme-builder/hybrid-mobile-architecture 2.0.0-alpha.5`). Relevant sub-skills: `hybrid-design-tokens` (single `tokens.toml` → CSS vars + `tokens.dart`), `mini-app-module` (manifest with routes, entities, capabilities, events), `a2ui-surface-contract`, `reference-ui-fidelity`, `axum-agent-gateway`. **Current input:** none of them read HTML or HTMX. **Gap for the manifest:** `od-prototype.json` routes/entities map closely onto the `mini-app-module` manifest (routes, entities, events); tokens map onto `tokens.toml` roles. The Flutter path consumes those, not HTML.
- **scaffold-flutter-a2ui:** in the Prometheus skill pack. **Current input:** an A2UI JSON document. **Gap:** components and routes from the manifest → A2UI components and repository calls.
- Each skill update is a change in its own repository (outside this repo), so 06 delivers specs here plus PRs there.

## CROSS-TOOL PROGRESS

NONE — no cross-tool activity recorded. Parked sibling: `hosted-publish-and-review` paused at change 02 (D-022).

## SPEC GAP SUMMARY

- No OpenSpec specs cover deploy providers or prototype runtimes (`openspec/specs/` holds none for these). Specs will be authored per change.
- Version disagreement: operator chose htmx 2.0.8 (matches `htmx-alpine-lit`); `~/Projects/know-me/htmx-doc-forge` vendors 2.0.9 + Alpine 3.17.4. Phase pins 2.0.8 per operator; Alpine 3.x version to be verified against npm at execute.
- `htmx.config.selfRequestsOnly` behaviour in an opaque-origin frame is UNKNOWN (not verified against htmx source). The `od-mock` design must not depend on it either way.
- `od deploy config` subcommand existence is UNKNOWN; must be checked before adding one.
- Gateway HEAD reachability for check-link on `ipfs.prometheusags.ai` is UNKNOWN until a live deploy.

## BUILD HEALTH

- build check: PASS — `pnpm guard` and `pnpm typecheck` at 794064e9e2 (run 2026-11-14).
- known violations: NONE introduced; upstream test suites not run in full (policy).
- test coverage: NONE for this phase's surface (all new).

## CONSTRAINT CHECK

- AGENTS.md: dual-track UI + CLI in the same PR; contracts first; i18n keys in all 19 locales; tests in `tests/`; no `Co-authored-by` trailers; new `.js` only with a documented generated/vendor exception that passes `pnpm guard`. The vendored runtime kit (htmx, Alpine, extensions, compiled `od-mock`) needs an explicit allowlist entry in `scripts/guard.ts` (`residualAllowedPathPatterns`, same form as the `design-templates/html-ppt-zhangzara-*/assets/deck-stage.js` pattern at `:233`), scoped to `design-templates/htmx-alpine-prototype/assets/vendor/`. `od-mock` source stays TypeScript; only its compiled output is vendored. Each vendored file records upstream version, source URL, sha256 and license (htmx: 0BSD; Alpine: MIT; to be confirmed per file at execute) in a `vendor/MANIFEST.json`; prompt text changes must reach both legacy and OD Next paths (avoided by using templates/craft); never put maintenance notes under `plugins/_official/scenarios/od-next-strategy/assets/`.
- Upstream-merge hygiene (D-003/D-007/D-014, `docs/knowdesign-upstream-sync.md`): edits to upstream-hot files (`deploy.ts`, `routes/deploy.ts`, `FileViewer.tsx` 20k lines, `cli.ts`, contracts) must be small and additive and listed. **Risk:** the missing provider interface forces edits at ~8 two-way branch sites; each is a future merge-conflict point.
- Surface policy D-008: deploy route checks only `writeFiles` (`routes/deploy.ts:142-145`); hosted web surface must require a signed-in member for IPFS deploy.
- Dependency policy: a new npm dependency changes `pnpm-lock.yaml` and the Nix hash; Node 24 `fetch`/`FormData` avoids that.
- Outward-facing action: a live deploy publishes content to the operator's node and gateway. Requires explicit operator OK at the time.

## GOAL PROGRESS

1. IPFS deploy from UI and CLI with CID + optional IPNS: NOT MET — nothing exists; reuse points identified.
2. Vendored runtime kit with od-mock: NOT MET.
3. Template + craft rule: NOT MET.
4. od-prototype.json manifest: NOT MET.
5. Axum export: NOT MET.
6. React/Flutter conversion specs and skill updates: NOT MET (skill changes live in other repos).

## Risks and concerns (S-03)

- **Merge conflicts:** ~8 additive branch sites across upstream-hot files. Mitigation: all logic in new files; one-line edits only; record each in the sync doc. Proposing a provider registry upstream is out of scope.
- **Credential exposure:** reading `IPFS_RPC_PASSWORD` via a login shell spawns `bash -lc`, which runs the operator's profile. Read only the two named variables, never log them, never return them to the client, and never write them into deployed files.
- **Mock fidelity:** an in-page mock can drift from a real server. The manifest (goal 4) is the single source both the mock and the Axum export read, which bounds drift.
- **Template is opt-in:** design templates apply only when picked (no auto-selection by trigger, `skills.ts:333`). Prototypes not started from the template get no HTMX steering. Accepted for v1.
- **IPFS permanence:** pinned content is effectively public and hard to retract. Deploy UI must state this before the first upload.

## Knowledge gaps

None recorded in prior-context.md.

## Value scenario discovery

- V1 (adopted): designer finishes an HTMX prototype in KnowDesign and shares a working link from their own IPFS node in one action. Source: operator instruction 2026-11-14. Likelihood: high (stated first priority).
- V2 (adopted): prototype CRUD flows work in the preview and on IPFS without a backend. Source: operator ("true prototypes that can be close to fully functional").
- V3 (adopted, planning depth): the same prototype becomes an Axum app, then React/Flutter projects. Source: operator. Full React/Flutter generators deferred.
- V4 (rare-critical): a credential leaks into a deployed site. Must be prevented by test (password absent from uploads, logs, config GET).
- Deferred: auto-selecting the template by prompt keywords; review comments on IPFS deploys (belongs to the parked hub).

## Adopted-outcome contract inputs

- **User operation:** deploy a KnowDesign design (especially an HTMX + Alpine prototype) to the operator's IPFS node from the Share/Deploy UI or `od deploy --provider ipfs-kubo`.
- **Observed baseline:** no IPFS provider; Vercel/Cloudflare only; no HTMX steering; preview blocks real `hx-*` requests. UNKNOWN: `selfRequestsOnly` in opaque frames; `od deploy config` existence; gateway HEAD behaviour.
- **Desired observable result:** a pinned CIDv1 gateway URL (and optional IPNS URL) that opens the prototype with all assets returning 200, and HTMX + Alpine interactions working there and in the preview.
- **Supported environments:** packaged macOS desktop app (Finder launch), `tools-dev` web runtime, `od` CLI; Node 24.
- **Required safety checks:** credentials never logged, returned to the client, or uploaded; password masked in config responses; hosted web surface requires a signed-in member (D-008); live deploy only after explicit operator OK; unit tests against a fake Kubo server.
- **Exclusions:** review comments, Kratos identity, the review hub; full React/Flutter generators; first-class prompt mode; template auto-selection; provider-registry refactor.
- **Risk acceptance:** merge-conflict cost of ~8 additive edits accepted by operator via the approved plan; in-page mock drift bounded by the manifest.
- **Decision owner:** the operator (Travis James).

ASSESSMENT COMPLETE

## Unresolved review findings

Adversarial review, artifact mode, via the liter-llm gateway (`:4000`).

- **Round 1** (judge `k3.1-pro`, verdict BLOCK; `review/assess/findings-r1.json`): three CRITICAL findings, all evidence gaps:
  1. goal 1 config persistence, env import and IPNS storage;
  2. goal 4 manifest emission and consumption path;
  3. goal 6 conversion-skill locations and inputs.

  It also raised one WARNING (vendored-JS exception). All four were addressed in "Integration gap detail" and the revised constraint check.
- **Round 2** did not complete:
  - `k3.1-pro` failed twice with upstream HTTP 524 (`dispatch-r2.log`, `dispatch-r2b.log`).
  - A run with the critic `MiniMax-M3` as judge (`PROMETHEUS_KBD_JUDGE_MODEL`) returned output that was not shape-valid findings JSON (`dispatch-r2c.log`).
- **Status:** the round-1 fixes are **not independently re-verified**. The plan-stage review re-checks them, because the plan restates each item as change criteria.
- `cross_model_check` was recorded as `unverified-producer-unknown`, since the packet's canonical producer identity was incomplete.
- Open UNKNOWNs carried forward:
  - whether OD Next frozen packages include template `assets/`;
  - `selfRequestsOnly` behaviour in an opaque-origin frame;
  - gateway HEAD behaviour for check-link.
