# PLAN: deploy-web-to-knowme-k8s

- **Project**: open-design
- **Date**: 2026-09-14
- **OpenSpec available**: YES (`openspec/`, `schema: spec-driven`; `openspec/specs/` is empty — no prior art for any pattern below)
- **Changes to implement**: 12 (all goal-backed; 1 is external/manual, 1 is a design spike)
- **Model routing**: `model_policy` is **absent** from `project.json` → all phases default to `frontier` (warning logged to `model-routing.log`). Per-change `Model class` below is derived from the Task Complexity Scoring rules, not from a project registry; no concrete model names can be resolved.

---

## Scope decisions made at plan time

The assessment deliberately left two questions open. Plan owns them, so both are resolved here explicitly rather than silently.

### Decision 1 — Goal 5 stands: PostgreSQL is in scope, planned as real migration work.

**Operator decision, 2026-09-14.** The first draft of this plan proposed cutting goal 5 to SQLite-on-a-PVC. The adversarial judge (`gpt-5.5`) raised that as CRITICAL, and the operator chose to **keep the goal and plan Postgres for real**. The cut is overturned; changes **4, 5a, 5b, and 6** below implement it.

**This is the expensive path, and the plan says so rather than flattering the decision.** The measured coupling has not changed:

| Evidence | Value |
|---|---|
| `CREATE TABLE` statements | 49 |
| Synchronous `.prepare(` call sites | 425 |
| `.exec(` call sites | 320 |
| Files importing `better-sqlite3` / `SqliteDb` | 79 |
| Files writing filesystem state under `RUNTIME_DATA_DIR` | 116 |
| Callers of the existing `OD_DAEMON_DB` seam | **0** (throws when selected) |

Three obstacles shape how it is staged:

1. **`better-sqlite3` is synchronous; every Postgres driver is async.** This is a rewrite of 425 call sites *plus their transitive callers* — functions that are sync today become `async`, propagating outward through the daemon. It is not a driver swap.
2. **No Postgres client exists anywhere in the workspace.** Verified: zero matches for `pg`, `postgres`, `knex`, `drizzle`, `kysely`, `prisma`, `typeorm`, `slonik` across every `package.json` in `apps/`, `packages/`, `tools/`. This is a **new runtime dependency**, which `AGENTS.md` requires be declared on the PR checklist.
3. **There is no migration ledger to port.** `openDatabase()` calls one synchronous `migrate(db)` that `exec`s idempotent `CREATE TABLE IF NOT EXISTS` blocks plus ad-hoc rebuild functions (`migrateWorkspaceProjectsSingleHome`, `migratePreviewCommentsSlideKey`, …). There is **no version table and no numbered migration sequence**. A second engine cannot "replay" the existing schema; the Postgres schema must be authored, and the two engines kept honest by tests rather than by a shared ledger.

**Cost, stated plainly:** this plausibly exceeds goals 1–4 combined. It is therefore ordered **after** the site is live, so goals 1–4 ship and can be verified independently of it. It also does **not** deliver horizontal scaling on its own — 116 files write local filesystem state under `RUNTIME_DATA_DIR` that Postgres does not address — so the deployment stays single-replica until that is separately solved. Anyone reading this plan as "Postgres ⇒ multi-replica" is reading it wrong.

### Decision 2 — auth is now goal 6, and it delivers edge authentication only.

**Operator decision, 2026-09-14.** The adversarial judge flagged that the two auth changes (numbered 7–8 in the round-1 draft; **changes 10 and 11** in the list below) mapped to no goal. The operator **ratified auth as a sixth goal**, and `goals.md` has been amended accordingly. Those changes are no longer conditional — they are planned work with goal backing.

The ratification was made with this scope explicit, and it is repeated here so no downstream reader mistakes it:

> **Edge authentication only.** Only signed-in Kratos identities can reach the site, and the daemon learns *who* via a gate-minted JWT header. It does **not** deliver per-user data isolation. Assessment §7 measured zero owner columns across all 49 tables and no request-scoped identity primitive. **Every signed-in user still sees and edits everyone's projects.**

Per-user scoping remains out of scope. Note the interaction with Decision 1: per-user data would be the first genuinely *new* schema, so it is the natural thing to author Postgres-first — but that work is not in this phase.

### Non-goals (this phase)

- Per-user data isolation / multi-tenancy — the thing auth is most often assumed to provide.
- Horizontal scaling. Single replica is a deliberate constraint: Postgres alone does not lift it while 116 files write local filesystem state.
- A new login application. `kratos-selfservice-ui-node` already serves login/registration/recovery at `auth.know-me.tools/ui` (assessment §7); building a third is duplicated infrastructure.
- Migrating *existing user data* out of SQLite. The Postgres changes stand up the backend and prove parity; a data-export path for an existing install is separate work.
- **Implementing the `OD_PROJECT_STORAGE` blob seam.** `storage/project-storage.ts` is the other zero-caller abstraction, covering project *files* (local disk vs S3-compatible). It is object storage, not a database option, so goal 5 does not reach it — and it is the missing piece for multi-replica, which is itself a non-goal above.

---

## Verified runtime invariants these changes must satisfy

Checked against source at plan time, so acceptance criteria are falsifiable rather than aspirational:

1. **`OD_BIND_HOST=0.0.0.0` throws at startup** unless `OD_API_TOKEN` is set or `OD_DISABLE_API_AUTH=1` (`server.ts:3134`). A container binding `0.0.0.0` with neither **will not boot**.
2. **`/api/health` and `/api/ready` are auth-exempt** (`openProbePaths`, `server.ts:3184`). Kubernetes probes need no credentials even when token auth is on. `/api/health` returns `{ok:true,version,…}`.
3. **`OD_DATA_DIR` must be set explicitly** in the manifest; the daemon resolves `RUNTIME_DATA_DIR` from it and the *daemon data directory contract* forbids relying on a cwd fallback.

---

## CHANGE LIST (ordered)

### 1. `publish-fork-container-image`
- **Scope**: ci
- **Depends on**: NONE
- **Recommended agent**: Claude Code
- **Est. complexity**: S · **Complexity score**: Low · **Model class**: small
- **Customer value**: HIGH (nothing deploys without an image)
- **Goal**: 1
- **Details**: Publish `ghcr.io/GQAdonis/od` from this fork. Assessment §2 verified the workflow is **active** and the image name is owner-templated (`docker-image.yml:97`). **Add two `workflow_dispatch` inputs** (`release_version` as `type: string`, `publish_latest` as `type: boolean`) mirroring the existing `workflow_call` declarations, then dispatch with `release_version: 0.22.1`. See `openspec/changes/publish-fork-container-image/design.md`.
- **CORRECTION (2026-09-14)** — this supersedes the original "no workflow edit / cut a `v*.*.*` tag" instruction, whose premise was **falsified** while drafting the change proposal. The trigger is `tags: ['v*.*.*']`, but **zero** bare `vX.Y.Z` tags exist on either the fork or upstream; both use `open-design-vN.N.N` (11 and 35 respectively), which does not match that glob. Upstream publishes via `release-stable.yml:1117` → `workflow_call`, not via tag push. The "no-edit path" would have required inventing a tag shape absent from all 46 tags in the repository's history. Operator selected the workflow-input route on 2026-09-14.
- **Acceptance**: a `workflow_dispatch` run with `release_version: 0.22.1` publishes `ghcr.io/GQAdonis/od:0.22.1`; `docker pull` succeeds from a machine authenticated to GHCR; the manifest digest is recorded for `deploy-daemon-workload`; the diff touches **only** the `on:` block of `.github/workflows/docker-image.yml` (no change to publish logic, tag scheme, or build args).
- **Known non-blocking failure**: `Verify public GHCR pull access` logs out and inspects each tag **anonymously**, and a new GHCR package is **private by default** — so the first publish pushes a valid image and then turns the run **red** on that step. Expected and documented in `design.md` Risks; it is what makes change 2's `imagePullSecret` necessary.

### 2. `provision-namespace-and-pull-secret`
- **Scope**: infra
- **Depends on**: `publish-fork-container-image`
- **Recommended agent**: Claude Code
- **Est. complexity**: S · **Complexity score**: Low · **Model class**: small
- **Customer value**: MEDIUM (enabling)
- **Goal**: 2
- **Details**: Create the `open-design` namespace, a GHCR `imagePullSecret`, and the `OD_API_TOKEN` Secret (`openssl rand -hex 32`). Keep manifests in a new `deploy/k8s/` directory — the repo has **zero** Kubernetes manifests today (assessment §2), so this establishes the layout.
- **Acceptance**: `kubectl -n open-design get secret` shows both; a throwaway Pod using the pull secret pulls the private image successfully.

### 3. `deploy-daemon-workload`
- **Scope**: infra
- **Depends on**: `provision-namespace-and-pull-secret`
- **Recommended agent**: Claude Code
- **Est. complexity**: M · **Complexity score**: Medium · **Model class**: medium
- **Customer value**: HIGH
- **Goal**: 2
- **Details**: Single-replica Deployment + PVC + ClusterIP Service, **on SQLite initially** — this change gets the site live; goal 5 is delivered by changes 4, 5a, 5b, and 6, which swap the backend underneath it. Must set `OD_DATA_DIR` explicitly (invariant 3) with the PVC mounted there, and satisfy invariant 1 by mounting `OD_API_TOKEN`. Probes hit `/api/ready` and `/api/health` (invariant 2). `strategy: Recreate`, **not** RollingUpdate — a RWO PVC plus SQLite cannot have two pods writing concurrently. The PVC remains required after the Postgres cut-over: `RUNTIME_DATA_DIR` still holds artifacts, projects, skills, and tokens.
- **Acceptance**: pod reaches Ready; `kubectl exec … wget -qO- localhost:7456/api/health` returns `ok:true`; a pod delete/recreate preserves a project created before deletion (proves the PVC is the data root, not the image layer).

### 4. `provision-postgres-cluster`
- **Scope**: infra
- **Depends on**: `provision-namespace-and-pull-secret`
- **Recommended agent**: Claude Code
- **Est. complexity**: S · **Complexity score**: Low · **Model class**: small
- **Customer value**: MEDIUM (enabling; no visible capability alone)
- **Goal**: 5
- **Details**: A dedicated CloudNativePG `Cluster` for OpenDesign. Verified available cluster-wide: the `clusters.postgresql.cnpg.io` CRD is installed, the operator is running, and `onyx/onyx-pg` is a working precedent (`postgresql:17.5`, 1 instance). Use a **dedicated cluster**, not the shared `flint-core/postgres-0` StatefulSet that Kratos and flint-gate use — coupling OpenDesign's storage to the identity stack's lifecycle would make an OpenDesign migration able to disrupt login. Credentials land in a Secret consumed via `OD_PG_*`.
- **Acceptance**: `kubectl get cluster -n open-design` reports `Cluster in healthy state`; `psql` from a throwaway pod connects using the generated Secret and lists zero tables.

### 5a. `decide-postgres-backend-design` (spike — no production code)
- **Scope**: design
- **Depends on**: `provision-postgres-cluster`
- **Recommended agent**: Claude Code
- **Est. complexity**: M · **Complexity score**: High · **Model class**: frontier
- **Customer value**: LOW directly — it is what makes 5b plannable
- **Goal**: 5
- **Why this exists**: the round-2 review correctly objected that the original change 5 asserted concrete parity acceptance *while* carrying unresolved `DECISION:` markers — you cannot write falsifiable criteria for an implementation whose shape is undecided. The decisions are made here, first.
- **Decisions to close** (each with a written rationale and a rejected-alternatives note):
  1. **Async boundary**: full async rewrite propagating through the 79 files that import the handle, versus a sync-over-async shim confined to the seam. Prototype whichever is non-obvious far enough to measure.
  2. **Dual-engine lifetime**: does SQLite remain a supported backend after cut-over, or become legacy? This determines whether a two-engine contract suite is a permanent fixture or scaffolding.
  3. **Client library**: which Postgres client, given the workspace has none.
  4. **Schema authorship**: how the Postgres schema is authored and versioned, given `migrate()` has **no version table** to port.
- **Acceptance**: a design note in the change's `design.md` answering all four with rationale; **zero** production-source diffs; 5b's acceptance criteria rewritten to match the chosen shape before 5b starts.

### 5b. `implement-postgres-daemon-backend`
- **Scope**: db + api
- **Depends on**: `decide-postgres-backend-design`
- **Recommended agent**: Claude Code
- **Est. complexity**: L · **Complexity score**: High · **Model class**: frontier
- **Customer value**: LOW directly, HIGH as goal 5's substance
- **Goal**: 5
- **Details**: Implement the backend behind the **existing, already-designed seam**: `storage/daemon-db.ts` defines `DaemonDbKind = 'sqlite' | 'postgres'` and `resolveDaemonDbConfig()` reading `OD_DAEMON_DB` / `OD_PG_*`, but has **zero callers** and throws when `postgres` is selected. This change makes that seam real, following 5a's decisions — it introduces **no** new unresolved decisions.
- **Acceptance** (functional): with `OD_DAEMON_DB=postgres` the daemon boots, creates its schema, and `/api/health` returns `ok:true`; selecting `postgres` no longer throws. The parity-suite criterion is set by 5a decision 2: if SQLite stays supported, the same assertions run green against both engines; if SQLite becomes legacy, the suite runs against Postgres and the SQLite path is explicitly marked legacy instead.
- **Acceptance** (dependency gates — required because this adds the workspace's first Postgres client, and `AGENTS.md`/`CONTRIBUTING.md` govern it): `pnpm install` run and `pnpm-lock.yaml` committed; the **Nix pnpm deps hash refresh check** performed, since the constraints treat every lockfile change as requiring it; `pnpm guard` and `pnpm typecheck` both green; package-scoped `pnpm --filter @open-design/daemon test` and `build` run, compared against the baseline from carried risk 1; the new dependency declared on the PR checklist.

### 6. `cut-over-deployment-to-postgres`
- **Scope**: infra + db
- **Depends on**: `implement-postgres-daemon-backend`, `deploy-daemon-workload`
- **Scope note — what goal 5 does and does not cover**: this cut-over switches the **relational** backend (`OD_DAEMON_DB`). It deliberately does **not** touch `storage/project-storage.ts` / `OD_PROJECT_STORAGE`, the other zero-caller seam. That seam is a **blob/object-storage** abstraction (local disk vs S3-compatible stores) for project *files* — artifacts, sketches, uploads — not a database option, so it is outside "use PostgreSQL wherever multiple database options exist." It is named here explicitly so its omission is a documented decision rather than an oversight: implementing it is how the deployment would eventually become multi-replica, and it remains a **non-goal** of this phase (see Non-goals).
- **Recommended agent**: Claude Code
- **Est. complexity**: M · **Complexity score**: Medium · **Model class**: medium
- **Customer value**: HIGH (this is where goal 5 becomes observable)
- **Goal**: 5
- **Details**: Point the deployed workload at the Postgres cluster — `OD_DAEMON_DB=postgres` plus `OD_PG_*` from the Secret. The PVC **stays** (filesystem state is unaffected). Update the runbook. This is the change that lets goal 5 be verified in the running system rather than only in tests.
- **Acceptance**: the live pod at `https://design.know-me.tools` runs with `OD_DAEMON_DB=postgres`; a project created through the UI appears as a row in Postgres (`psql … SELECT count(*) FROM projects` increments); deleting the pod and letting it restart preserves it; **no `app.sqlite` is created in `OD_DATA_DIR`** — the falsifiable proof that SQLite was actually replaced, not merely bypassed.

### 7. `expose-via-shared-gateway`
- **Scope**: infra
- **Depends on**: `deploy-daemon-workload`, `dns-a-record-prerequisite`
- **Recommended agent**: Claude Code
- **Est. complexity**: M · **Complexity score**: Medium · **Model class**: medium
- **Customer value**: HIGH
- **Goal**: 3, 4
- **Details**: A **dedicated** `Certificate` for `design.know-me.tools` (issuer `letsencrypt-http01`) plus a new HTTPS listener on the existing `argocd-gateway` and an HTTPRoute to the Service — reusing IP `23.239.29.33`, no new LoadBalancer.
- **This route is explicitly TEMPORARY.** It points straight at the Service with no authentication, which is correct while goal 6 is unimplemented but becomes an **unauthenticated bypass** the moment change 10 adds a second route for the same host. Name it `open-design-direct` so change 10 can delete it by name, and record in its manifest comment that change 10 **must** remove it. Uses a separate cert **deliberately**: assessment risk 6 measured that adding a sixth `dnsNames` to `wildcard-know-me-tools-tls` forces a full reissue and HTTP-01 re-challenge across five live production hosts (`auth`, `sso`, `gate`, `api`, `rt`). The listener sets `allowedRoutes.namespaces.from: All` to match existing listeners — no `ReferenceGrant` exists in this cluster.
- **Acceptance**: gateway reports `Programmed=True`; the HTTPRoute reports `Accepted` + `ResolvedRefs`; **the five pre-existing hosts still serve a valid certificate after the change** (explicitly re-checked — this is the blast-radius guard).
- **Hard blocker**: `dns-a-record-prerequisite` is a declared dependency above, not just prose. The HTTP-01 challenge for the certificate **cannot succeed** until `design.know-me.tools` resolves to `23.239.29.33`; starting this change early produces a stuck `Certificate` and a `Programmed=False` listener.

### 8. `dns-a-record-prerequisite`
- **Scope**: external (no repo change)
- **Depends on**: NONE (can start immediately; DNS propagation is the long pole)
- **Recommended agent**: **Manual**
- **Est. complexity**: S · **Complexity score**: Low · **Model class**: small
- **Customer value**: HIGH (hard blocker)
- **Goal**: 3
- **Details**: `design.know-me.tools` currently resolves to `35.238.217.92` via an **off-cluster wildcard**; the gateway is `23.239.29.33` (assessment §4). An explicit A record is required. This lives at a registrar that cluster credentials cannot reach — hence Manual. Listed as a change so it is tracked, not assumed.
- **Acceptance**: `dig +short design.know-me.tools` returns `23.239.29.33`; the HTTP-01 challenge in change 7 (`expose-via-shared-gateway`) then succeeds.

### 9. `document-deployment-runbook`
- **Scope**: docs
- **Depends on**: `expose-via-shared-gateway`, `cut-over-deployment-to-postgres`
- **Recommended agent**: OpenCode
- **Est. complexity**: S · **Complexity score**: Low · **Model class**: small
- **Customer value**: MEDIUM
- **Goal**: 2, 3, 4
- **Details**: `deploy/k8s/README.md` covering apply order, the `Recreate`/RWO constraint, the separate-certificate rationale, and PVC backup/restore. Records why the shared cert was not edited so a future operator does not "simplify" it back.
- **Acceptance** (concrete, not "a reader could follow it"): the runbook lists (i) every manifest file and the exact `kubectl apply` order, (ii) every required input — GHCR credentials, `OD_API_TOKEN` generation, `OD_DATA_DIR` value, PVC size, (iii) the DNS prerequisite and how to verify it with `dig`, (iv) the `Recreate`/RWO constraint and why RollingUpdate corrupts SQLite, (v) the separate-certificate rationale. Verified by a **fresh-namespace dry run** that reaches: pod `Ready`, HTTPRoute `Accepted`+`ResolvedRefs`, `Certificate` `Ready=True`, and an HTTPS `200` from the endpoint.

---

### 10. `gate-authenticated-access`
- **Scope**: infra
- **Depends on**: `expose-via-shared-gateway`
- **Recommended agent**: Claude Code
- **Est. complexity**: M · **Complexity score**: Medium · **Model class**: medium
- **Customer value**: HIGH
- **Goal**: 6
- **Details**: Route `design.know-me.tools` through flint-gate instead of directly to the Service. Add a route to the **existing** `know-me-tools` site (which already declares `default_auth: kratos_session` and currently has zero routes), with a `claims_enhancement` pre-request hook injecting `X-Authenticated-Subject` and minting a JWT — the pattern proven in flint-gate's own ssr overlay. Kratos needs **no change**: `allowed_return_urls` already covers `https://*.know-me.tools`. Assessment §7 verified `strict_agent_governance` does not block this (kratos providers are provably not agent-reachable).
- **Daemon side**: set `OD_DISABLE_API_AUTH=1` — the "trusted reverse proxy" path the code itself names (`server.ts:3138`) — **and** add a NetworkPolicy restricting ingress to flint-gate only. Without that policy the daemon is fully unauthenticated to anything inside the cluster.
- **MUST delete the temporary direct route from change 7.** The `open-design-direct` HTTPRoute is removed *in the same change* that adds the flint-gate route. Leaving both in place means two routes match `design.know-me.tools`, and the direct one serves the daemon with `OD_DISABLE_API_AUTH=1` and no identity — i.e. the authentication is bypassable by whichever route the gateway picks. This deletion is the point of the change, not a cleanup detail.
- **Acceptance**: an unauthenticated request to `https://design.know-me.tools` redirects to Kratos login; after login the page loads; a direct in-cluster request to the Service from a pod outside flint-gate is **refused by the NetworkPolicy**; and `kubectl get httproute -A -o json | jq '[.items[]|select(.spec.hostnames[]?=="design.know-me.tools")]'` returns **exactly one** route, whose backend is flint-gate — the falsifiable proof that no bypass survives.

### 11. `surface-authenticated-identity`
- **Scope**: api + ui + cli
- **Depends on**: `gate-authenticated-access`
- **Recommended agent**: Claude Code
- **Est. complexity**: L · **Complexity score**: High · **Model class**: frontier
- **Customer value**: MEDIUM
- **Goal**: 6
- **Details**: Read the gate-injected identity header and surface *who is signed in* — a read-only display, explicitly **not** authorization. `AGENTS.md` UI/CLI dual-track requires all three in one PR: a daemon endpoint, the contract type in `packages/contracts`, a web UI surface, and an `od` subcommand. **`packages/contracts` must stay pure TypeScript** — the claim shape may live there, but no JWT verification library (assessment §9). Carries a `DECISION:` marker: trust the header (gate is the only ingress, enforced by the NetworkPolicy in change 10, `gate-authenticated-access`) versus verify the JWT against the gate's JWKS in the daemon.
- **Acceptance**: signed-in email appears in the web UI and in `od` output; a request with a forged header from outside the NetworkPolicy cannot reach the daemon; **no** authorization behavior changes — two users still see identical project lists (documenting the shared-workspace outcome rather than hiding it).

---

## EXECUTION ROUND ORDER

```
Round 1 (parallel):  publish-fork-container-image · dns-a-record-prerequisite
Round 2:             provision-namespace-and-pull-secret
Round 3 (parallel):  deploy-daemon-workload · provision-postgres-cluster
Round 4:             expose-via-shared-gateway         [needs Round 1 DNS]
                     ^ creates the TEMPORARY open-design-direct route
--- SITE IS LIVE on SQLite; goals 1-4 verifiable here ---
Round 5:             decide-postgres-backend-design    [spike, no prod code]
Round 6:             implement-postgres-daemon-backend [the expensive one]
Round 7:             cut-over-deployment-to-postgres   --- goal 5 observable ---
Round 8:             gate-authenticated-access
                     ^ DELETES open-design-direct; bypass closes here
Round 9:             surface-authenticated-identity    --- goal 6 complete ---
Round 10:            document-deployment-runbook
```

**The site is intentionally unauthenticated between Rounds 4 and 8.** That is a real exposure window, not an oversight: goals 1–4 are verified first, and `open-design-direct` is the route that makes that possible. If the window is unacceptable, reorder Round 8 immediately after Round 4 and accept that goal 5 then lands behind authentication.

Two ordering notes, both deliberate:

- **DNS is in Round 1** though consumed in Round 4: propagation is the long pole and it is the one item no agent can execute.
- **Goals 1–4 complete at Round 4, before the Postgres work starts.** Change 5 is the largest single item in this plan and carries unresolved design decisions; putting it after the site is live means a stall there leaves a *working deployment* rather than a half-migrated one. The runbook moves to last so it documents the final Postgres-backed state rather than being rewritten twice.

## Goal coverage check

| Goal | Covered by | Status |
|---|---|---|
| 1 — container image | 1 | Full |
| 2 — deploy to cluster | 2, 3, 9 | Full |
| 3 — serve at `design.know-me.tools` | 7, 8, 9 | Full (8 is external/manual) |
| 4 — shared gateway, no new IP | 7, 9 | Full |
| 5 — PostgreSQL | 4, 5a, 5b, 6 | Full for the **relational** backend; the `OD_PROJECT_STORAGE` blob seam is documented as out of scope |
| 6 — Kratos/flint-gate authentication | 10, 11 | Full — **edge authentication only**, see Decision 2 |

**Coverage is now complete, and every change maps to a goal.** Both gaps the adversarial review identified are closed at the source rather than in prose: goal 5 gained covering changes (4–6) after the operator overturned the proposed cut, and auth gained a goal (6, written into `goals.md`) after the operator ratified it.

Two honesty notes that survive the fix:

- **Goal 5's changes are the most expensive in the plan** and carry unresolved `DECISION:` markers. They are ordered after the site is live precisely so goals 1–4 are not held hostage to them.
- **Goal 6 is satisfied as written** — authenticate users, mint JWTs so the app knows who is signed in. It does *not* produce per-user isolation, which the goal does not claim and which remains a non-goal.

## COMMANDS TO RUN

```
/opsx:new publish-fork-container-image
/opsx:new provision-namespace-and-pull-secret
/opsx:new deploy-daemon-workload
/opsx:new provision-postgres-cluster
/opsx:new decide-postgres-backend-design
/opsx:new implement-postgres-daemon-backend
/opsx:new cut-over-deployment-to-postgres
/opsx:new expose-via-shared-gateway
/opsx:new dns-a-record-prerequisite
/opsx:new gate-authenticated-access
/opsx:new surface-authenticated-identity
/opsx:new document-deployment-runbook
```

## Carried risks

1. **Daemon test baseline is UNKNOWN** (assessment §8; terminated at 540s, reproducing the prior phase's probe failure). The infrastructure changes (1–4, 6–9) touch no daemon source, so it is dormant there — but **change 5 (`implement-postgres-daemon-backend`) and change 11 (`surface-authenticated-identity`) both edit daemon source**, and change 5 propagates an async boundary through the 79 files that import the database handle. A baseline must be captured before change 5 starts, or there is no way to attribute what the port broke.
2. **The prior phase was abandoned mid-flight** with an unimplemented plan. Its forced cloud sign-in work (`EntryShell.tsx`) overlaps **change 10** (`gate-authenticated-access`): a self-hosted deployment behind Kratos should not also present an upstream cloud sign-in gate. Verify during change 10.
3. **Single replica is a hard ceiling.** `Recreate` strategy means a brief outage on every deploy. Acceptable for this phase; revisit only alongside options (b)/(c).
4. **Adding the first Postgres client is a new runtime dependency** for a workspace that has none. `AGENTS.md` requires it on the PR checklist, and `CONTRIBUTING.md` governs dependency policy. Treat the choice of client as part of change 5's (`implement-postgres-daemon-backend`) `DECISION:` surface, not an incidental import.
5. **Change 5 introduces an async boundary** where `openDatabase()` is synchronous today. Whichever way its `DECISION:` resolves, the blast radius reaches every one of the 79 files that import the database handle. The daemon test baseline is UNKNOWN (risk 1) — capture it before starting, or there is no way to tell what the async propagation broke.

---

## Adversarial review

Round 1 ran over the **liter-llm REST gateway** — `isolation_mode: rest-gateway:http://localhost:4000/v1`, judge `gpt-5.5` against producer `claude-opus-5`, `cross_model_check: verified-distinct`. This is a genuine cross-model review, stronger than the harness-native fallback both assess rounds had to use. Findings: `review/plan/findings-round1.json`.

**Verdict: BLOCK** (1 CRITICAL, 3 WARNING, 1 SUGGESTION). All five addressed.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | CRITICAL | Plan does not cover goal 5's PostgreSQL work; it plans to keep SQLite | **Escalated to the operator, not self-resolved.** The judge's own fix named two paths ("revise the goals, or add concrete PostgreSQL work"). Choosing between them is a scope decision the planner cannot make alone — editing `goals.md` to match my plan would be fitting the spec to the work. Operator chose **keep the goal**; the Postgres changes (4–6 as numbered in the round-1 revision, now 4 / 5a / 5b / 6 after the round-2 split) implement it and Decision 1 is rewritten. |
| 2 | WARNING | Change 4 (now 7) declared the DNS blocker in prose but omitted it from `Depends on` | **Fixed.** `dns-a-record-prerequisite` added to the dependency list so a scheduler cannot start it early. |
| 3 | WARNING | Change 1 said "no workflow edit required" then instructed adding a `workflow_dispatch` path | **Fixed at the time, then SUPERSEDED on 2026-09-14.** The self-contradiction was real and was resolved by choosing the no-edit path. That resolution has since been **overturned by evidence**: drafting the change proposal established that no bare `vX.Y.Z` tag exists on either repo (0 of 46 tags; both use `open-design-vN.N.N`), so the `tags: ['v*.*.*']` trigger has never matched anything here and the "no-edit path" was not actually available. The operator selected the `workflow_dispatch`-input route. See the CORRECTION note on change 1 and `openspec/changes/publish-fork-container-image/design.md`. **The judge's original objection was sound; the fix I applied to satisfy it rested on an unverified premise.** |
| 4 | WARNING | Plan included goal-less auth changes while claiming every change maps to a goal | **Fixed at the source.** Operator ratified auth as **goal 6** and `goals.md` is amended. The changes are no longer conditional and the coverage claim is now true rather than reworded. |
| 5 | SUGGESTION | Runbook acceptance ("a reader can reproduce it") was untestable | **Fixed.** Replaced with five enumerated content requirements plus a fresh-namespace dry run asserting pod `Ready`, HTTPRoute `Accepted`, `Certificate Ready=True`, and an HTTPS 200. |

Findings 2, 3, and 5 were defects in my own drafting that no amount of context would have excused — an unstated dependency, a self-contradiction, and an unfalsifiable criterion. Finding 1 is the one that mattered most, and the right move was to surface the choice rather than decide it quietly in either direction.

### Round 2 — BLOCK (2 CRITICAL, 2 WARNING); round cap reached

Same gateway conditions, judge `gpt-5.5` vs producer `claude-opus-5`, `verified-distinct`. Findings: `review/plan/findings-round2.json`. Anti-theater gate: PASS (0.0, strict).

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | CRITICAL | Change 10 never deletes the direct HTTPRoute change 7 created, leaving two routes for the host and an unauthenticated bypass | **Fixed — a genuine security defect I introduced.** Change 7's route is now explicitly temporary and named `open-design-direct`; change 10 must delete it in the same change, with a `kubectl`-verifiable acceptance that **exactly one** route for the host exists and its backend is flint-gate. |
| 2 | CRITICAL | Goal 5 omits the `OD_PROJECT_STORAGE` / `project-storage.ts` seam the assessment named alongside `OD_DAEMON_DB` | **Partially accepted — documented rather than added.** The judge is right that silent omission was wrong. But that seam is **blob/object storage** for project files, not a database option, so it is outside goal 5's wording. Now named explicitly in change 6's scope note and in Non-goals, with the reason and its multi-replica relevance stated. |
| 3 | WARNING | Change 5 asserted concrete parity acceptance while carrying unresolved `DECISION:` markers | **Fixed.** Split into **5a** (`decide-postgres-backend-design`, a spike closing four decisions with zero production diffs) and **5b** (implementation with acceptance criteria set by 5a). You cannot write falsifiable criteria for an undecided shape. |
| 4 | WARNING | Adding the first Postgres client omitted the constraints' package-management gates | **Fixed.** 5b now requires `pnpm install`, a committed lockfile, the **Nix pnpm deps hash refresh check**, `pnpm guard`, `pnpm typecheck`, package-scoped daemon test/build against the risk-1 baseline, and PR-checklist declaration. |

### Unresolved review findings

Round 2 is the contract's cap. It returned `BLOCK`, so this plan is **accepted at the cap** rather than vetted a third time. What that leaves open:

1. **No defect is left unfixed** — all four round-2 findings were addressed above.
2. **One finding's remedy was narrowed, not applied as suggested.** Round-2 finding 2 asked for "explicit work and acceptance for `project-storage.ts`, **or** documented evidence why that seam is not covered." I took the second branch: it is object storage, not a database. Reasonable people could read goal 5's "wherever multiple database options exist" more broadly; if you do, that seam becomes additional scope.
3. **The final text was never re-vetted.** Every round-2 fix — the route-deletion requirement, the 5a/5b split, the dependency gates — post-dates the last review and carries no adversarial scrutiny.
4. **Both plan rounds ran with genuine cross-model isolation** (`rest-gateway`, `gpt-5.5` vs `claude-opus-5`), unlike the assess stage, which fell back to `harness-native` both rounds. This plan's review is the stronger of the two artifacts.

PLAN COMPLETE
