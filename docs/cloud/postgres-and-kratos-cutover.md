# KnowDesign: local-first core, Kratos-backed cloud, one database abstraction

Status: draft for approval (revision 2) · Applies to: the KnowDesign build (`OD_BUILD_PROFILE=knowdesign`) and https://design.know-me.tools

## 1. Principles

1. **Local is the product.** Running KnowDesign on your machine needs no account, no login, no network call at boot, and works offline for core design work. This is verified today at the daemon level (§3).
2. **Cloud is an opt-in superset.** The hosted service adds sign-in (Ory Kratos), shared Postgres, sync and collaboration. A local user who creates or signs in to an account gains those features without reinstalling or changing mode.
3. **One codebase, two storage engines.** SQLite locally, Postgres in the cloud, behind one async database interface. The effort is not a constraint; correctness and a clean seam are.
4. **Stock behavior is preserved.** With the new switches unset, the app behaves as it does today, so the fork stays mergeable from upstream.

## 2. The immediate bug (Phase 0)

Browser writes to `/api/*` on the hosted site return `403 Cross-origin requests are not allowed` because the daemon's origin guard (`apps/daemon/src/server.ts` ~3395-3475, `origin-validation.ts`) only trusts loopback origins unless `OD_ALLOWED_ORIGINS` lists the public origin. The UI reports it as "Couldn't save changes. The local daemon may be offline." Fix: `OD_ALLOWED_ORIGINS=https://design.know-me.tools` on the Deployment (cluster repo PR #9). Acceptance: saving a provider setting and creating a project succeed in a browser. The same-origin guards used by `/api/daemon/*` (`http/local-daemon-request.ts`) are stricter and must be checked too.

## 3. Verified facts

Local operation (empirical, daemon only): with `OD_BUILD_PROFILE=knowdesign`, no `OD_API_TOKEN`, loopback bind and an isolated data dir, `/api/health`, project create and list, and `PUT /api/app-config` all succeeded without credentials, and no non-loopback connection was observed. The web UI was **not** served in that check, so "no login wall in the UI" rests on code reading (`EntryShell.tsx`, `App.tsx`, `collab/build-profile.ts`) and still needs a browser pass.

Already neutral under the knowdesign profile: analytics, Langfuse, diagnostic relay, attribution, the AMR agent and `od amr`, plugin publish/login, Vela mirror, public marketplace/GitHub/Discord metadata, billing gates. User-initiated network features (BYOK providers, Tavily, Composio, plugin installs, favicon prefetch) fail gracefully offline. Not yet traced: `telemetry-relay.ts` and `integrations/vela-wallet.ts` default hosts; default app-config telemetry flags read `true` even though sinks are inert (should default off under the profile).

Blocks local use only in the default profile: `AMR_AUTH_REQUIRED` paths (`server.ts` ~13484, ~14268, `collab/request-workspace-context.ts`, `routes/collab-context.ts`). Collab and workspace routes need a verified Vela identity and are cloud-only by nature.

Daemon persistence: single `better-sqlite3` handle; ~52 tables; ~500 `prepare` and ~57 `transaction` calls in ~57 files; ~1,085 synchronous `.get` calls; inline DDL with ~92 `ALTER` and ~32 `PRAGMA` introspection migrations and no version table. Stubs exist, unwired: `storage/daemon-db.ts` (`OD_DAEMON_DB`) and `storage/project-storage.ts`. State outside SQLite (project directories, artifacts, app-config, MCP tokens, connector credentials, memory) lives under `OD_DATA_DIR` and is not keyed per user.

Platform (`flint-core`, live): Postgres (StatefulSet, 50Gi, `flint-forge-postgres18`), Kratos v26.2.0 (traits `email`, `name`; cookie `ory_kratos_session` on domain `know-me.tools`; `return_to` allowed for `*.know-me.tools`; login UI `auth.know-me.tools`), flint-gate (reverse proxy and sole JWT issuer, `iss https://gate.know-me.tools`, not an ext-authz server), forge-quarry (PostgREST-style + GraphQL, JWT-verified, audience `flint-core`), frf (realtime over Iggy, audience `frf-gateway`). No NetworkPolicies in `flint-core` or `knowdesign`. Backups: Velero `weekly-full` only.

Unverified, to be settled by spikes (§12): running Postgres version and role/database inventory; gate signing algorithm (docs RS256, live config ES256); gate behavior for unauthenticated browsers; whether the pinned Quarry image includes the provisioning API (very likely, unconfirmed).

## 4. Deployment mode and identity (local vs cloud)

Today there is no explicit mode: behavior is inferred from `OD_BUILD_PROFILE` (brand gating only), `OD_BIND_HOST` plus `OD_API_TOKEN`, and the `OD_DISABLE_API_AUTH` escape hatch. That conflates "reachable" with "authenticated" and names no principal.

Add an explicit `OD_DEPLOYMENT_MODE=local|cloud`, default `local`, resolved once at startup beside the data root, independent of the build profile.

| | `local` (default) | `cloud` |
|---|---|---|
| Bind | loopback only; a non-loopback host hard-fails | behind the ingress; non-loopback allowed |
| Auth | none required | required on every `/api/*` request |
| Identity | optional, provider-pluggable (`none` until the user links an account) | Kratos session via the identity provider; hard-fails without one |
| Boot network calls | none | gate/Kratos/Postgres only |
| Database | SQLite | Postgres |
| Team/sync/collab | unavailable until an account is linked | available |

`/api/health` reports `mode` and `identity` (`null` or `{provider, id, ...}`) so the web app can render the right surface without guessing.

### Account linking (the opt-in)

A local user chooses "Create account / Sign in" in the app. The flow opens the Kratos UI (`auth.know-me.tools`) in the system browser with a `return_to` the app can complete, ends with the daemon holding an account credential (stored in the OS keychain or the encrypted per-user store, never in plain JSON), and flips `identityProvider` from `none` to `kratos` **without changing `OD_DEPLOYMENT_MODE`**. Linked, the local instance can sync to the cloud workspace and use collaboration; unlinking returns to pure local use and leaves local data intact. Sign-up is **open** (Kratos self-service registration on the existing UI).

Rules that protect local-first: local data is never uploaded unless the user links an account and opts a project into sync; losing network or signing out never blocks opening local projects; no feature available offline today may start requiring an account.

### Cloud authentication path

Flow: browser → Envoy `design-https` → HTTPRoute to `flint-gate:4456` → gate route for `design.know-me.tools` with `kratos_session` → daemon. Gate validates the Kratos cookie and mints an upstream JWT (`sub`, `email`, `name`, plus `tenant_id`). The daemon **verifies the JWT against the gate JWKS** (issuer, audience, expiry, algorithm from the live key); it never trusts a bare `X-User-Id` header, because without NetworkPolicies any pod could forge one. NetworkPolicies restrict `knowdesign:7456` to the gate and probes. `OD_API_TOKEN` stays only as a service credential for CLI and agents; loopback peers (in-pod agents) map to a service principal, never a user. Unauthenticated document navigations redirect to `https://auth.know-me.tools/ui/login?return_to=…`; whether gate or the daemon owns that redirect is decided in Spike 2. Fallback if gate does not fit: the daemon calls `kratos-public/sessions/whoami` with the forwarded cookie and caches briefly.

## 5. Database abstraction

### Recommendation

A thin async `DaemonDb` interface in `apps/daemon/src/storage/` (`query`, `get`, `all`, `run`, `tx`) with two drivers: better-sqlite3 (wrapped in promises) and `pg`. **One SQL dialect: a Postgres-compatible subset**, so statements are written once. No ORM for the existing ~500 raw statements.

Why not an ORM: Drizzle needs separate `sqlite-core` and `pg-core` schema definitions and per-dialect migrations; Kysely has both dialects but still needs per-dialect DDL for JSON, row ordering and types; either means rewriting every statement for little gain over translating the ~60 genuinely non-portable sites. Kysely remains acceptable later for new code.

Why direct `pg` and not Quarry for the daemon's own tables: PostgREST has no multi-statement transactions (writes needing atomicity require an RPC function) and the daemon has 57 transaction blocks plus read-modify-write patterns; an HTTP hop with per-request JWTs adds latency for no benefit. `pg` with `SET LOCAL` role/claims per transaction still gets RLS. Quarry is the right route for tenant-facing, browser-direct reads (§7).

PGlite (Postgres in WASM, file persistence, single connection) as the *local* engine would give an identical dialect everywhere and delete the translation layer, but it is single-connection, slower for many small queries, adds a WASM asset to Electron packaging, and has a major-version data-upgrade path for user data I could not verify. Treat it as a third driver behind the same interface: spike and benchmark after the interface lands; it is a low-regret later swap.

### SQLite-only constructs found (decide the translation burden)

`INSERT OR IGNORE` ×4, `INSERT OR REPLACE` ×2 (→ `ON CONFLICT`, 18 already exist); `ifnull` ×5 (→ `COALESCE`); `json_extract` ×19, `json_each` ×6, `json_set` ×3, `json_object` ×2 (JSON stored as TEXT; rewrite to `jsonb` operators in cloud, via small dialect helpers); `BLOB` ×13 (→ `bytea`); `rowid` tiebreakers ×~20 (→ explicit `seq` column; a real schema change); ~92 `ALTER`/~32 `PRAGMA`/11 `sqlite_master` ad hoc migrations (→ versioned runner). Not used: AUTOINCREMENT, RETURNING, FTS5, GROUP_CONCAT, strftime. Silent gotchas: SQLite is loosely typed while Postgres rejects text in integer columns; `pg` returns `bigint` as strings; booleans are integers locally. A row-mapper layer normalizes these.

### Migrations

Replace PRAGMA/introspection migrations with numbered, versioned migrations and a `schema_migrations` table: a SQLite baseline snapshot of the current schema, then per-dialect files where DDL differs. In cloud the runner executes as an init step before traffic, under an advisory lock so replicas do not race. CI runs the full daemon suite against both engines (real Postgres 18 container, no mocked SQL) plus a schema-parity check.

### Sequencing

1. `DaemonDb` interface, SQLite driver, migration runner (behavior-neutral).
2. Port call sites to `await`, smallest stores first, `db.ts` last; full suite per slice. Pay particular attention to `transaction()` closures that currently rely on synchronous atomicity.
3. Normalize SQL to the common subset (`ON CONFLICT`, `COALESCE`, `seq` columns, JSON helpers).
4. `pg` driver, Postgres migration set, dual-engine CI.
5. Ownership columns, RLS, per-request claims (§6).
6. Optional PGlite spike.

## 6. Cloud data model and ownership

- Dedicated database `knowdesign` and LOGIN role `knowdesign_app` on the shared Postgres (not the `flint` superuser, not another service's database), with connection and statement-timeout limits so a runaway query cannot starve Kratos or the gate. The daemon's schema is owned by its **own reviewed migrations** run as that role. Credentials live in Secret `knowdesign-db`.
- User-owned tables gain `owner_user_id` (Kratos identity UUID) and `tenant_id`; queries scope by it, enforced by RLS using per-transaction `SET LOCAL` claims, so a missed `WHERE` cannot leak rows. In local mode the owner is a fixed local principal and RLS is off.
- Secrets now in shared JSON files (provider keys, MCP tokens, connector credentials) move into encrypted per-user rows in cloud mode; locally they keep their current stores.
- Existing deployment data: a one-shot, idempotent `od db import-sqlite` copies `app.sqlite` into Postgres with per-table row-count verification; the SQLite file is kept untouched for one release as the rollback.

## 7. Quarry (flint-forge) schema provisioning

Decision: enable it, as directed. Findings that shape its role:

- It is off because `FLINT_PROVISION_NAMESPACES` and `PROVISIONER_DATABASE_URL` are unset on the `forge-quarry` Deployment, so `/schema/v1/*` returns 503. Live manifest: cluster repo `namespaces/flint-core/manifests.yaml` (Argo auto-sync with selfHeal; edit git, not the cluster); mirror in `flint-core-infra/k8s/base/forge-quarry/deployment.yaml`.
- Enabling is: add `FLINT_PROVISION_NAMESPACES=knowdesign` and `PROVISIONER_DATABASE_URL` (from a new key `provisioner-database-url` in Secret `flint-forge`), plus a one-time operator setup: `CREATE SCHEMA knowdesign`, grant `USAGE, CREATE` on it to `flint_provisioner`, `USAGE` to `authenticated`, and create a `flint_provisioner_login` role that is a member of `flint_provisioner`. Plans never create schemas. The two Quarry replicas roll with no downtime.
- Flow: `POST /schema/v1/plan` → review `ddl` → `POST /schema/v1/apply` with the `planHash` (one transaction, replay-safe); the gateway must restart for per-table REST routes to mount. It needs a `service_role` JWT (issuer `https://gate.know-me.tools`, audience `flint-core`), minted by the gate, not by running the standalone key script, which would create a second keypair.
- **Limit:** the provisioning grammar supports `text, integer, bigint, numeric, boolean, date, timestamptz, uuid, jsonb`, primary keys, btree/unique indexes and tenant-scoped RLS. It does **not** support foreign keys, `bytea`, triggers, views, composite keys or partial/expression indexes, and is additive only. It therefore cannot create the daemon's own ~52 tables. Its role for KnowDesign is the **tenant-facing surface**: tables the browser or other services read through Quarry REST/GraphQL (for example shared workspaces, activity feeds, published artifacts), kept in the allowlisted `knowdesign` schema. The daemon's core schema lives in a separate schema it owns through its own migrations, outside the provisioner allowlist.
- Risk: the `service_role` key is long-lived and bypasses RLS; keep the allowlist to the single dedicated schema, never allowlist a schema holding live data, and rotate the provisioning token. Creating roles and schemas on the shared production Postgres, the Secret and the manifest change each need explicit approval at execution time; this document does not authorize them.

## 8. Realtime

frf (Connect/gRPC-web over Iggy, gate JWT with audience `frf-gateway`, which the gate route must mint) is the transport for live project and chat updates and presence in cloud mode. Local mode keeps the existing in-process event paths. Scope after Phases 1-3.

## 9. Team model and `AGENTS.md`

`apps/daemon/AGENTS.md` (line 28) says team resource storage is Vela-owned and forbids a second implementation. **Recommendation: amend it, neither keep nor replace.** Keeping it forbids the Kratos/flint cloud; replacing it discards a useful guardrail against a bespoke drive. Introduce a `TeamResourceProvider` interface in `src/collab/` (it does not exist yet) with Vela and flint providers, and amend the rule to:

> Team resource storage is owned by an external provider behind the daemon's `TeamResourceProvider` interface (`src/collab/`). The supported providers are Vela (adapters under `src/collab/vela-cli-*`, which must invoke Vela through `src/integrations/vela-command.ts`) and flint (the KnowDesign cloud, authenticated via Kratos). Provider selection follows `OD_DEPLOYMENT_MODE` and the signed-in identity. In local mode with no account, no provider is required and team and sync features are unavailable. Do not add Resource Hub tokens, ad hoc direct HTTP clients, or a second content-addressed drive implementation outside a provider adapter. `od resource` remains a thin compatibility entry point that delegates to the active provider.

Land the interface and the AGENTS.md amendment together in one change, before any flint provider code. This document does not edit `AGENTS.md`.

## 10. State that still needs a disk

Project directories, artifacts, media and the agent working directory stay on local disk in both modes, so the cloud pod stays single-replica (Recreate, retained PVC) until the `ProjectStorage` S3 implementation is wired. Add `knowdesign` to an explicit Velero schedule rather than relying on the weekly all-namespaces job.

## 11. Fork hygiene

The persistence port touches ~60 upstream files. Land the interface and migration runner as small behavior-neutral changes first; keep SQLite the default; keep identity and mode code in new modules with minimal hooks; record conflict hot spots in the upstream sync runbook.

## 12. Sequence, spikes and gates

| Step | Work | Gate |
|---|---|---|
| 0 | `OD_ALLOWED_ORIGINS` (cluster PR #9) | Browser writes succeed |
| L0 | Local-only guardrails: browser pass of the web UI against a local knowdesign daemon with no token; default telemetry flags off under the profile; trace `telemetry-relay` and `vela-wallet` hosts; add a regression e2e "local, no token, create project" | No login wall, no boot network call |
| S1 | Postgres version, database/role inventory, throwaway-pod connection, backup status; confirm Quarry image has `/schema/v1/status` | Matches §3 |
| S2 | Gate route on a test hostname: cookie validation, unauthenticated behavior, minted JWT shape and algorithm | Gate path confirmed or `whoami` fallback chosen |
| 1 | `DaemonDb`, migration runner, port, Postgres driver, dual-engine CI (§5) | Both engines pass the suite |
| 2 | `OD_DEPLOYMENT_MODE`, JWT middleware, `users`, NetworkPolicies, ownership and RLS | Two users cannot see each other's data |
| 3 | Enable Quarry provisioning (§7) and the tenant-facing schema | `/schema/v1/status` enabled; plan/apply round trip |
| 4 | Account linking in the local app (§4) | Local user links and unlinks without data loss |
| 5 | `TeamResourceProvider` plus AGENTS.md amendment; flint provider | Vela path unchanged |
| 6 | Realtime via frf; project storage to object storage | — |

## 13. Risks

- Sync-to-async refactor: ordering and race regressions, especially inside `transaction()` closures. Mitigation: dual-engine suite, small slices.
- `rowid` tiebreak and JSON-as-TEXT behavior diverging in Postgres. Mitigation: explicit `seq`, JSON helpers, parity tests.
- Migration drift between dialects. Mitigation: one baseline, schema-parity check in CI.
- Forged identity if the daemon trusts headers or is reachable without the gate. Mitigation: JWT verification and NetworkPolicies.
- Shared-instance blast radius: runaway queries or a leaked `service_role` key. Mitigation: dedicated role with limits, single-schema allowlist, rotation.
- Local-first erosion: a cloud dependency creeping into boot or core flows. Mitigation: the L0 regression test and the rules in §4.
- Upstream drift (§11).
