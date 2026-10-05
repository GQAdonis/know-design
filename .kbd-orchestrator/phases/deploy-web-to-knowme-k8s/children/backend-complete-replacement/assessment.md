# ASSESSMENT: deploy-web-to-knowme-k8s › backend-complete-replacement

- **Project**: open-design (fork `GQAdonis/open-design`, upstream `nexu-io/open-design`)
- **Date**: 2026-10-02
- **Codebase baseline**: pnpm monorepo (daemon + Next.js web + Electron) whose "hosted backend" is the upstream's *OpenDesign Cloud* — reached through the external `vela` CLI and `amr-api.open-design.ai` — wired into a 30k-line-class `server.ts`, ~90 web files and several hundred tests; main was merged with `upstream/main` on 2026-10-02 (`8fe58876e6`).
- **Cross-tool progress**: none for this child (created 2026-10-02, 0/0 tracked). Parent phase unchanged since 2026-09-14.
- **Method**: three read-only research passes (upstream-backend inventory, KnowMe fabric + branding, UAR + runtime-adapter + rebrand surface). **No build, test, or app run was performed.** Every claim is tagged **[V]** verified in code/cluster, or **[I]** inferred.

---

## 1. Goal-by-goal status

| # | Goal | Verdict |
|---|---|---|
| 1 | Remove upstream's backend commerce/services | **NOT MET — large, entangled, but bounded.** No payment-processor code exists in-repo; "commerce" is Vela/AMR. |
| 2 | Re-implement in the KnowMe fabric (Kratos + flint-gate / flint-forge / flint-realtime-fabric) | **NOT MET — fabric is live and covers most needs; two capabilities do not exist** (object storage, billing/entitlements). |
| 3 | Rebrand as "KnowDesign" with KnowMe branding | **NOT MET — branding source exists but is hand-synced CSS/Dart, not a token file; rename surface is ~3,200 files.** |
| 4 | Add universal-agent-runtime as an agent runtime | **NOT MET — UAR is HTTP-only; open-design runtimes are spawned CLIs. UAR is not deployed in the cluster.** |
| 5 | Zero end-user login | **PARTIAL — the upstream login gate is already narrow (AMR agent only); but "no login" collides with a hosted multi-user deployment (see §7, R1).** |

---

## 2. Goal 1 — Upstream backend inventory [V unless marked]

**Mental model.** The daemon never speaks OAuth itself. It spawns the vendor `vela` binary (`apps/daemon/src/integrations/vela-command.ts`; bundled at pack time by `tools/pack/src/vela-cli.ts`) and calls `amr-api.open-design.ai` directly. "AMR" is the cloud agent runtime that goes through Vela.

**Login is not global.** The gate is scoped to the `amr` agent: `EntryShell.tsx:700-735` (`usesOpenDesignCloud = mode==='daemon' && agentId==='amr'` → redirect to onboarding when signed out) and the pre-run balance gate under `if (isAmrSend)` (~1448+). Local CLI agents and BYOK mode do not hit it **[I — confirm by manual run]**. A `CloudSignInTip` nag shows in the account footer.

| Area | Where | Entanglement |
|---|---|---|
| Login/session | `routes/vela.ts` (1420 lines), `integrations/vela.ts` (1908), `vela-profile.ts`, contracts `amr-auth.ts`; web `AmrLoginPill`, `CloudSignInTip`, `SignOutConfirmDialog`, `AvatarMenu`; CLI `od amr` | Medium — converges in `server.ts` |
| Billing/wallet/credits/Coding Plan | `integrations/vela-billing.ts`, `vela-wallet.ts`; contracts `amrWallet.ts`, `WorkspaceBilling*`; web `runtime/amr-*`, `AmrBalanceDialog*`, `UpgradeCard*`, `GoPlanSunsetDialog`, `DeepSeekV4FlashCampaign*`; CLI `od … billing` | Medium — pre-run gates in `EntryShell`/`ProjectView` |
| AMR as agent runtime | `runtimes/defs/amr.ts`, `registry.ts`, ~15 runtime files, `agent-protocol/acp/*` | Medium — registry + shared runtime types |
| Collab / teams / workspaces | `collab/*`, `integrations/collab-cloud.ts`, `routes/collab-context.ts`, `team-resources.ts`; tables `workspace_projects`, `team_project_materializations`, `workspace_resources`; CLI `od collab`, `od workspace`, `od message-center` | **High** — touches project listing, rail, DB |
| Telemetry/diagnostics | `langfuse-bridge.ts` (1945), `langfuse-trace.ts` (3306), `observability/*`, `telemetry-relay.ts`, `diagnostic-relay.ts`; 4 `telemetry_*` tables + `amr_terminal_report_outbox`; PostHog | **High to delete, low to disable** — consent-gated no-ops when unconfigured; imported through run lifecycle |
| CMS/touchpoints/message center | `routes/vela.ts:1120-1180`, web `HoverTouchpointOverlay`, `MessageCenter` | Low–Medium |
| Vela media | `media/vela.ts`, `media/models.ts` (`vela/*` models); non-Vela providers exist | Low |
| Updater / what's-new / public metadata / marketplace / registry | `apps/desktop/.../updater`, `services/whats-new.ts`, `open-design-public-metadata.ts`, `registry/static-backend.ts` | **Cleanly separable** but point at `*.open-design.ai` |
| Packaging | `tools/pack` vela bundling, `.github/workflows/release-*.yml`, `build-mac.sh` | Medium |

**Keep (not cloud login):** `apps/daemon/src/desktop-auth.ts` (`OD_REQUIRE_DESKTOP_AUTH`) — an HMAC desktop↔daemon import token. Also user-keyed Composio/Tavily.

**Hosts the product calls today** [V]: `amr-api.open-design.ai`, `amr-link.open-design.ai`, `telemetry.open-design.ai`, `releases.open-design.ai`, `whatsnew.open-design.ai`, `repo-assets.open-design.ai`, `open-design.ai/{cloud,pricing,marketplace,schemas}`, `us.i.posthog.com`, `api.github.com/repos/nexu-io/open-design`.

**Tests**: ~114 e2e, ~360 web, ~329 daemon, 14 contracts, 21 tools/pack files mention these terms. **Most are incidental → edit, not delete.** Dedicated deletions: `e2e/ui/amr-logout-requires-relogin`, `amr-run-failure-recovery`, `cms-modal`, `workspace-team-design-system-picker`, web `runtime/amr-*`, `w116-*`, `AmrLoginPill`, `CloudSignInTip*`, `team-plan`, `collab-session`.

---

## 3. Goal 2 — KnowMe fabric capability map [V from repos + read-only `kubectl --context know-me`]

Live in namespace `flint-core` (all Running): flint-gate (4456, `gate.know-me.tools`), forge-quarry (8080, `api.know-me.tools`), FRF (8080, `rt.know-me.tools`), Kratos v26.2.0 (`auth.know-me.tools`), sso-broker, liter-llm (4000), iggy, postgres.

| Needed by KnowDesign | Fabric provides? |
|---|---|
| Identity/session | **Yes** — Kratos (password only, email schema, cookie `ory_kratos_session`, 30 d) + gate ES256 JWT minting (iss `https://gate.know-me.tools`, JWKS at `/.well-known/jwks.json`) |
| Postgres CRUD/GraphQL/RLS (replaces SQLite goal 5) | **Yes** — forge-quarry (PostgREST-compatible + `pg_graphql`; `/schema/v1/{plan,apply}` generates tenant-scoped DDL + RLS) |
| Realtime/CRDT/presence (replaces collab) | **Yes** — FRF `SyncService`, Spine, `EntityService.Watch` |
| Authorization | **Yes** — Keto via FRF `AuthzService` |
| LLM routing | **Yes** — liter-llm via gate `/v1/chat/completions` |
| Edge functions | **Yes** — Forge Kiln (WASM) |
| **File/object storage** | **No dedicated API found** [I — not exhaustively checked]; `ipfs` ns and `onyx-minio` exist |
| **Billing/entitlements** | **No.** Only gate's `usage_events` metering table. |
| **Anonymous/guest identity** | **Not built in** — see §7 R1 |

Gaps in verification: no gate route in the ConfigMap sends design-tool traffic to Forge/FRF (routes may live in gate's Postgres — not inspected); `api.`/`rt.know-me.tools` external reachability and project provisioning unconfirmed; `flint-infra` repo not inspected.

---

## 4. Goal 3 — Rebrand surface

**Branding sources** [V]: palette/typography/tokens in `know-me-system/desktop/src/index.css` (Tailwind 4 `@theme`) and `mobile/lib/core/theme/tokens.dart`; standard in `docs/knowme-ui-ux-standard.md`; logos in `/Users/gqadonis/Projects/know-me/branding/logos/`; Tauri icon set in `desktop/src-tauri/icons/`. Ember `#FF6A3D` (dark) / `#E04E28` (light); canvas `#0B0F14`; Inter / Space Grotesk / JetBrains Mono; "Flat 2.0" (no borders/dividers/layout shadows). **No `tokens.toml` / `design/tokens.json` / `DESIGN.md` exists**, contrary to what the `hybrid-design-tokens` skill describes, and CSS and Dart disagree on some muted/faint/status values — a canonical source must be chosen before applying brand.

**Rename footprint** (files; excludes node_modules/.git/dist/.tmp/.prometheus/.kbd/openspec) [V counts, I classification]: `OpenDesign` 3202 · `open-design` 3187 · `@open-design/` 1520 · `OD_*` 855 files / 431 env names · `nexu` 779 · `Open Design` 282 · `od://` 77 · `ghcr.io/…/od` 30. All 19 locale files carry 166-172 brand matches each. Plugin/design-system content (`plugins/_official`) is the bulk of `nexu` mentions and may be credit/attribution, not a rename target.

**Mechanical-safe**: package scope `@open-design/*` (27 pkgs), docs/README/locale strings, icons (`tools/pack/resources/{mac/icon.icns,win/icon.ico}`, `apps/web/public`), image names.
**Identity / compat-breaking — needs explicit decisions**: Electron `appId io.open-design.desktop` (`tools/pack/src/linux.ts:596`, `win/builder.ts:180`) — changes the Windows uninstall key and breaks update continuity; channel-distinct app names mandated by `AGENTS.md`; `od://` scheme (`apps/packaged/src/protocol.ts:3`) and `opendesign://` invite scheme; `OD_*` env contract (`OD_DATA_DIR`, `OD_PORT` are passed to subprocesses); `~/.open-design` and `.od/` data dirs (an `OD_LEGACY_DATA_DIR` migration mechanism exists); 3 `open-design:` localStorage keys; `od` CLI; sidecar stamp fields; manifest keys like `od.craft.requires` across `plugins/_official` and `skills/`.

---

## 5. Goal 4 — UAR as an agent runtime

**UAR** [V]: Rust/Axum v1.0.0 at `/Users/gqadonis/Projects/prometheus/universal-agent-runtime`, default port **1906**; REST + SSE only, **no ACP stdio CLI**. `POST /v1/chat/completions` (OpenAI-compat), `POST /v1/messages` (Anthropic-compat), native `/api/chat/completion`, `/v1/models`, `/api/agents`, A2A routes. Auth: PAT → short-lived JWT Bearer. Streams `openai`, `agui_spec` (AG-UI with `Last-Event-ID` replay) or `dual`. **Tools execute server-side**; the client sees them as stream events; approvals arrive as `uar.tool.approval_required`. **No UAR deployment exists in the `know-me` cluster** (checked read-only).

**open-design runtimes** [V]: an adapter is a `RuntimeAgentDef` data object (`runtimes/types.ts`, `registry.ts`, `runtimes/defs/*.ts`); the daemon *spawns* a CLI — there is **no daemon-side HTTP runtime adapter** (`docs/agent-adapters.md` §5.2). `docs/new-agent-runtime-acp.md` says new runtimes should be a CLI speaking ACP over stdio (`initialize`, `session/new`, `session/prompt`, `session/update` notifications).

**Cheapest correct path [I]**: a small `uar acp` stdio wrapper bridging ACP ↔ UAR `/v1/chat/completions` (or `agui_spec`), registered as a kimi-style `defs/uar.ts`. A ready bridge pattern exists in `prometheus-skill-system/tools/openai-proxy` (`serve --acp-stdio`) **but it uses `session/notification`, not open-design's `session/update` — unverified compatibility**. A zero-code prototype via `~/.open-design/agents.local.json` (`baseAgent: "kimi"`, `bin: "uar"`) is possible but **untested**. Files for first-class registration (≈15 across daemon/contracts/web/mocks/docs) are listed in the research pass; **no per-agent i18n keys are expected** [I].

---

## 6. Constraint check

- **`AGENTS.md` capability dual-track**: any replacement capability we add must ship HTTP endpoint + web UI + `od` subcommand together. A removal plan must remove all three surfaces for each capability together.
- **Daemon data-dir contract**: paths must derive from `RUNTIME_DATA_DIR`; renaming `~/.open-design`/`.od` must go through the contract, not ad-hoc.
- **Contracts purity**: `packages/contracts` must stay free of Node/browser/daemon deps — DTO removal there is a breaking-change surface for both web and daemon.
- **Boundaries**: `apps/web` must not import `apps/daemon/src`; e2e belongs in `e2e/tests`, tests never in `src/`.
- **i18n**: any key added/removed must change all 19 locales + `types.ts`.
- **Prompt composition**: two prompt implementations behind a rollout switch; read `docs/prompt-composition.md` before touching any prompt text (AMR/Vela references in prompts, if any, need both sides).
- **Release rules**: Intel-less prerelease cannot promote; app identity must stay channel-distinct. A rebrand must keep four distinct channel names ("KnowDesign", "KnowDesign Beta", "…Prerelease", "…Preview").

## 7. Risks and contradictions (surface for plan)

- **R1 — "No login" vs. hosted multi-user. (Highest.)** The parent assessment recorded that the daemon has **zero per-user identity: no table carries an owner column**. If `design.know-me.tools` is public with no login, *every visitor shares one project namespace* — anyone can read/edit/delete anyone's projects, and the daemon can spawn agents with the server's credentials. Kratos here has no anonymous method; gate's `auth: anonymous` yields a constant subject; `FLINT_ANON_KEY` is role-only. A per-device guest identity (a small service minting a short-lived ES256 JWT with a device id as `sub`) is **inferred, not documented**, and still requires the per-user data model the parent explicitly deferred. Plan must decide: (a) per-device guest identities + owner scoping (real work), (b) single-tenant/private deployment only, or (c) accept shared workspace. This changes parent goal 6 ("edge authentication only").
- **R2 — Fork divergence.** We just merged upstream (8 commits); upstream ships many commits/day. Deleting ~Vela/AMR/collab and renaming `@open-design/*` across ~1,500 files will make every future `git merge upstream/main` conflict-heavy [I]. Plan needs an explicit upstream strategy (hard fork vs. maintained patch-set vs. rename-last), and should sequence deletion before rename.
- **R3 — Scope.** Goal 2 says re-create "ALL these things". Taken literally this is a billing/entitlements service, team workspaces, message center, telemetry back-end, and an updater feed — none of which exist in the fabric. Without a user-confirmed keep/drop list, replacement scope is unbounded. Many items (billing, campaigns, Coding Plan upsell) may be *drop*, not *replace*, if there is no paying-user model.
- **R4 — UAR is not deployed**, and the proposed ACP wrapper is a new component with its own lifecycle; tool execution being server-side means the daemon's artifact-writing/permission model may not apply [I — not analysed].
- **R5 — Brand tokens have no canonical file**; CSS vs Dart drift must be resolved first. Flat 2.0 ("no borders") may conflict with open-design's existing component styling and `AGENTS.md` CSS conventions.
- **R6 — Rename vs. update continuity**: `appId`, `od://`, data dirs, localStorage keys. KnowDesign is a new product line, so breaking continuity may be acceptable — but it must be a recorded decision, not a side effect.
- **R7 — Telemetry**: deleting is wide; disabling by config is cheap. Recommend disable-first.
- **R8 — Unverified**: the claim that local-agent mode works fully without Vela; deployed-cluster gate routes; object storage; SQLite→Postgres (parent goal 5) is **independent of and prerequisite to** the Forge integration and still has no wired backend.

## 8. Build health / tests

- Build check: **UNKNOWN** — not run (`pnpm guard` passed earlier this session at HEAD before merge; `pnpm typecheck` not run).
- Test coverage of affected surface: **PARTIAL–heavy** (hundreds of files mention the cloud terms); removal will force broad test edits.

## 9. Goal progress

1. Remove upstream backend — **NOT MET**
2. Replace on KnowMe fabric — **NOT MET**
3. Rebrand KnowDesign — **NOT MET**
4. UAR runtime — **NOT MET**
5. Zero end-user login — **PARTIAL** (gate is already AMR-scoped; hosted no-login unresolved, R1)

## 10. Open questions for analyze/plan (need operator decision)

1. **Hosting model**: shared public workspace, per-device guests, or private single-tenant? (R1)
2. **Keep/drop list** for: billing/credits, team workspaces/collab, message center/CMS, telemetry, updater feed, marketplace, vela media. (R3)
3. **Upstream strategy**: hard fork, or keep mergeability? (R2)
4. **Rename depth**: display brand only, or also `@open-design/*`, `OD_*`, `appId`, `od://`, data dirs? (R6)
5. **Brand source of truth**: CSS or Dart tokens; create `tokens.toml`?
6. **UAR deployment target**: where does UAR run (cluster `uar` ns vs. local binary), and who writes the `uar acp` wrapper?

ASSESSMENT COMPLETE
