# ASSESSMENT: deploy-web-to-knowme-k8s

- **Project**: open-design
- **Date**: 2026-09-14
- **Codebase baseline**: Next.js 16 + React 18 monorepo whose daemon is a single-user, loopback-first Express process with 49 SQLite tables and no concept of a user identity.
- **Cross-tool progress**: none — phase created 2026-09-14; `progress.json` counters all zero, no other tool has touched this phase.
- **Sycophancy self-check**: score 0.018 (`sycophancy/assess-2026-09-14T10-20-33Z.json`), below the 0.3 threshold; written as-is.

---

## 1. Goal-by-goal status

| # | Goal | Verdict |
|---|---|---|
| 1 | Container image for web surface | **PARTIAL** — pipeline exists and works on this fork; no image published yet |
| 2 | Deploy to `know-me` cluster | **MISSING** |
| 3 | Serve at `design.know-me.tools` | **MISSING** — and DNS currently points off-cluster |
| 4 | Reuse existing Envoy Gateway, no new IP | **ACHIEVABLE** — pattern proven, two constraints |
| 5 | PostgreSQL where multiple DB options exist | **NOT MET** — no Postgres backend is wired; the existing abstraction has zero callers |
| + | Auth (Kratos + flint-gate) — **not in `goals.md`** | **MISSING in product, AVAILABLE in cluster** |

> **Scope provenance**: `goals.md` contains exactly five goals, none mentioning authentication. The auth section below was added at the operator's explicit instruction during the `/kbd-assess` invocation on 2026-09-14 ("consider using ory kratos… also look at using flint-gate"). It is assessed here as a **candidate scope addition**, not as an accepted goal. Analyze/plan must not treat it as equally authoritative as goals 1–5 until it is written into `goals.md`.

---

## 2. Goal 1 — Container image: PARTIAL

`deploy/Dockerfile` already builds daemon + web into one Alpine image:

- Two-stage build; `pnpm --filter @open-design/daemon build` + `--filter @open-design/web build`.
- Runtime serves the **static export** from `apps/web/out` via `express.static` (`server.ts:3678`). There is no separate nginx.
- `CMD ["node", "apps/daemon/dist/cli.js", "--no-open"]`, `EXPOSE 7456`, `OD_BIND_HOST=0.0.0.0`.
- Published by `.github/workflows/docker-image.yml` on `v*.*.*` tags or a `workflow_call` from release automation.

**Can this fork publish its own image? Yes — assessed, not deferred.**

| Question | Evidence | Answer |
|---|---|---|
| Are Actions enabled on the fork? | `gh workflow list --repo GQAdonis/open-design` → `Docker image  active  295834828` | **Yes** — active, not the common forked-repo disabled default |
| Is the image name hardcoded to upstream? | `docker-image.yml:97` → `images: ghcr.io/${{ github.repository_owner }}/od` | **No** — owner-templated; resolves to `ghcr.io/GQAdonis/od` on this fork with no edit |
| Does that package exist today? | `gh api user/packages?package_type=container` filtered for `open-design\|^od$` → empty | **No** — never built |
| Why not? | Publish is gated on `steps.mode.outputs.publish == 'true'`, reached only via a `v*.*.*` tag or release `workflow_call` | No tag has been cut on the fork |

**Verdict**: the publishing pipeline is functional on this fork and requires **no workflow change**. The image does not exist because no version tag has been pushed. Cutting a tag — or adding a `workflow_dispatch` publish path — produces `ghcr.io/GQAdonis/od`. Note the new package will default to **private**, unlike upstream's public `ghcr.io/nexu-io/od`, so the cluster will need an `imagePullSecret` unless visibility is flipped.

**Remaining gap**: there are **zero Kubernetes manifests anywhere in the repo** — `deploy/` contains compose, `azure/`, and `aws/` only.

## 3. Goal 2 — Deploy to cluster: MISSING

Cluster is reachable: `lke653426` (Linode LKE), 2 nodes, `v1.36.3`, both `Ready`. There are **no OpenDesign resources of any kind** in it, and no manifests in the repo to apply.

## 4. Goal 3 — `design.know-me.tools`: MISSING, and DNS is wrong

This is an **external prerequisite**, not an implementation detail:

```
design.know-me.tools        -> 35.238.217.92
zzz-nonexistent-probe...    -> 35.238.217.92   # wildcard, points off-cluster
gate.know-me.tools          -> 23.239.29.33    # argocd-gateway LB
auth.know-me.tools          -> 23.239.29.33
api.know-me.tools           -> 23.239.29.33
```

A random probe subdomain resolves identically to `design.know-me.tools`, which proves a wildcard `*.know-me.tools` record aimed off-cluster. Every working flint host has an **explicit A record** at the gateway IP. A specific A record for `design.know-me.tools -> 23.239.29.33` is therefore required before anything can serve.

## 5. Goal 4 — Shared gateway, no new IP: ACHIEVABLE

`argocd-gateway` (ns `argocd`, class `eg`, address `23.239.29.33`) already terminates five `*.know-me.tools` hosts. `flint-core/flint-gate` HTTPRoute is the exact pattern to copy: `parentRefs` → gateway in another namespace with `sectionName: flint-gate-https`.

Two real constraints, both of which require editing resources in the **`argocd` namespace**, outside this repo:

1. **The wildcard cert is not a wildcard.** `wildcard-know-me-tools-tls` lists exactly five `dnsNames` (`auth`, `sso`, `gate`, `api`, `rt`). `design.know-me.tools` must be added to `spec.dnsNames` (issuer `letsencrypt-http01`) or get its own Certificate.
2. **No ReferenceGrants exist.** Cross-namespace routes work only because each listener sets `allowedRoutes.namespaces.from: All`. A new listener must do the same or the route will not attach.

**Is that access actually available? Yes — verified, not assumed.** Unlike the DNS record in Goal 3, these are in reach:

```
kubectl --context know-me auth can-i patch gateway      -n argocd  -> yes
kubectl --context know-me auth can-i patch certificate  -n argocd  -> yes
kubectl --context know-me auth can-i update gateway     -n argocd  -> yes
kubectl --context know-me auth can-i create httproute   -n argocd  -> yes
kubectl --context know-me auth whoami -> system:serviceaccount:kube-system:lke-admin
```

The kubeconfig carries a cluster-admin service account, so both prerequisites are executable by this phase. **This is what separates Goal 4 from Goal 3**: Goal 3's DNS record lives at an external registrar and cannot be changed with cluster credentials; Goal 4's prerequisites can. The verdict is ACHIEVABLE on that evidence, not on pattern-similarity alone.

**Permission is not the same as safety — shared-certificate blast radius.** `auth can-i` proves only that the RBAC grant exists. It does not prove the edit is non-disruptive, and here it plausibly is not: `wildcard-know-me-tools-tls` is a **single Certificate shared by five live hosts** (`auth`, `sso`, `gate`, `api`, `rt`), issued by `letsencrypt-http01`. Adding a sixth `dnsNames` entry causes cert-manager to **reissue the whole certificate**, which means a fresh HTTP-01 challenge covering all six names and a new secret rolled into the gateway — touching production auth and API hosts to add an unrelated one. The safer shape is a **separate Certificate** for `design.know-me.tools` with its own secret, bound to its own listener, leaving the existing five-host cert untouched. Which of the two to use is a design decision for analyze/plan; this assessment records only that the shared-cert path carries a real blast radius that the permission check does not cover. See risk 6 in §10.

## 6. Goal 5 — PostgreSQL: NOT MET (no backend wired)

### Measured coupling

| Metric | Count |
|---|---|
| `CREATE TABLE` statements | 49 |
| `.prepare(` call sites | 425 |
| `.exec(` call sites | 320 |
| `.pragma(` call sites | 5 |
| Files importing `better-sqlite3` / `SqliteDb` | 79 |

Every call is **synchronous** `better-sqlite3`. A Postgres port is an async rewrite of every one of those call sites, not a driver swap. `openDatabase()` (`apps/daemon/src/db.ts:69`) returns a concrete `better-sqlite3` handle that is passed directly into subsystems (`DatabaseRegistryBackend` takes `db: SqliteDb` and calls `db.prepare(...)` inline).

### The abstraction the user asked about already exists — and is inert

- `apps/daemon/src/storage/daemon-db.ts` defines `DaemonDbKind = 'sqlite' | 'postgres'` and `resolveDaemonDbConfig()` reading `OD_DAEMON_DB` / `OD_PG_*`. Callers outside the stub file: **0**. Its own header says `OD_DAEMON_DB=postgres` "returns a stub that throws when used."
- `apps/daemon/src/storage/project-storage.ts` defines a `ProjectStorage` interface with a local + S3 implementation behind `OD_PROJECT_STORAGE`. Callers outside the stub file: **0**.

Both are Phase-5 "substrate slices" with tests (`apps/daemon/tests/storage.test.ts`) but no wiring. They pin an env-var contract; they do not provide a working backend. This is genuinely useful — the seam and naming are already decided — but it is roughly 2% of the work.

### SQLite is not the only state

`RUNTIME_DATA_DIR` (`server.ts:1346`) fans out to `ARTIFACTS_DIR`, `PROJECTS_DIR`, `USER_SKILLS_DIR`, `USER_DESIGN_SYSTEMS_DIR`, `BRANDS_DIR`, plugin caches, MCP tokens. **116 files** perform filesystem writes. Postgres addresses none of it.

**Measured consequence (fact, not recommendation)**: Postgres alone does not make the daemon replica-safe. Horizontal scaling additionally requires the filesystem state above to move to shared storage — i.e. the `ProjectStorage`/S3 stub would have to be implemented too. Which deployment shape to choose given that coupling is a design decision for analyze/plan; see risk 1 in §10.

### What does exist in-cluster

- `flint-core/postgres-0` StatefulSet (shared with Kratos, flint-gate, forge-quarry).
- `onyx/onyx-pg` CNPG cluster, healthy, with the CNPG operator installed — so a **dedicated CNPG cluster** is available as a pattern if a database is genuinely wanted.

## 7. Auth — Kratos + flint-gate (candidate scope, NOT in `goals.md`)

### What OpenDesign has today: one shared password

`apps/daemon/src/api-token-auth.ts` is the entire mechanism — a single `OD_API_TOKEN` compared with `timingSafeEqual`, accepted as `Authorization: Bearer` or HTTP Basic (`open-design` / token). `OD_DISABLE_API_AUTH=1` switches it off wholesale for a trusted reverse proxy. `server.ts:3135` refuses to bind non-loopback without one of the two.

Searching the daemon for a per-user identity returns **nothing**: no `userId`/`principal` columns in `db.ts`, and no `X-Forwarded-User` / `X-Authenticated-*` / `X-Remote-User` handling anywhere. **The daemon cannot express "who is logged in."**

**Was the existing namespace / data-root mechanism evaluated as a substitute?** Yes, and it was ruled out. `AGENTS.md` describes a namespace-scoped data root, which is architecturally adjacent to per-tenant scoping, so it is a fair candidate. But it does not exist inside the daemon runtime:

- `apps/daemon/src/daemon-paths.ts` — no `namespace` occurrences.
- `apps/daemon/src/server.ts` — no namespace-based data-root resolution; `RUNTIME_DATA_DIR` derives from `OD_DATA_DIR` only.
- `apps/daemon/src/cli.ts` — no `OD_NAMESPACE` or `--namespace` flag.

Namespacing is a **`tools-dev` / packaged-launcher orchestration** concept that picks one `OD_DATA_DIR` *before* the daemon starts. It is **process-scoped, not request-scoped**: one daemon process serves exactly one data root for its lifetime. Using it for multi-tenancy would mean one daemon process per user, which is a fundamentally different deployment topology (and multiplies the single-replica/PVC constraint by the user count) rather than a per-user primitive inside one server. It is not a building block toward request-scoped identity.

### What the cluster has: a complete, running identity stack

- **Kratos v26.2.0** at `auth.know-me.tools`, flows for login / registration / recovery / verification / settings, identity schema `{email, name}`, session cookie domain `know-me.tools`, `SameSite=Lax`, 720h lifespan.
- `allowed_return_urls` **already includes `https://*.know-me.tools`** — so `design.know-me.tools` is a legal post-login redirect **with no Kratos config change**.
- **flint-gate** (2 replicas) whose live ConfigMap already declares a site `know-me-tools` matching `*.know-me.tools` with `default_auth: kratos_session`. That site has **no routes and no `default_upstream`**, so it currently authenticates nothing. Adding OpenDesign is a *route addition to an existing site*.
- Gate mints **ES256** JWTs, issuer `https://gate.know-me.tools`, and publishes `/.well-known/jwks.json`.

### The JWT the user described is a config change, not a build

`k8s/overlays/ssr/configmap.yaml` in the flint-gate repo is a working reference: a `claims_enhancement` pre-request hook with `inject_headers: X-Authenticated-Subject: "{{ identity.id }}"` plus `mint_jwt.enabled: true` and `additional_claims` carrying `aud`, `tenant_id`, `role`, `flint.user_id`.

**Governance will not block this.** `strict_agent_governance: true` hard-fails agent-reachable routes lacking an `authorize` hook, but `agent_reachable` is computed as `Jwt | Mcp` only (`config/types.rs:257`), and the test `lint_ignores_non_agent_reachable_providers` asserts `kratos` is exempt by name.

### The proposed "login application" is largely redundant

`kratos-selfservice-ui-node` **already runs** as `kratos-ui`, routed at `auth.know-me.tools/ui`, serving login / registration / recovery / settings. `sso-broker` exists solely to bridge the `*.prometheusags.ai` eTLD (OSS Kratos cannot span two eTLDs) — `design.know-me.tools` is first-party and does not need it. Building a third login app in this repo would duplicate shipped, running infrastructure.

### The real gap is consumption, not login

A gate-minted JWT arriving as a header lands in a daemon with **no per-user data model**. All 49 tables are unscoped — `projects`, `conversations`, `messages`, `deployments`, `routines` have no owner column. "Multi-user" means adding ownership and an authorization check to every query. **That is a larger change than the Postgres port**, and the two compound: per-user scoping is exactly the kind of change one would not want to make twice across two different database engines.

## 8. Build health: PASS (partial)

| Check | Result |
|---|---|
| `pnpm guard` | **PASS** (exit 0) |
| `pnpm typecheck` | **PASS** (exit 0) |
| `pnpm --filter @open-design/daemon test` | **UNKNOWN** — terminated at 540s |

The test timeout reproduces the prior phase's recorded probe failure ("suite exceeds 2min probe"), so it is a known property of the suite, not a new regression. A baseline must be captured before editing daemon source.

## 9. Constraint compliance

No current violations. Two rules will bind the work:

- **UI/CLI dual-track** (`AGENTS.md`): every user-facing capability must ship a web UI surface *and* an `od` subcommand in the same PR. An auth capability must land both.
- **`packages/contracts` purity**: no Node/browser/daemon deps. JWT verification libraries must not be added there, even though the claim shape is a shared contract.
- Single-replica + PVC conflicts with nothing in `AGENTS.md`, but the **daemon data directory contract** requires all data paths derive from `RUNTIME_DATA_DIR` via `OD_DATA_DIR` — the k8s manifest must set `OD_DATA_DIR` explicitly rather than rely on a cwd fallback.

## 10. Top risks and open questions for analyze/plan

1. **Goal 5 is mis-scoped.** A real Postgres port (49 tables, 425 prepared statements, sync→async across 79 files) plausibly exceeds goals 1–4 combined, and does **not** deliver multi-replica without also solving 116 files of filesystem state. Three honest readings must be resolved before planning: (a) keep SQLite on a PVC and drop the goal, (b) wire only *new* multi-user tables to Postgres alongside SQLite, (c) full port. *Non-binding assessor note, offered as input and not as a determination — analyze/plan owns this choice:* the measured coupling makes (a) the cheapest path for this phase with (b) as a plausible auth follow-on. Nothing in this assessment forecloses (b) or (c).
2. **Authenticating at the edge does not make the app multi-user.** If gate auth ships while the daemon stays single-user, the result is a *shared workspace*: every signed-in user sees and edits everyone's projects. This must be explicitly accepted as the phase outcome or funded as real data-model work.
3. **DNS is an external prerequisite** — `design.know-me.tools` must get an A record at `23.239.29.33`, plus a cert `dnsNames` addition. Neither is a repo change.
4. **The prior phase was abandoned mid-flight** with `assessment.md`, `analysis.md`, and `plan.md` written and zero implementation. Its unfinished work (notably removing the forced cloud sign-in in `EntryShell.tsx`) directly overlaps this phase's auth scope — a self-hosted deployment behind Kratos should not also present an upstream cloud sign-in gate.
5. **Image publishing is a decision, not an unknown** (see §2 for the evidence). The fork's pipeline works and needs no workflow edit; what remains is a choice: cut a `v*.*.*` tag to publish `ghcr.io/GQAdonis/od` (carries this fork's local changes; defaults to a **private** package, so an `imagePullSecret` is needed), or deploy upstream `ghcr.io/nexu-io/od` (public, but will **not** contain this fork's changes — including any auth work from this phase). Measured fact: upstream images do not contain this fork's commits, including any product changes this phase produces. Analyze/plan draws the viability conclusion from that.
6. **Editing the shared certificate has a blast radius the permission check does not cover** (see §5). `wildcard-know-me-tools-tls` is one Certificate serving five live hosts; adding a sixth `dnsNames` triggers a full cert-manager reissue and HTTP-01 re-challenge across `auth`, `sso`, `gate`, `api`, and `rt` — production identity and API endpoints — to onboard an unrelated host. A separate Certificate for `design.know-me.tools` avoids touching them. Analyze/plan must pick one; the permission grant (`auth can-i` → yes) does not make the shared-cert edit safe.

---

## 11. Adversarial review

Round 1 ran as a **harness-native fresh-context reviewer** (`isolation_mode: harness-native`), because the liter-llm gateway returned HTTP 429 (`usage_limit_reached`) and `dispatch-judge.sh` exited 3 — the contract's mandated fallback. Judge `claude-sonnet-5` vs producer `claude-opus-5`: `cross_model_check: verified-distinct`. Findings: `review/assess/findings.json`.

**Verdict: BLOCK** (2 CRITICAL, 3 WARNING). All five were addressed; two had their premise contradicted by the follow-up investigation, and the findings file records each disposition.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | CRITICAL | Image provenance deferred rather than assessed | **Fixed.** Premise *contradicted*: the judge supposed forked Actions were disabled and the image hardcoded to upstream. Both false — Actions are active; the image is owner-templated. §2 now carries a verdict. |
| 2 | CRITICAL | Goal 4 "ACHIEVABLE" without confirming `argocd` write access | **Fixed; verdict upheld.** The gap was real — access was never established. `auth can-i` now shows cluster-admin, so the verdict stands on evidence rather than assumption. |
| 3 | WARNING | Auth promoted to a goal with no cited source | **Fixed.** Correct: `goals.md` has five goals, none about auth. Relabelled as an operator-added candidate scope with its provenance stated. |
| 4 | WARNING | "Single-replica is the honest shape" is a recommendation stated as a finding | **Fixed.** §6 reduced to the measured coupling fact; the judgment lives only in §10 risk 1. |
| 5 | WARNING | Namespace/data-root never evaluated as an existing per-user primitive | **Fixed.** Evaluated and ruled out with evidence; §7 now records that it is process-scoped orchestration, not a request-scoped primitive. |

Two findings were accepted as *process* defects even where the factual hypothesis was wrong: in both cases the assessment had asserted or deferred something it could have checked, which is the defect the reviewer correctly identified.

### Round 2 — BLOCK (2 CRITICAL, 3 WARNING); round cap reached

Re-vetted after the round-1 revisions, same fallback conditions (gateway still HTTP 429), judge `claude-sonnet-5` vs producer `claude-opus-5`. Findings: `review/assess/findings-round2.json`.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | CRITICAL | §6 defers the Postgres shape to analyze/plan while §10 risk 1 decides it (`Recommendation: (a)`) | **Fixed.** A real self-contradiction I introduced *while* fixing round-1 finding 4 — moving the judgment to §10 did not make it non-binding. Now explicitly labelled non-binding, with (b)/(c) stated as open. |
| 2 | CRITICAL | Goal 5's verdict cell reads "not achievable at reasonable cost" — a cost judgment, not a verdict category | **Fixed.** Restated as a measured fact ("no Postgres backend is wired; the existing abstraction has zero callers"). |
| 3 | WARNING | `auth can-i` proves RBAC permission, not that editing the five-host shared cert is safe | **Fixed — materially new risk the assessment had missed.** Blast-radius analysis added to §5 and risk 6 to §10. |
| 4 | WARNING | §10 risk 5's "unlikely to be viable past the first deployment" is a prediction, not a fact | **Fixed.** Restated as fact; the conclusion is left to analyze/plan. |
| 5 | WARNING | The §11 disposition table asserts what the round-1 judge "supposed" without that file being verifiable in the packet | **Partially accepted; suggested fix rejected** — see below. |

### Unresolved review findings

The contract caps adversarial vetting at two rounds. Round 2 returned `BLOCK`, so this artifact is **accepted at the cap** rather than vetted a third time. What that leaves open:

1. **No defect is left unfixed.** All five round-2 findings were addressed in the text above.
2. **One suggested remedy was rejected.** Round-2 finding 5 correctly observed that `build-review-packet.sh` does not embed `findings.json` into the packet, so a reviewer cannot verify this section's characterization of round 1. Its proposed fix was to *soften* the claim. I declined: the claim is verifiably true, and weakening accurate text to accommodate a packet-construction gap would make the record less accurate, not more. Fixed instead by making it checkable — round 1's finding 1 is recorded verbatim at `review/assess/findings-round1.json` as: *"Image provenance deferred as an open question instead of assessed."* The contradicting evidence (`gh workflow list` → `Docker image active`; `docker-image.yml:97` → `ghcr.io/${{ github.repository_owner }}/od`) is reproducible from §2. **The underlying tooling gap is real and worth fixing in the packet builder, independently of this phase.**
3. **The final text was never re-vetted.** Every round-2 fix above — including the new §5 blast-radius analysis and risk 6 — post-dates the last review. They carry no adversarial scrutiny.
4. **Both rounds ran on the weaker guarantee.** `isolation_mode: harness-native`, not `rest-gateway`, because liter-llm returned HTTP 429 (`usage_limit_reached`) on both dispatches. Judge and producer were distinct models (`verified-distinct`), but neither round had gateway-enforced isolation.
