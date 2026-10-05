# PLAN: deploy-web-to-knowme-k8s › commerce-removal

- **Date**: 2026-10-03 · **Inherited from** `../backend-complete-replacement/plan.md` as amended by `plan-amendments.md` (spike result, D-013/D-014). Change text below is copied from the umbrella and is authoritative here.
- **Changes**: 6
- **Round order**: Round 1: capture-test-baseline · Round 2: build-profile-seam-and-permission-decoupling · Round 3 (parallel): stub-amr-and-billing, drop-touchpoints-marketplace-vela-media, disable-telemetry-and-upstream-endpoints, remove-vela-collab-hardcoding
- **Decisions in force**: D-001…D-014 in `../backend-complete-replacement/decision-log.md`.

## CHANGE LIST (ordered)

### 0. `capture-test-baseline`
- **Scope**: repo tooling · **Depends on**: NONE · **Agent**: Claude Code · **Est.**: S · **Score**: Low · **Model class**: small · **Value**: HIGH (nothing else can be attributed without it)
- **Details**: Record `pnpm guard`, `pnpm typecheck`, and the daemon and web package test results on clean `main` (rebuild workspace packages first, per the spike). Daemon tests hit a 540s timeout in the parent phase; run in the background and record failures **by name** so later changes diff against them.
- **Acceptance**: a committed `baseline.md` in this phase listing command, duration, pass/fail counts, and the exact names of pre-existing failures.

### 1. `build-profile-seam-and-permission-decoupling`
- **Scope**: daemon + web + contracts · **Depends on**: 0 (GO) · **Agent**: Claude Code · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 1
- **library**: cand-001, cand-009
- **Details**: Introduce `OD_BUILD_PROFILE=knowdesign` and the stub-module-swap mechanism (aliases + conditional route registration). **First**, decouple collab authority from billing: stub `WorkspaceLifecycleState` to `active` and supply billing/seat fields in the context mapper so removing billing cannot write-lock workspaces (`buildWorkspacePermissions`, `collab.ts:577`).
- **Acceptance**: with the profile on, `buildWorkspacePermissions` returns write permission for every *billing-derived* lifecycle state (`billing_past_due`, `locked`) while `deleting` and `deleted` stay denied (unit-tested; amended by D-015); profile off = byte-identical behaviour to `main` (existing suites unchanged); `pnpm guard`, `pnpm typecheck`, and the daemon + web package tests pass versus a recorded baseline (capture the baseline before starting — the parent flagged it as UNKNOWN).

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

## AMENDMENTS APPLIED (spike, `../backend-complete-replacement/plan-amendments.md`)
- `build-profile-seam-and-permission-decoupling`: explicit profile checks, not bundler/TS aliasing. Prototype: `runtimes/build-profile.ts` + one registry line.
- `stub-amr-and-billing`: re-scope to the single `amr` registry seam; its **first task** is an e2e proving billing fetchers degrade to null when AMR is absent (the spike's runtime probe hung). Likely M, not L.
