# Reflection — htmx-prototypes-and-ipfs-deploy

Date: 2026-11-14. Branch `feat/htmx-prototypes-ipfs-deploy` (8 commits, not pushed). Contract `adopted-contract.json` (digest `f0197e0e…`). Evidence: `review/boundary-2026-11-14/README.md`.

## Delta: plan vs delivery

| Planned | Delivered | Delta |
|---|---|---|
| D-008: IPFS deploy requires a signed-in member on the hosted web surface | Not implemented | No deployment-surface mechanism exists in code (`OD_DEPLOYMENT_SURFACE` is only planned in identity-and-collaboration). IPFS deploy uses the same `writeFiles` authorization as Vercel/Cloudflare. **Requires operator ratification**; contract safety check not met as written. |
| One multipart `add` with `wrap-with-directory=true` | Directory parts under a `site/` root, CID from the `site` entry | Layout copied from the operator's working locus script; same result, proven live. |
| od-mock tests via `node --test` in the template | `apps/web/tests/design-templates/*` with vitest + jsdom against real htmx 2.0.8 | No DOM harness at the repo root; the web app is the preview host. Boundary command amended in practice. |
| TPL-1: validate a real generation run | Not run | Needs an agent generation in the app. Template load (daemon scanner), OD Next roster limits (24 files, 184 KB) and validator were verified instead. |
| MOCK-1: CRUD in the preview iframe | PASS in jsdom, top-level Chromium and packaged-app renderer; FAIL for web UI in an external browser on a loopback daemon | Chromium Local Network Access blocks loopback scripts in opaque sandboxed frames. Packaged app disables that check. Found only by the boundary's real-browser run. |
| od-mock feature set | Added `data-od-when` / `data-od-when-not` guards and `data-od-item` | Needed by the example (validation state, edit-in-place); found while writing it. |
| Axum export as LLM-guided scenario | Deterministic exporter + generic data-driven server | No per-prototype Rust codegen; reproducible AXUM-1. |
| Skill PRs read the manifest | convert-htmx-react: real `--manifest` code (hooks + annotations); mini-app-module: documentation only | Hybrid change is documentation, as the plan allowed. |

## Goal achievement

| Goal | Status | Basis |
|---|---|---|
| 1. IPFS deploy from UI and `od`, CID + optional IPNS, saved config + env import | PARTIAL | Live CLI deploy with IPNS, gateway 200s, packaged-app login-shell import and deploy all PASS. UI exercised by component tests only, not clicked in the packaged app. D-008 gate missing. |
| 2. Vendored htmx 2.0.8 + Alpine + extensions + od-mock | MET | Vendored with sha256/licenses; 13 od-mock tests with real htmx; works on HTTP, IPFS, and Axum backend mode. |
| 3. Template + craft rule | MET (structure) / PARTIAL (generation) | Scanner loads it; craft lint passes; generation run (TPL-1) not executed. |
| 4. od-prototype.json manifest | MET | Schema, validator with negative control, preflight warning, SKILL.md emission step. |
| 5. Axum export | MET | AXUM-1 end to end in Chromium against the exported server. |
| 6. React/Flutter conversion specs + skill updates | MET | Spec doc; PRs Prometheus-AGS/prometheus-skills-mini#86, Know-Me-Tools/hybrid-mobile-architecture-skill#28 (open, unmerged). |

## Artifact Quality Summary

| Metric | Value |
|---|---|
| Changes with QA (focused tests + typecheck + guard) | 6/6 |
| Artifact-refiner QA | Not run (no `.refiner/artifacts` logs) |
| Adversarial review | Assess: round 1 BLOCK (3 CRITICAL evidence gaps, fixed), round 2 unavailable (upstream 524 / invalid MiniMax output). Plan: round 1 BLOCK (1 CRITICAL, fixed), round 2 unavailable (524). Diff review of the code: not run. |
| Defects found at the boundary that unit tests missed | 3: minijinja `True`/`False` casing (fixed), example's ambiguous check glyph (fixed), srcdoc Local Network Access (host issue, documented) |

### Recurring constraint violations

None in the code. Process: twice I discarded `prometheus kbd` command output, hiding failed task transitions until a status check.

## Recalled Lessons

- **Applied:** "External integrations require at least one real-service test" → live deploy to rpc.prometheusags.ai (IPFS-4). "Boundary gates must launch the packaged artifact" → packaged build launched; found the import path works with an empty daemon env. "Collect zero-question approvals at dispatch" → one approvals question; no later interruptions. "Verify stale lock PIDs before modifying lock files" → checked `lsof`/processes before removing `.git/index.lock` three times; left another tool's stuck `cargo` processes alone.
- **Recurred:** stale `.git/index.lock` files (three times this session) and the OpenSpec refresh deleting `.kimi-code/skills` (recurring every refresh). Root cause of the second: OpenSpec 2.0.0's Kimi Code integration force-update removes that folder; restored manually each commit.

## Technical debt introduced

- ~10 additive branch edits in upstream-owned files (deploy, routes, contracts, FileViewer, cli, tests), all listed in `docs/knowdesign-upstream-sync.md`.
- Route-set extraction duplicated between the daemon preflight and the standalone validator (intentional; validator runs in agent cwds).
- `od-mock.js` is a compiled artifact checked in; rebuilding needs the documented esbuild command.
- Exported Axum server returns fragments only; React hooks expect JSON (gap recorded).
- `better-sqlite3` rebuilt for Node 24 in `node_modules`; Node 26 test runs need a rebuild.

## Corrective actions

1. Operator decision on D-008 (accept "same as other providers" until the surface mechanism exists, or block).
2. Run TPL-1: one generation from the template in the packaged app, then validate and deploy the output.
3. Decide how to handle the external-browser preview: accept (desktop-first), inline vendor scripts for srcdoc, or serve previews from a non-opaque origin.
4. Fix the OpenSpec refresh vs tracked `.kimi-code` conflict (untrack or pin the integration).

## Lessons captured

- [GLOBAL] Sandboxed opaque-origin iframes in Chromium cannot load scripts from loopback addresses when Local Network Access checks are on; test previews that load local assets in the real host browser, not only top-level or in jsdom.
- [GLOBAL] minijinja renders booleans as `True`/`False`; set a formatter when templates must match JavaScript output.
- minijinja 3.x removed the `loader` feature and `Value::from_serialize`; use a closure loader and `Value::from(Serde(..))` with the `serde` feature.
- Never discard `prometheus kbd` transition output; tasks must go pending → in-progress → complete, and a rejected edge fails silently when stderr is dropped.
- Cut skill-repo PR branches in isolated worktrees from a fresh `origin/main` when the main checkout has uncommitted work.

## Codify as Skill?

The IPFS publish flow (Kubo multipart directory add + IPNS key reuse) now exists in three scripts plus this provider; a small shared skill or package could replace the per-project scripts.

## Next Phase Seed

Close the open items before new scope: D-008 decision, TPL-1 generation run in the packaged app, the external-browser preview decision, and the `.kimi-code` refresh conflict. Then consider the JSON variant of the Axum export so the React hooks have a server.
