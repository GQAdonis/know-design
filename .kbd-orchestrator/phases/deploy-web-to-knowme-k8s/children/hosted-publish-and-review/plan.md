# PLAN: deploy-web-to-knowme-k8s › hosted-publish-and-review

- **Status**: D1–D5 approved and recorded (D2–D5 on 2026-10-17, D1 on 2026-10-19). Hub repo: `Know-Me-Tools/know-design-hub` (not yet created; creation needs explicit go-ahead at change 02). Database confirmed as a dedicated DB and role on the existing platform Postgres instance. No code has been written. Execute is not entered.
- **Inputs**: `assessment.md` (2026-10-17). Analyze skipped (no existing service to adopt).
- **Outcome**: an author publishes a design from KnowDesign (UI or `od`) and gets a link on `know-me.tools`; a reviewer with no account opens it in a browser, comments; the author sees the comments in their app; the author can revoke.

## Architecture in one picture

```
(hub = separate Rust repo, see D1; KnowDesign repo gets only the daemon client, CLI/UI and contract types)
KnowDesign daemon ──HTTPS (bearer)──► hub API  review.know-me.tools   ──► Postgres 18 (flint-forge image, hub DB)
  publish / revoke / pull comments        │  publish, redact, guest, comments (collab-cloud contract)
                                          └──► SnapshotStore (PVC v1, S3 adapter later)
Reviewer browser ──► review.know-me.tools/r/<slug>  (viewer + comment overlay, guest cookie)
                       └─ iframe ► snap.know-me.tools/<slug>/…  (isolated origin, CSP sandbox)
```

Two hosts on the shared `argocd-gateway`: `review.` (API + reviewer app) and `snap.` (untrusted authored HTML only, no cookies, no shared origin with any other service).

## Decisions for the operator (each has a recommendation; none is made yet)

| # | Decision | Recommendation | Why / alternative |
|---|---|---|---|
| D1 | Hub implementation and home | **APPROVED (revised after adversarial review): Rust (axum/tower) in its own repository**, reviewer page as a small TypeScript/Vite bundle served by the hub. **APPROVED 2026-10-19: repo `Know-Me-Tools/know-design-hub`.** | The original TS-in-monorepo case rested on two weak premises: "near-zero merge friction" (wrong: any hub dependency adds `pnpm-lock.yaml` churn and a Nix deps-hash refresh per `constraints.md:47`) and type sharing (the contract DTOs are plain TS interfaces; a schema artifact is needed either way). Home is separated from language: own repo for release cadence and fork hygiene; Rust for platform fit, the operator's maintenance base, and serving untrusted content. Cost of being wrong is bounded because the OpenAPI contract and conformance suite are built first (change 01). Alt: TS in its own repo (viable, loses platform fit). |
| D2 | Storage v1 | **APPROVED.** Postgres on the flint-forge customized Postgres 18 image (`ghcr.io/prometheus-ags/flint-forge-postgres18`, digest-pinned): a dedicated database and LOGIN role on the existing platform instance, direct driver access (not Quarry). Snapshot bytes on a `linode-block-storage-retain` PVC behind a `SnapshotStore` interface. | Comments need an atomic per-project `seq`; Quarry's grammar has no FKs/triggers and no `bytea`. pg_cron/pg_net run only in the `flint` database (`cron.database_name=flint`), so a new database is isolated from them. CI and local dev run against the same image. **Creating the production DB, role and Secret still needs your explicit approval at that step.** If you meant a separate hub-only instance, say so; it adds a second stateful workload. |
| D3 | Who owns the `collab-cloud` server | **APPROVED.** This hub owns it; `identity-and-collaboration` changes `external-validator-invites-and-share-links` and `collab-frf-comments-and-members` are re-scoped to wire into the hub | Avoids two comment servers and two share-link schemes. The re-scope of that sibling is applied separately. |
| D4 | Reviewer identity v1 | **APPROVED.** Capability link (≥128-bit slug) + hub-signed guest cookie (display name) | Does not wait for the unbuilt `sso-broker /guest` or the principal model. Interface `ReviewerIdentity` lets the gate/Kratos path replace it later. |
| D5 | Hostnames | **APPROVED.** `review.know-me.tools` and `snap.know-me.tools` | Origin isolation for authored HTML. Needs two cert-manager Certificates and listener pairs in `argocd-config`, plus Cloudflare DNS. |
| D6 | Daemon change shape | New `integrations/publish-hub.ts` HTTP client; swap the four `runVelaResourceCommand` publish/redact call sites behind `OD_PUBLISH_HUB_URL` + token; leave the Vela path intact for upstream | Smallest edit to the upstream-owned `collab-sync.ts`. Persist the publication store in SQLite. |
| D7 | Comments back for personal projects | Extend relay eligibility to "published for review" projects; guests appear in the member directory as `role: commenter, kind: guest` | Today relay needs a team workspace with `visibility==='team'`. Spike first (change 00). |
| D8 | Defaults | 25 MB/snapshot, 14-day expiry (author-adjustable, max 90), 60 publishes/day/author, comment ≤2000 chars, 30 comments/min/guest | Tunable config, not code constants. |

## Changes (ordered)

Execute starts with a **spike** because the assessment left a load-bearing unknown.

| ID | Change | Delivers | Depends on | Approval needed |
|---|---|---|---|---|
| 00 | `spike-guest-member-relay` | Written finding: can the existing relay receiver re-home comments authored by a non-workspace guest member? What minimum client change is needed? Confirms or revises D7. | none | none |
| 01 | `hub-contract` | OpenAPI + JSON Schema for publish, snapshot, redact, public-get, guest, comment and error codes, in the hub repo; thin additive `packages/contracts/src/api/hub.ts` in this repo for the daemon's view; language-agnostic HTTP conformance suite adapted from `e2e/lib/playwright/fake-collab-hub.ts`; written threat enumeration for the serving path (path traversal, slug authz, CSP/origin isolation, comment XSS, upload limits, ReDoS-class parsers) | 00 | D1, D3 |
| 02 | `hub-core-service` | New hub repo, Rust/axum: slug mint, publish/redact, `SnapshotStore` (fs), serve on the `snap` origin with `CSP: sandbox`, size/expiry limits, in-memory repo for tests; CI and digest-pinned image pipeline following `flint-core-infra` `images.yaml` | 01 | D1, D8; **repo and org creation needs your confirmation** |
| 03 | `hub-database` | Migrations and Postgres repo; local dev and CI run against a throwaway container of the same `flint-forge-postgres18` image the platform runs (confirm the image is pullable from CI) | 02 | **D2: prod DB/role/Secret** |
| 04 | `hub-collab-cloud-endpoints` | `PUT/GET /teams/:t/members`, `POST/GET /teams/:t/projects/:p/comments` with atomic `seq`, ETag/304, tombstones; passes the conformance suite | 03 | D3 |
| 05 | `reviewer-page-and-guest-flow` | `/r/<slug>` viewer: sandboxed iframe, element/position comment overlay using the existing anchor model (selector + htmlHint + position), guest cookie, rate limits, a11y, mobile width | 04 | D4 |
| 06 | `daemon-publish-client` | `PublishHubClient`; swap 4 call sites; map hub errors to the existing `PUBLIC_*` codes; SQLite-persisted publications; desktop-allows-everything gate per D-008 | 01 | D6 |
| 07 | `cli-and-ui-parity` | `od project publish/unpublish/publications`, `od comments list/reply/resolve` (`--json`, `--prompt-file`); UI shows review link and unread-reviewer-comment badge; i18n keys in all 19 locales | 06 | none |
| 08 | `comment-return-path` | Relay eligibility for published projects, guest members, re-homing to the author's conversation, dedup by comment id | 00, 04, 06 | D7 |
| 09 | `deploy-hub` | Dockerfile in the hub repo; image CI to ghcr under the hub repo's org (digest-pinned in manifests, bumped by PR); `know-me-cluster` PR: namespace, PVC, Deployment (Recreate), Service, HTTPRoutes + http redirect, `BackendTrafficPolicy`, two Certificates and four listeners; DNS records; Secrets created out of band; Velero schedule | 03, 04, 05 | **You merge the cluster PR; Secret creation and DNS need your approval** |
| 10 | `e2e-and-security-gate` | Packaged-app E2E: publish from KnowDesign, open as reviewer in a clean browser profile, comment, see it in the author's app, revoke and confirm 404; cross-origin test (snap cannot read review cookies); rate-limit and oversize tests; XSS test on comment text | 05–09 | none |
| 11 | `docs-runbook-kbd` | Runbook (rotate, takedown, restore PVC), spec doc under `docs/cloud/`, register in KBD, merge-rehearsal note for `collab-sync.ts` | all | none |

Rounds: {00} → {01} → {02, 06 in parallel} → {03} → {04, 07} → {05, 08} → {09} → {10} → {11}.

## Verification (per AGENTS.md)

- Red test first per change; scope tests to changed packages. No full daemon/web suite locally.
- Before publishing a PR: `pnpm guard`, `pnpm typecheck`, package-scoped tests.
- Prompt/contract changes: read `docs/prompt-composition.md` only if any prompt text is touched (none planned).
- Daemon tests need Node 24 (`mise exec node@24.21.0 --`).
- Human verification for the visible flow (change 10): you drive the reviewer side in a separate browser profile.
- A visible-bug buggy-vs-fix comparison is not needed; this is new surface, not a bug fix.

## Operations and safety

- Argo selfHeal: all cluster edits go through git in `know-me-cluster`; I open PRs, you merge. Never edit live objects.
- No Secret values are printed or decoded. Secrets are created out of band by you or with your explicit approval.
- Publishing is outward-facing: it makes an author's design reachable by anyone with the link. Default expiry, revoke, and a visible "published until" in the UI are part of the design, not extras.
- Linode LoadBalancer quota: no new LBs; listeners only.
- Single replica + Recreate means downtime on rollout; documented, acceptable for v1.

## Out of scope

Realtime push of comments (polling with ETag is enough for v1; FRF fan-out can follow), Kratos-identity reviewers, team workspaces and roles (sibling phase), message center, telemetry gating (deferred by operator), the Vercel/Cloudflare deploy path.

## Task model assignments

Not assigned at plan time. They are resolved per task at execute dispatch against the then-available models and worker routes, per the task-selection protocol.

## Plan risks

1. D7 may need a larger daemon change than planned; change 00 exists to find out before committing.
2. Re-scoping the sibling (D3) is a governance step, not a code step; if declined, changes 04 and 08 must interoperate with a second comment server.
3. The upstream-owned `collab-sync.ts` will conflict on merges; keep the edit to the call sites and record it in the sync runbook.
4. Unverified platform facts (Quarry live state, DNS in git) are revisited in changes 03 and 09 before any production step.
