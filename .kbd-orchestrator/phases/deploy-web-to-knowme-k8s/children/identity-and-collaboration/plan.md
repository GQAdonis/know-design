# PLAN: deploy-web-to-knowme-k8s › identity-and-collaboration

- **Date**: 2026-10-03 · **Inherited from** `../backend-complete-replacement/plan.md` as amended by `plan-amendments.md` (spike result, D-013/D-014). Change text below is copied from the umbrella and is authoritative here.
- **Changes**: 10
- **Round order**: Round 1: capability-policy-surface-matrix · Round 2: resolve-principal-and-trust-gate · Round 3: owner-scoping-core-tables · Round 4 (needs parent expose-via-shared-gateway): guest-minter-and-gate-site · Round 5: external-validator-invites-and-share-links, collab-frf-comments-and-members, web-agent-sandbox-and-limits · Round 6: collab-frf-context-resources-presence, message-center-remodel, audit-log-events. Must not be publicly exposed before owner-scoping-core-tables is complete.
- **Decisions in force**: D-001…D-014 in `../backend-complete-replacement/decision-log.md`.

## CHANGE LIST (ordered)

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

