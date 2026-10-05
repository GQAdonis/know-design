# ANALYSIS: deploy-web-to-knowme-k8s › backend-complete-replacement

- **Date**: 2026-10-02 · **Mode**: stack specified (TS monorepo + Rust fabric) · **Inputs**: `assessment.md`, operator decisions D-001…D-006 (`decision-log.md`)
- **Method**: four parallel research tracks (rebrand/merge strategy, identity, collaboration + message center, UAR→ACP wrapper), each capped at 8 queries/source, ~15 min. Evidence labels: **[V]** read in code/docs/cluster, **[I]** inferred. **Nothing was built, run, or live-tested.**
- **Candidates**: 17 in `library-candidates.json` (7 adopt/adapt on-fabric, 3 reference, 3 reject, plus 8 `build_required` items).
- **Not done**: adversarial review (model preflight stale since 2026-09-14); Tier-2 Context7 used only by the identity track.

---

## 0. Headline

1. **D-003 (stay mergeable) and D-004 (rename everything) cannot both hold under plain `git merge`.** Every fork that works (Brave, VSCodium, Ungoogled-Chromium) keeps upstream pristine and applies a *re-appliable layer*; none keeps a renamed tree under `git merge`. [V for Brave; I for the other two]. This analysis proposes a reconciliation (§1) that needs your confirmation — it is the single most consequential open decision.
2. **"No login" is achievable without Kratos changes**, via a per-device guest identity minted by an extended `sso-broker` — but it forces the daemon to gain real per-user identity (1–2 weeks, estimate), because every upstream table is ownerless. Silent guest access is a **security** decision as much as a UX one (§3).
3. **Team workspaces survive removal of Vela only through additive seams.** Upstream's collab is single-writer snapshot sync, not co-editing, and roles are only `owner|admin|member` — there is **no viewer/commenter role**, which is exactly what external validators need (§4).
4. **UAR→ACP is feasible and small on the wire; the hard problem is the filesystem** — UAR runs tools server-side and cannot write the daemon's project directory (§5).

---

## 1. Rebrand + stay mergeable (D-003 vs D-004)

**What D-004 literally means** (rename `@open-design/*`, `OD_*`, `od`, `od://`, data dirs, ~3,200 files) is the worst case for merge cost: every upstream commit that touches a line containing the brand string conflicts, and `rerere` helps little because surrounding context keeps changing.

**Options ranked** (conflict cost per upstream sync):

| # | Option | Cost | Note |
|---|---|---|---|
| 1 | **Hybrid: brand seam + build-profile stub swap + small idempotent codemod** | tens of files | Recommended |
| 2 | Regenerated downstream branch (codemod over pristine `upstream/main`) | thousands of files, but conflict-free | Loses normal merge history/blame |
| 3 | Brave-style patch queue (`git apply -3`) | medium–high at this scale | Suits few surgical patches |
| 4 | Rename in-tree + `merge -X theirs` + re-run codemod | high | Avoid |

**Recommended reconciliation of D-003/D-004** — rename *everything a user or operator sees or touches*, alias the rest:

- **Rename (via one brand config + build-time application):** product/display name, app title, installer/channel names (`KnowDesign`, `KnowDesign Beta`, `…Prerelease`, `…Preview` — `AGENTS.md` requires channel-distinct names), icons, i18n **values** (19 locales; change values, not keys), docs/README, image names, Electron `appId`/`productName`, GitHub project name, CI display strings.
- **Do NOT rename (alias instead)** [I, derived from `AGENTS.md`]: workspace package `name` fields and directories (`@open-design/*`), `OD_*` env contract (`OD_DATA_DIR`…), sidecar stamp keys, i18n keys, the `od` CLI binary and `od://` scheme (add a display/second registration), `plugins/_official/scenarios/od-next-strategy/assets/**` (sent to the model verbatim; package-hashed), `pnpm-lock.yaml`, workflow filenames/job IDs, `scopes.json`, CLI recordings/mocks fixtures, `docs/i18n/*`.
- **If you still want literal `@knowdesign/*` everywhere**, that is option 2 (a regenerated branch) and you give up ordinary `git merge`. Decide explicitly.
- **Hosted-feature removal by stub-module swap, not deletion** (modify/delete conflicts every time upstream touches a deleted file): a `build-profile` flag swaps Vela/AMR/billing/marketplace/vela-media modules for our own stub files via bundler/TS aliases and conditional route registration. **Caveat [I]:** `pnpm guard` and the boundary rules may restrict aliasing — verify before committing to it.
- **Merge workflow:** `rerere.enabled=true`; after each `git merge upstream/main`, re-run the committed, idempotent `brand/apply.ts` (TS per `AGENTS.md`) plus a verifier that greps for the old brand outside the do-not-rename list; on conflict prefer upstream's side and re-run the codemod.
- **Brand source (D-005)**: KnowMe CSS tokens. Derive a canonical `tokens` file from `know-me-system/desktop/src/index.css` (no `tokens.toml`/`DESIGN.md` exists). Mac `.icns`/Windows `.ico` must be generated from the KnowMe logo library (the Tauri set is not directly usable by Electron/`tools/pack`). **Risk:** "Flat 2.0" (no borders/dividers/layout shadows) may collide with open-design's component styling and the CSS-module conventions.
- **Cheap de-risking:** a throwaway-branch **spike** — stub billing via the build-profile seam, `git merge upstream/main`, count conflicts. This measures real conflict cost instead of estimating it.

## 2. Removing commerce — what to drop and what to watch

Per D-002 drop: billing/credits/wallet/Coding Plan, marketplace, Vela media; and (implied by "de-emphasize commerce") campaigns/touchpoints (DeepSeek campaign, Go-plan sunset, upgrade cards). **Recommendation: drop touchpoints/CMS with billing** — they are Vela-CMS-specific marketing, separate from message center [V].

**Traps found [V]:**
- `buildWorkspacePermissions` (`collab.ts:577`) mixes billing lifecycle into collab authority: `canWriteSyncedFiles` is false when the workspace is `locked`. Removing billing naively could leave team workspaces **write-locked**. **Stub lifecycle to `active` first.**
- `WorkspaceCollabContext` carries billing/seat/provider-mode fields the stub must supply.
- The pre-run balance gate, onboarding redirect, and `CloudSignInTip` are keyed to `agentId==='amr'`; removing the `amr` agent removes the gate (local CLI agents and BYOK never hit it [I — confirm by a manual run]).
- Telemetry (Langfuse/PostHog/diagnostics relay) is consent-gated and a no-op when unconfigured → **disable by config first, delete later** [V].
- Updater/what's-new/public-metadata/marketplace fetches point at `*.open-design.ai` and need repointing or disabling.

**Unrequested recommendations worth considering** (evidence-based; each also feeds the new message center):
1. **viewer + commenter roles** per project via Keto (essential for validators; upstream has none).
2. **Audit log** of membership, share/unshare and comment decisions (none exists upstream) — the main trust gap for externals.
3. **Scoped, expiring share links** (upstream has a single manually-revocable public slug with no expiry/scope).
4. **Reviewer handoff package** (version + comment thread + decisions); `RunResultPackage` and `routes/handoff.ts` exist to build on.
5. **Mention routing / notification digests** (comments carry `memberId`; nothing consumes mentions).

## 3. Identity and "no login" (D-001, goal 5)

**Findings [V]:** Kratos v26.2.0 is password-only with an email schema and has **no anonymous/guest identity**; gate's `anonymous` provider returns one static subject (unusable); `sso-broker` already mints ES256 `flint_session` cookies and serves a Kratos-shaped `/sessions/whoami`; there is no `design.know-me.tools` gate site/route yet; staff with a `know-me.tools` Kratos cookie already work on this subdomain.

**Recommended architecture [I where marked]:**
1. **Guest minter** — `GET /guest` on `sso-broker` (first visit auto-mints a 1-year HttpOnly cookie, `sub=g_<uuid>`, `kind=guest`, `tenant_id`); `whoami` extended with `metadata_public`. The main user never sees a login.
2. **Gate site** for `design.know-me.tools` fronting the daemon; accept Kratos cookie *or* guest cookie (cleanest: broker `whoami` validates either; per-route multi-provider fallback in gate is **inferred, unread**).
3. **Daemon trusts only** `X-Flint-User-Id/-Tenant-Id/-Principal-Type/-Scope`, reachable only via gate (NetworkPolicy); gate already strips spoofed `x-flint-*` [V].
4. **External validators:** invite service → Kratos admin identity + recovery link/code (`return_to` the project) + Keto `project#commenter` tuple with TTL. Enable Kratos `code` method for returning externals. Alternative: share link `/s/<token>` → guest + scoped Keto tuple.
5. **Guest→real upgrade:** one transaction re-keys `owner_id` and Keto tuples.

**Security (the part that makes "no login" non-trivial) [I]:** with a cookie anyone can spawn agents with *server credentials*, spend model budget, shell out, or read env. Mitigations required before any public exposure: guests/externals get **view+comment only** (no run permission); per-subject/IP budgets and rate limits at gate; agents run sandboxed (no host creds, egress allowlist); challenge + per-IP cap + GC on `/guest`; Keto `Check` server-side; default-deny tenant scoping. **Verify live:** `/admin/recovery/link` vs `/code` on v26.2.0; whether admin can create a session for an identity.

## 4. Team workspaces + message center (D-002)

**Collab as built [V]:** owner publishes debounced versioned *snapshots* to a "resource hub"; members pull a read-only mirror; only *preview comments* are fine-grained (seq-cursor log with anchor-drift states). No CRDT (no yjs/automerge deps; live cursors were cut). **Everything except local SQLite, the publish scheduler, in-memory presence, and the comment outbox runs through the `vela` CLI / Vela HTTP.** `OD_WORKSPACE_CONTEXT_SOURCE=vela` is the master switch; `OD_COLLAB_STORE` **does not exist**.

**Seams (additive, no upstream deletions) [V]:**
- `CollabCloudClient` wire contract (`collab-cloud.ts:78-179`) — comments + members, env-selected → maps to an FRF/Iggy stream. *Zero upstream edits, but only partial coverage.*
- `ResourcePublishAdapter`, `WorkspaceContextProvider`, `TeamProjectCatalogSink`, presence client — injectable; add `collab/frf-*.ts` and edit only the three selector functions.
- **Conflict hotspots:** hardcoded `=== 'vela'` at `server.ts:3841,3904,3918,6072` and `collab/sync-digest.ts:125`.
- Alternative lowest-merge-risk path [I]: keep `source=vela`, repoint `VELA_API_URL` at an FRF/Forge gateway + a `vela`-compatible CLI shim (mocks are partial specs). It conflicts with D-002's removal of Vela and perpetuates a CLI contract we would own — kept as fallback; the spike decides.

**Mapping [I]:** Keto → roles/permission; Iggy → comment stream + invalidation fan-out + inboxes; SignalService → presence; Forge/Postgres RLS → catalog, directory, read-state. **CRDT not needed** (reject Yjs/Automerge/Loro/Hocuspocus for now; revisit only for multi-writer artifact editing).

**Message center (re-model per D-002):** today a Vela-hosted announcement inbox (`MessageCenterMessage`, 3 endpoints: list / mark-read / read-all, `od message-center`). The DTO is already generic and the source is swappable by repointing one proxy. Re-model as an internal-collaboration inbox: add `eventType` (comment.created/mention, review.requested/decision, invite.received, validator.feedback, run.completed), `projectId`, `actorMemberId`; source = Iggy per-member topic, read-state in Forge (also fixes upstream's missing cross-device archive); deliver via the existing thin-SSE `/api/workspace/events` hop; drop the anonymous mirror and touchpoints. **`AGENTS.md` dual-track rule applies**: web + HTTP + `od` CLI land together.

## 5. UAR as an ACP runtime (D-006)

**Contract the daemon speaks [V]:** `initialize` (no `fs`/`terminal` capabilities, no ACP `authenticate` → **auth must be env-based**), `session/new|load`, `session/set_model` or `set_config_option`, `session/prompt`, `session/cancel`; consumes `session/update` kinds `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update` (artifact accounting reads `locations[].path`/`rawInput`); `plan` is ignored. `session/request_permission` is auto-approved but **the turn fails if no allow option is offered** — always include `allow_once`. 10-min silence watchdog → keepalives. Model list must appear in the `session/new` response (`detectAcpModels`).

**Design:** Rust `uar acp` binary on the official `agent-client-protocol` crate; skeleton = `prometheus-skill-pack/tools/openai-proxy/src/acp.rs` (wire-compliant; its `docs/acp.md` is stale; lacks cancel/load/tool_call/permission/set_model). Event map: `TEXT_MESSAGE_CONTENT`→`agent_message_chunk`; `REASONING_*`→`agent_thought_chunk`; `TOOL_CALL_*`→`tool_call`/`tool_call_update`; `uar.tool.approval_required`→`session/request_permission` then `POST /api/uar/runs/{id}/approval`; `RUN_FINISHED`→`end_turn`; `session/cancel`→`POST /api/uar/runs/{id}/cancel`. UAR's own `src/uar/api/acp/` is the unrelated *Agent Communication Protocol* — do not conflate.

**Filesystem problem [V facts / I design]:** UAR file/terminal tools write the *server's* disk; no client-side tool mode exists; the daemon advertises no `fs/*`. Options: (1) **local UAR sidecar with a shared project cwd** (simplest; needs UAR file tools to accept a workspace root — unverified), (2) remote UAR + wrapper materialises file-write results into the cwd (path-traversal-critical; cannot mirror shell/binary side effects), (3) ACP `fs/*` delegation (best long-term; needs UAR + daemon changes). **Consequence:** a hosted `design.know-me.tools` run of UAR in a pod cannot produce artifacts in the daemon's project directory without option 2/3. **Open:** UAR has no verified threads/list API (so `session/load` must use `session_id` + history); full tool-arg streaming for writes unverified; UAR is **not deployed** in `know-me`.

Effort (estimate only): minimal text path 2–3 d; tool/approval bridge 2–3 d; filesystem bridge 1 d–1 wk; conformance + def/docs 2 d → **≈2–3 weeks**.

## 6. Build-vs-adopt summary

- **Adopt (existing fabric):** flint-gate, Kratos code/passkey/admin APIs, Keto/AuthzService, FRF Spine/Iggy, Forge Quarry, KnowMe CSS tokens, `agent-client-protocol` crate, git `rerere`.
- **Adapt:** sso-broker (guest minter), collab seams, openai-proxy ACP skeleton, Brave-style overlay pattern.
- **Reject:** Yjs/Automerge/Loro/Hocuspocus (not needed), Novu (Resend suffices).
- **Build (no candidate):** per-user daemon keying; guest minter + upgrade; validator invite service; viewer/commenter roles + human review decision; `uar acp` + file bridge; object storage; audit log; UAR cluster deployment.

## 7. Sequencing implications for Plan

1. **Spike first** (stub billing + merge + conflict count) — de-risks §1.
2. **Decouple permissions from billing** (stub lifecycle `active`), then cut gating, then stub AMR/billing/marketplace/vela-media/touchpoints behind the build profile.
3. **Per-user daemon keying + gate site** before *any* public exposure — never deploy the guest flow ahead of keying.
4. Collab seams → message-center re-model → roles/audit/share links.
5. Rebrand layer (brand config, tokens, icons) — last among structural work, to avoid rework.
6. UAR wrapper is independent; schedule in parallel once the filesystem option is chosen.
7. **Parent phase impact:** parent goal 6 (edge auth only) is superseded; parent goal 5 (PostgreSQL) now has a concrete target (Forge Quarry) but **no daemon backend is wired** and per-user keying depends on it. Parent `plan.md` must be revised in `/kbd-plan`.

## 8. Open questions (operator)

1. **Reconciliation (§1):** accept "rename visible surface + alias internals + re-runnable codemod", or choose a regenerated downstream branch (literal `@knowdesign/*`, no plain merges)?
2. **Guest agent permissions (§3):** may anonymous guests *run agents* at all, or only view/comment? (Spend + credential exposure.)
3. **UAR filesystem option (§5):** local sidecar (desktop only), remote + materialisation, or invest in ACP `fs/*` delegation? Where does UAR run for the hosted site?
4. **Touchpoints/campaigns:** confirm drop together with billing.
5. **Unrequested recommendations (§2):** which of roles / audit log / scoped share links / handoff package / mention routing are in scope for this child vs deferred?
6. **Spike:** approve a throwaway-branch conflict-count spike before Plan?

## 9. Risks carried forward

R1 (hosted no-login ownerlessness) now has a design but a large build; R2 (fork divergence) has a proposed strategy but unvalidated aliasing under `pnpm guard`; new: write-lock coupling to billing lifecycle; UAR filesystem; `recovery/link` possibly deprecated; Flat-2.0 vs component styling; no verified VSCodium/Ungoogled evidence.

ANALYSIS COMPLETE
