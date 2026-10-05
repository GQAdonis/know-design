# PLAN: deploy-web-to-knowme-k8s › backend-complete-replacement

- **Project**: open-design (→ KnowDesign) · **Date**: 2026-10-02
- **OpenSpec available**: YES (`openspec/`, `schema: spec-driven`)
- **Changes to implement**: 23 (numbered 0–22) in 4 workstreams (A commerce/cloud removal · B identity + collaboration · C UAR runtime · D KnowDesign brand), plus a spike gate (0) and a closing rehearsal (22)
- **Inputs**: `assessment.md`, `analysis.md`, `library-candidates.json` (17 candidates), `decision-log.md` D-001…D-012
- **Model routing**: `model_policy` absent from `project.json` → all phases default to `frontier` (as in the parent plan). `Model class` below is derived from the complexity rules, not a registry.
- **Honesty note (S-02/S-07)**: this is a **multi-month program**, not one phase's worth of work. Rough effort from the analysis tracks (all estimates, none measured): per-user daemon keying 1–2 wk; guest minter + invites ~1 wk; ACP wrapper 2–3 wk; collab/message-center adapter ~2 wk; commerce removal and brand layers each large and mechanical. **Recommendation: after the spike (change 0) passes, split workstreams A–D into four sibling child phases** so each has its own assess/reflect cycle. This plan keeps them in one ordered list because their dependencies cross workstreams.

---

## Scope decisions made at plan time

Operator answers of 2026-10-02 (recorded as D-007…D-012):

| ID | Decision | Consequence |
|---|---|---|
| D-007 | **Accept the reconciliation of D-003/D-004**: rename everything users/operators see, alias internals, re-runnable codemod, stub-swap instead of deleting | Drives changes 0, 1, 19–21. Package names, `OD_*`, `od` CLI, `od://`, i18n keys stay; see "Must not rename" below. |
| D-008 | **Web: limit guests. Desktop: allow everything.** Partition capabilities by *surface* (web / desktop) × *authentication* (guest / signed-in) | Drives change 6 (policy matrix) and 15 (sandbox/limits). Matrix below. |
| D-009 | **UAR is a deployment choice: local sidecar bound to the app, or remote** (same machine launched elsewhere, or cloud) | Drives changes 16–18; filesystem strategy follows the mode (§C). |
| D-010 | **Touchpoints/campaigns dropped with billing** | Folded into change 4. |
| D-011 | **Keep viewer + commenter roles; partition by surface and sign-in** | Roles in changes 6, 10, 11. **Assumption (flag):** the answer did not mention the other four unrequested recommendations. Planned in-scope: **audit log events** (change 14, cheap, feeds the inbox) and **scoped expiring share links** (inside change 10). **Deferred, not planned:** reviewer handoff package, mention routing/digests. Say so if you want them. |
| D-012 | **Spike approved** | Change 0 is a gate: its result decides whether the stub-swap seam is viable under `pnpm guard` and how many conflicts it leaves. |

### Capability matrix (D-008, D-011) — defined here, implemented by change 6

Surface is determined by the **deployment**, not by the client: `desktop` = the packaged/local daemon on the user's machine (loopback, `OD_REQUIRE_DESKTOP_AUTH` import token — already exists); `web` = the hosted daemon behind flint-gate at `design.know-me.tools`. The daemon derives it from one explicit setting (`OD_DEPLOYMENT_SURFACE`), never from request headers.

| Capability | Desktop (any sign-in state) | Web · member (Kratos session) | Web · external validator | Web · guest (no session) |
|---|---|---|---|---|
| Create/edit own projects, design systems, skills | ✅ | ✅ | ❌ | ❌ (read shared only) |
| **Run agents** (spawn CLIs / UAR) | ✅ **everything** | ✅ sandboxed + budgeted (change 15) | ❌ | ❌ |
| View shared project | ✅ | ✅ | ✅ (if granted) | ✅ only via scoped share link |
| Comment on shared project | ✅ | ✅ | ✅ (commenter role) | ❌ unless link is comment-scoped |
| Team workspace / publish / pull | ✅ **only when signed in** (needs fabric) | ✅ | ❌ | ❌ |
| Invite validators / manage roles | ✅ signed-in | ✅ owner/admin | ❌ | ❌ |
| MCP install, local file import, shell tools | ✅ | ❌ (web has no user filesystem) | ❌ | ❌ |
| Settings: API keys, UAR mode, agent config | ✅ | per-user, server secrets hidden | ❌ | ❌ |

Desktop-signed-out is a **fully functional local app** (the "stop making users log in" goal); sign-in only unlocks fabric-backed collaboration. **Open point carried to apply:** whether a web *member's* first visit should be silent-guest-then-upgrade or require a Kratos cookie is decided in change 9 — default here is "member = Kratos session already present on `know-me.tools`; everyone else is guest".

### Must not rename (carried from analysis §1; enforced by change 19's verifier)
Workspace `name`/dirs (`@open-design/*`, `apps/*`, `packages/*`), `OD_*` env contract, sidecar stamp keys, i18n **keys**, `od` CLI + `od://`, `plugins/_official/scenarios/od-next-strategy/assets/**`, `pnpm-lock.yaml`, workflow filenames/job IDs, `scopes.json`, recorded CLI fixtures/mocks, `docs/i18n/*`. Display name, channel names, icons, i18n values, docs, image names, `appId`, GitHub project name **are** renamed.

### Non-goals
- Multi-writer co-editing / CRDT (candidate cand-016 rejected).
- Billing, credits, marketplace, Vela media, campaigns — **removed, not replaced** (D-002, D-010). Billing is "handled elsewhere".
- Reviewer handoff package and mention routing (deferred, D-011 assumption).
- Per-device *anonymous agent execution* on web (D-008).
- The parent's PostgreSQL migration (parent changes 4–6): not duplicated here; see "Parent plan impact".

---

## CHANGE LIST (ordered)

### 0. `rebrand-merge-conflict-spike` (gate — throwaway branch, no production code kept)
- **Scope**: repo tooling · **Depends on**: NONE · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: HIGH (de-risks the whole program) · **Goals**: 3, 1
- **library**: cand-001, cand-002
- **Details**: On a throwaway branch, stub **billing** behind a build-profile seam, apply a prototype brand codemod over a representative slice, enable `rerere`, then `git merge upstream/main` (and replay the last ~20 upstream commits) and **count conflicts and files touched**. Verify `pnpm guard` and `pnpm typecheck` accept bundler/TS aliasing (unverified in analysis).
- **Acceptance**: a written spike report with: conflict count per replayed commit, list of conflict-hotspot files, whether `pnpm guard` passes, and an explicit **GO / NO-GO** for the stub-swap seam. **NO-GO** → fall back to option 2 (regenerated downstream branch) or cand-010 (Vela-API gateway shim) and re-plan changes 1–5 before proceeding. Branch is deleted; nothing merges to `main`.

### 1. `build-profile-seam-and-permission-decoupling`
- **Scope**: daemon + web + contracts · **Depends on**: 0 (GO) · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 1
- **library**: cand-001, cand-009
- **Details**: Introduce `OD_BUILD_PROFILE=knowdesign` and the stub-module-swap mechanism (aliases + conditional route registration). **First**, decouple collab authority from billing: stub `WorkspaceLifecycleState` to `active` and supply billing/seat fields in the context mapper so removing billing cannot write-lock workspaces (`buildWorkspacePermissions`, `collab.ts:577`).
- **Acceptance**: with the profile on, `buildWorkspacePermissions` returns write permission for every lifecycle input (unit-tested); profile off = byte-identical behaviour to `main` (existing suites unchanged); `pnpm guard`, `pnpm typecheck`, and the daemon + web package tests pass versus a recorded baseline (capture the baseline before starting — the parent flagged it as UNKNOWN).

### 2. `stub-amr-and-billing`
- **Scope**: daemon + web + cli + contracts · **Depends on**: 1 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH (removes the login/credits UX) · **Goals**: 1, 5
- **Details**: Under the profile, remove the `amr` agent from `SHIPPED_AGENT_DEFS`, stub `routes/vela.ts` login/wallet/billing/models, remove the `EntryShell` onboarding redirect, `CloudSignInTip`, `AmrLoginPill`, balance gates (`isAmrSend`), `UpgradeCard*`, `GoPlanSunsetDialog`, `od amr`, `od … billing`. Keep `desktop-auth.ts`. Edit (don't delete) the incidental tests; delete only the dedicated AMR/billing tests.
- **Acceptance**: with the profile on, a fresh install on desktop starts a local agent run with **no sign-in prompt, no balance dialog, no network call to `*.open-design.ai`** (asserted by a network-denied e2e); `od amr` / `od billing` are absent from `od --help`; `pnpm guard` + web/daemon/e2e suites pass vs baseline.

### 3. `drop-touchpoints-marketplace-vela-media`
- **Scope**: daemon + web + cli + contracts · **Depends on**: 1 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 1
- **Details**: Under the profile, remove touchpoint/campaign overlays and CMS routes (D-010), marketplace login/publish/registry fetches, and `vela/*` media models (non-Vela media providers remain). Keep the message-center *module* for change 13.
- **Acceptance**: no `/api/touchpoints*` or marketplace fetch is issued; `od media generate` lists only non-Vela models; `od plugin login/publish` and `od marketplace login` absent; suites pass vs baseline.

### 4. `disable-telemetry-and-upstream-endpoints`
- **Scope**: daemon + desktop + packaged · **Depends on**: 1 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 1
- **Details**: Disable by configuration first (not deletion — wide, and consent-gated no-ops already): Langfuse/PostHog/diagnostic relay, updater feed, what's-new, public-metadata (`api.github.com/repos/nexu-io/…`), plugin-asset hosts. Repoint updater/what's-new to a KnowDesign feed or disable.
- **Acceptance**: a network-recording e2e shows zero requests to `*.open-design.ai`, `us.i.posthog.com`, `us.cloud.langfuse.com`; `desktop-auth.ts` behaviour unchanged.

### 5. `remove-vela-collab-hardcoding` 
- **Scope**: daemon · **Depends on**: 1 · **Agent**: Claude Code · **Est.**: S · **Score**: Medium · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 2
- **Details**: Replace the five hardcoded `=== 'vela'` checks (`server.ts:3841,3904,3918,6072`, `collab/sync-digest.ts:125`) with a provider-kind selector so a new context source needs only additive files. Smallest possible diff; these are the known conflict hotspots.
- **Acceptance**: behaviour unchanged with `OD_WORKSPACE_CONTEXT_SOURCE=vela` and `dev`; unit test selects a third provider kind; diff limited to the five sites + selector.

### 6. `capability-policy-surface-matrix`
- **Scope**: contracts + daemon + web · **Depends on**: 1 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH (every later change enforces through it) · **Goals**: 5
- **Details**: Pure-TS `Principal`, `Capability`, and `resolveCapabilities(surface, principal, grants)` in `packages/contracts`; roles `viewer | commenter | editor | admin | owner`; `OD_DEPLOYMENT_SURFACE`; daemon enforcement middleware; web gating helpers. Encodes the matrix above as a **table-driven test** (every cell asserted).
- **Acceptance**: the matrix test enumerates all surface × principal × capability cells and passes; `packages/contracts` stays free of Node/browser deps (`pnpm guard`); desktop principal resolves to all-allowed with no network; unknown surface fails closed.

### 7. `resolve-principal-and-trust-gate`
- **Scope**: daemon · **Depends on**: 6 · **Agent**: Claude Code · **Est.**: M · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 5, 2
- **library**: cand-005
- **Details**: Request-scoped principal resolution. **Web:** trust `X-Flint-User-Id/-Tenant-Id/-Principal-Type/-Scope` **only** when the request arrives from flint-gate (shared-secret/mTLS or NetworkPolicy-verified source) — never from raw client headers. **Desktop:** local principal. Fail closed when surface=web and headers absent.
- **Acceptance**: spoofed `x-flint-*` from a non-gate source is rejected (negative test); principal available on `req` for all `/api/*` routes; `/api/health` and `/api/ready` stay auth-exempt (parent invariant 2).

### 8. `owner-scoping-core-tables`
- **Scope**: daemon (db) + web · **Depends on**: 7 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 5
- **Details**: Add owner/tenant to the core tables (`projects`, `conversations`, `messages`, `agent_sessions`, run records, artifacts) with a back-fill that assigns existing rows to a local owner; scope every query by principal. **Author the schema so it ports cleanly to Postgres** (no SQLite-only types) because the parent's Postgres work will consume it. Remaining tables (49 total) triaged into "needs owner" / "global".
- **Acceptance**: two principals on the web surface cannot read or write each other's rows (matrix e2e); desktop behaviour unchanged; migration is idempotent and tested on a pre-change database fixture; table triage list committed.

### 9. `guest-minter-and-gate-site`  *(cross-repo: `flint-core-infra/sso-broker`, flint-gate config, k8s)*
- **Scope**: external services + k8s · **Depends on**: 7; **parent change `expose-via-shared-gateway`** · **Agent**: Claude Code (Rust) · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 5
- **library**: cand-004, cand-005
- **Details**: Extend `sso-broker` with `GET /guest` (per-device ES256 cookie, `kind=guest`, tenant claim, `guests` table, rate limit + challenge + GC) and extend `/sessions/whoami` with `metadata_public`; add a `design.know-me.tools` gate site accepting Kratos cookie **or** guest cookie; NetworkPolicy so only gate reaches the daemon; **delete parent's temporary `open-design-direct` route** in the same change (unauthenticated-bypass risk the parent's round-2 review found).
- **Acceptance**: `kubectl` shows exactly one HTTPRoute for the host with flint-gate as backend; a cookie-less first request receives a guest principal with web-guest capabilities; a Kratos-cookie request receives a member principal; per-IP mint cap enforced (load test); guest→real upgrade re-keys rows in one transaction (tested). **Verify first**: gate multi-provider fallback behaviour (read `middleware/pipeline.rs`) — analysis marked it inferred.

### 10. `external-validator-invites-and-share-links`
- **Scope**: daemon + web + cli + Kratos/Keto config · **Depends on**: 6, 9 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 2, 5
- **library**: cand-006, cand-007
- **Details**: Invite endpoint → Kratos admin identity (`principal_type: External`) + one-time recovery code/link (`return_to` the project) + Keto `project#commenter|viewer` tuple **with TTL and an expiry job**; enable Kratos `code` method (identity-schema change **staged first**); scoped expiring `/s/<token>` share links (view- or comment-scoped). Web UI + `od` subcommand + HTTP together (AGENTS.md dual-track).
- **Acceptance**: an invited external opens the email link and lands on the project with commenter rights and **no password**; the Keto tuple disappears after TTL (time-travel test); share link revokes immediately; invited external cannot run agents or see other projects; verify on live v26.2.0 whether `/admin/recovery/code` or `/link` is correct and whether admin can mint a session.

### 11. `collab-frf-comments-and-members`
- **Scope**: daemon (+ FRF/Forge shim) · **Depends on**: 5, 6, 8 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 2
- **library**: cand-008, cand-011
- **Details**: Implement the upstream `CollabCloudClient` wire contract (members + seq-cursor comments with ETag/304) against FRF Spine/Iggy fronted by Forge Quarry — selected by env alone (`OD_COLLAB_CLOUD_URL/TOKEN`), **zero upstream edits**. Preserve at-least-once semantics (idempotent merge by comment id, seq cursor, tombstones). Roles viewer/commenter enforced via Keto `Check`.
- **Acceptance**: replay of the upstream comment-relay e2e (`e2e/lib/playwright/fake-collab-hub.ts` as a conformance reference) passes against the fabric backend; a commenter can comment and a viewer cannot (server-side, asserted by a direct API call, not UI); catch-up after a dropped SSE delivers every comment exactly once.

### 12. `collab-frf-context-resources-presence`
- **Scope**: daemon · **Depends on**: 11 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 2
- **library**: cand-009, cand-011
- **Details**: Add `collab/frf-*.ts` implementing `ResourcePublishAdapter`, `WorkspaceContextProvider`, `TeamProjectCatalogSink`, presence over `SignalService`; extend only the selector functions from change 5. Content-first/pointer-last publish. Resource blobs need object storage — **no fabric API exists (build_required)**; this change picks an interim (e.g. Forge-addressable blob via the existing MinIO/IPFS) and records the decision.
- **Acceptance**: publish → pull round-trip between two principals preserves bytes and manifest digest; owner never reads its own mirror back (loop-safety test from upstream); presence TTL heartbeat visible to a second principal; storage decision documented with its limits.

### 13. `message-center-remodel`
- **Scope**: daemon + web + cli + contracts + i18n (19 locales) · **Depends on**: 11 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 2
- **library**: cand-011
- **Details**: Re-model per D-002/analysis §4: add `eventType` (`comment.created|comment.mention|review.requested|review.decision|invite.received|validator.feedback|run.completed`), `projectId`, `actorMemberId`; Iggy per-member inbox, read-state in Forge (fixes the missing cross-device archive), delivery over the existing `/api/workspace/events` SSE hop; drop the anonymous mirror. Web + HTTP + `od message-center` land together; every new string in all 19 locales + `types.ts`.
- **Acceptance**: a comment by user A produces an unread item for member B on a second device within one SSE round-trip; mark-read persists across devices; `od message-center list --json` returns the same items as the UI; typecheck proves all 19 locale files define the new keys.

### 14. `audit-log-events`
- **Scope**: daemon · **Depends on**: 11 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 2
- **Details**: Emit Iggy audit events for membership change, invite/revoke, share/unshare, share-link create/redeem, role change, and comment-decision; append-only; queryable by project for owners/admins (`od audit list`).
- **Acceptance**: each listed action produces exactly one event with actor/target/time; a non-admin cannot read the log (policy test); log survives daemon restart.

### 15. `web-agent-sandbox-and-limits`
- **Scope**: daemon + deploy + gate config · **Depends on**: 6, 9 · **Agent**: Claude Code / Manual review · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH (the largest risk in the analysis) · **Goals**: 5
- **Details**: On the **web surface only**: guests/externals have no run capability (enforced in daemon, change 6); member runs execute in a sandbox without host credentials and with an egress allowlist, never as the daemon user; per-member and per-tenant budgets/quotas; gate rate limits on `/api/*` and `/guest`. Desktop is untouched (D-008).
- **Acceptance**: a guest `POST` to run an agent returns 403 (direct API test); a member run cannot read daemon env secrets or reach a non-allowlisted host (negative e2e inside the sandbox); budget exhaustion returns a clear 429; no change in desktop run behaviour (regression e2e).

### 16. `uar-acp-wrapper-core`  *(new component, Rust, in the UAR workspace)*
- **Scope**: new binary · **Depends on**: NONE · **Agent**: Claude Code / Codex · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **library**: cand-012, cand-013, cand-014
- **Details**: `uar acp` stdio binary on the official `agent-client-protocol` crate, skeleton from `openai-proxy/src/acp.rs`. Implements `initialize`, `session/new|load` (model list in the `session/new` result so `detectAcpModels` works), `set_model`/`set_config_option`, `prompt` (stream → `agent_message_chunk` / `agent_thought_chunk`), `cancel` (→ `POST /api/uar/runs/{id}/cancel`), env-based auth (`UAR_BASE_URL`, `UAR_PAT` → JWT exchange with refresh), keepalive `session/update` under the 10-min watchdog.
- **Acceptance**: passes the open-design ACP conformance mock (`mocks/lib/format-acp.mjs` fixtures) and a real `detectAcpModels` probe; cancellation stops a live UAR run; a 401 on token exchange surfaces as a clear JSON-RPC error on `session/new`.

### 17. `uar-acp-tools-permissions-and-files`
- **Scope**: wrapper · **Depends on**: 16 · **Agent**: Claude Code / Codex · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **Details**: Map `TOOL_CALL_*` → `tool_call`/`tool_call_update` (with `locations[].path` and `rawInput` so artifact accounting works); map `uar.tool.approval_required` → `session/request_permission` (**always offer `allow_once`** or the daemon fails the turn) then `POST …/approval`. **Filesystem by mode (D-009):** `UAR_MODE=sidecar` — UAR started with the project cwd as workspace root so its file tools write directly (**needs UAR to accept a caller-provided root: verify, else add it upstream in UAR**); `UAR_MODE=remote` — wrapper materialises file-write results into the cwd with strict confinement (reject `..`/absolute paths outside cwd) and declares shell/binary side effects unsupported.
- **Acceptance**: sidecar mode — a UAR-authored file appears in the project directory and is detected as an artifact; remote mode — same, with a **path-traversal negative test** (`../../etc/x` rejected); an approval round-trip (approve and deny) is exercised; the wrapper never blocks on a missing allow option.

### 18. `uar-runtime-registration-and-modes`
- **Scope**: daemon + contracts + web + mocks + docs · **Depends on**: 16, 17 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **Details**: Register `defs/uar.ts` as a kimi-style ACP def (`bin`, `buildArgs: ['acp']`, `streamFormat: 'acp-json-rpc'`, `externalMcpInjection: 'acp-merge'`); wire `UAR_BIN` env map, agent-id lists (`app-config.ts`, `executables.ts`, `auth.ts`, contracts analytics lists, `App.tsx`, `AgentIcon` + SVG), mock `mocks/bin/uar` + manifest, `docs/agent-adapters.md`. **Mode selection (D-009)** as settings: *Local sidecar* (app starts/stops `uar` bound to the app lifecycle through the sidecar boundary, not ad-hoc spawns) vs *Remote* (base URL + PAT; same host or cloud). Settings UI + `od` flag + HTTP together; new strings in 19 locales.
- **Acceptance**: UAR appears in agent detection when the binary is present, and the picker works in both modes; sidecar lifecycle follows app start/stop (stop leaves no orphan process); remote mode works against a URL with a PAT; ACP stays intact for every other runtime (existing runtime suites unchanged); `pnpm guard` + `pnpm typecheck` + 19-locale check pass. **Surface rule:** on web, remote mode only; sidecar is desktop-only (matrix).

### 19. `brand-seam-and-rename-codemod`
- **Scope**: repo tooling + packaged · **Depends on**: 1, spike (0) report · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 3
- **library**: cand-001, cand-002, cand-003
- **Details**: A single `brand.config` consumed by `tools-pack` and the web build; a committed idempotent TypeScript `brand/apply.ts` (allowlist of paths/patterns) plus `brand/verify.ts` that fails on any old-brand string outside the **must-not-rename** list; `git config rerere.enabled true` documented in the runbook. TypeScript-first per `AGENTS.md`.
- **Acceptance**: running `apply` twice yields no further diff (idempotent); `verify` fails on a seeded stray "Open Design" and passes clean; the do-not-rename list is asserted (a test renames nothing in it); `pnpm guard` passes.

### 20. `knowdesign-tokens-icons-and-app-identity`
- **Scope**: web CSS + packaged + tools/pack · **Depends on**: 19 · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 3
- **library**: cand-015
- **Details**: Derive a canonical tokens file from `know-me-system/desktop/src/index.css` (D-005) and apply it through the existing token/CSS-module structure (no new global selectors in `index.css`, per AGENTS.md); resolve the Dart/CSS drift in favour of CSS. Generate Electron icons (`.icns`/`.ico`) from the KnowMe logo library. Packaged identity: `KnowDesign`, `KnowDesign Beta`, `KnowDesign Prerelease`, `KnowDesign Preview` (channel-distinct, never `KnowDesign.app` for non-stable DMGs); `appId`/`productName`; register a KnowDesign `od://`-compatible scheme **alongside** the existing one. **Open point:** "Flat 2.0" (no borders/dividers) vs existing component styling — evaluate before applying wholesale.
- **Acceptance**: both themes render with ember/canvas/ink tokens (screenshots at 320/768/1024/1440 per the web testing rules); mac/Windows build produces correctly named per-channel app bundles; contrast checks pass; no `Open Design` string in user-visible UI on desktop or web (verifier from change 19).

### 21. `knowdesign-docs-locales-ci-and-repo-name`
- **Scope**: docs + i18n values + CI + image names · **Depends on**: 19, 20 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: MEDIUM · **Goals**: 3
- **Details**: Run the codemod over README/QUICKSTART/CONTRIBUTING, 19 locale **values** (keys unchanged), image names (`ghcr.io/GQAdonis/od` → agreed KnowDesign name; keep a compatibility alias), workflow display strings. **GitHub project rename is outward-facing and breaks clone URLs and the `upstream` relationship — do manually, after confirming.**
- **Acceptance**: `brand/verify` clean; locale typecheck passes; image still pulls under the old name via alias; **repo rename performed only on explicit operator confirmation**.

### 22. `merge-rehearsal-and-runbook`
- **Scope**: repo tooling + docs · **Depends on**: 2, 3, 4, 19, 20, 21 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: HIGH (proves D-003) · **Goals**: 3, 1
- **Details**: Perform a real `git merge upstream/main` against the finished fork, run `brand/apply` + `verify`, count conflicts versus the spike's prediction, and write the **upstream-sync runbook** (merge → rerere → apply → verify → test). Record the new `OD_*`/alias map.
- **Acceptance**: merge completes with ≤ the spike's predicted conflict count (or the variance is explained); `pnpm guard`, `pnpm typecheck`, and package suites pass; runbook reproduces the sync from a clean clone.

---

## EXECUTION ROUND ORDER

- **Round 0 (gate)**: 0
- **Round 1 (parallel)**: 1 · 16 *(16 is independent of A–D)*
- **Round 2 (parallel)**: 2 · 3 · 4 · 5 · 6 · 17 · 19
- **Round 3 (parallel)**: 7 · 18 · 20
- **Round 4 (parallel)**: 8 · 21
- **Round 5 (parallel)**: 9 *(also blocked on parent `expose-via-shared-gateway`)* · 11
- **Round 6 (parallel)**: 10 · 12 · 13 · 14 · 15
- **Round 7**: 22

Ordering rationale: removal of commerce/login (A) lands first because it is the user-visible pain and the seam it uses is what the spike validates; the capability policy (6) precedes everything that enforces permissions; per-user keying (7→8) **must land before any public exposure** (9) — the guest flow is never deployed ahead of keying; brand work runs last among structural work to avoid rework; UAR is independent and runs in parallel.

## Goal coverage check

| Goal | Covered by | Status |
|---|---|---|
| 1 — remove upstream backend commerce/services | 0, 1, 2, 3, 4, 22 | Full for **commerce, cloud login, marketplace, Vela media, touchpoints, telemetry**. Collab-on-Vela is *replaced*, not deleted (goal 2). |
| 2 — recreate on the KnowMe fabric | 5, 7, 8, 9, 10, 11, 12, 13, 14 | Full except **object storage** (change 12 picks an interim; no fabric API exists) and **billing** (intentionally not replaced). |
| 3 — rebrand KnowDesign | 0, 19, 20, 21, 22 | Full for the visible surface per D-007; internals aliased by design. GitHub rename is manual. |
| 4 — UAR as an ACP runtime | 16, 17, 18 | Full; sidecar-vs-remote per D-009. |
| 5 — no end-user login | 2, 6, 7, 8, 9, 10, 15 | Desktop: full (no login at all). Web: guests limited per D-008. |

## Parent plan impact (to apply — see amendment appended to `../plan.md`)

- **Parent goal 6** ("edge authentication only") is **superseded** by D-001/D-008 and changes 7–10 here.
- **Parent changes 10 `gate-authenticated-access` and 11 `surface-authenticated-identity`** are replaced by this child's 7, 9, 10 (they cannot both exist: 11's "every signed-in user sees everyone's projects" is no longer acceptable).
- **Parent change 7 `expose-via-shared-gateway`** is a hard dependency of this child's change 9; its **temporary direct route must not outlive change 9**.
- **Parent changes 4–6 (PostgreSQL)** are **not duplicated**. They must now also treat this child's owner-scoped schema (change 8) as input, and the `5a` design decision should evaluate **Forge Quarry vs direct `pg`** (analysis found no wired daemon backend). Per-user keying means Postgres is no longer "no new schema" — flag for `5a`.

## Carried risks

1. **Spike NO-GO** invalidates changes 1–5 and 19–22 as written (falls back to a regenerated branch or Vela-API shim).
2. **Daemon test baseline is UNKNOWN** (parent risk 1) — capture before changes 1, 2, 8; without it nothing can be attributed.
3. **Per-user keying scope** (change 8): the 1–2 week figure was not derived from reading daemon source; the triage of the 49 tables may expand it.
4. **UAR workspace-root support unverified** (change 17); if absent, sidecar mode needs a change in the UAR repo — a cross-repo dependency this plan does not schedule.
5. **UAR is not deployed in `know-me`** — remote-cloud mode has no target until a UAR deployment change is added (deliberately **not** in this plan; add `deploy-uar-to-know-me` if cloud mode is wanted on the hosted site).
6. **Cross-repo work** (changes 9, 10, 16–17 touch `flint-core-infra`, Kratos/Keto config, the UAR repo) — executed outside this repo; each needs its own review path.
7. **Kratos identity-schema change** (change 10) affects existing identities — stage first.
8. **Flat 2.0 vs component styling** (change 20) may force design negotiation.
9. **Web member runs** (change 15) are only as safe as the sandbox; until it passes, web agent runs should stay disabled behind the matrix.
10. **Assumption D-011** (audit log + share links in, handoff + mentions out) is the planner's reading of an ambiguous answer.

## COMMANDS TO RUN

```
/opsx:new rebrand-merge-conflict-spike
/opsx:new build-profile-seam-and-permission-decoupling
/opsx:new stub-amr-and-billing
/opsx:new drop-touchpoints-marketplace-vela-media
/opsx:new disable-telemetry-and-upstream-endpoints
/opsx:new remove-vela-collab-hardcoding
/opsx:new capability-policy-surface-matrix
/opsx:new resolve-principal-and-trust-gate
/opsx:new owner-scoping-core-tables
/opsx:new guest-minter-and-gate-site
/opsx:new external-validator-invites-and-share-links
/opsx:new collab-frf-comments-and-members
/opsx:new collab-frf-context-resources-presence
/opsx:new message-center-remodel
/opsx:new audit-log-events
/opsx:new web-agent-sandbox-and-limits
/opsx:new uar-acp-wrapper-core
/opsx:new uar-acp-tools-permissions-and-files
/opsx:new uar-runtime-registration-and-modes
/opsx:new brand-seam-and-rename-codemod
/opsx:new knowdesign-tokens-icons-and-app-identity
/opsx:new knowdesign-docs-locales-ci-and-repo-name
/opsx:new merge-rehearsal-and-runbook
```

PLAN COMPLETE
