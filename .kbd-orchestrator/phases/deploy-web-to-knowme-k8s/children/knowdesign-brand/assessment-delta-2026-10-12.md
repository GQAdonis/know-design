# ASSESSMENT DELTA: deploy-web-to-knowme-k8s › knowdesign-brand

- **Date**: 2026-10-12 · **Supplements** `assessment.md` (2026-10-06); that file and the completed stage state are untouched.
- **Why a delta, not a rewrite**: the child is 4/4 implementation COMPLETE with all five stage handoffs written. Overwriting `assessment.md` would rewrite the input of stages that already ran. This note records what is true of the goals today.
- **Method**: read-only repo inspection (remotes, brand seam files, docs, telemetry default, slug literals). No tests or builds were run, so nothing below is a build/test claim.

## Goals against the tree today

| Goal | Evidence | Verdict |
|---|---|---|
| Brand seam + idempotent codemod; locales/tests byte-identical | `packages/contracts/src/brand.ts`, `packages/release/src/brand.ts`, `apps/web/src/brand/*` exist; `brand-runtime.test.tsx` exercises runtime substitution | MET (seam present; codemod idempotence not re-run) |
| KnowDesign tokens, icons, channel-distinct identity | Not re-inspected in this pass | NOT RE-VERIFIED; relies on execute handoff |
| Docs, CI, image names; repo rename only on confirmation | `origin` is `GQAdonis/know-design` (renamed; note slug is `know-design`, the plan said `knowdesign`); `upstream` still `nexu-io/open-design` | MET. Plan text and docs that say `knowdesign` are stale on the slug |
| Merge rehearsal + sync runbook | `docs/knowdesign-upstream-sync.md` present | MET (existence only) |

## Residual findings (not regressions in the 4 delivered changes)

1. **Telemetry defaults to ON under the knowdesign profile.** `apps/daemon/src/app-config.ts` `applyTelemetryDefaults` sets `metrics: true, content: true` when no `telemetry` pref exists, with no build-profile gate. commerce-removal's `disable-telemetry-and-upstream-endpoints` change silenced upstream *endpoints*; whether events can still leave the machine through `telemetry-relay.ts` / `vela-wallet.ts` default hosts was not traced. Matters directly to the local-first requirement in `docs/cloud/postgres-and-kratos-cutover.md`.
2. **URL scheme: verified brand-derived on mac/runtime; Windows/Linux unchecked.** `invite-deeplink.ts` registers `inviteDeeplinkScheme()` and `tools/pack/src/mac/builder.ts` builds protocols from the brand (`macBuilderProtocols(brand)`). The `opendesign://` literals in `invite-deeplink-core.ts` are parser/format helpers and comments. Windows registry and Linux .desktop scheme handling were not inspected; those builders bypass `packages/release` per the original assessment. (An earlier draft of this note flagged this as a possible gap; the check above retracts that.)

3. **`nexu-io/open-design` literals** remain in ~12 source files; the ones sampled are issue-number comments, not runtime links. A full pass would separate comments from user-visible URLs.
4. **KBD state is behind the work.** Cloud spec (PR GQAdonis/know-design#1), the gate fixed-claims change (flint-gate#15), Quarry provisioning and the `OD_ALLOWED_ORIGINS` fix are not tracked in any phase; they fit `backend-complete-replacement` / `identity-and-collaboration`.

## Recommendation

Do not reopen `knowdesign-brand`. Carry finding 1 (and the Windows/Linux scheme check from 2) into `identity-and-collaboration` as the first local-first guardrail change (spec step L0): gate telemetry defaults on the profile, trace the relay hosts, and verify no non-loopback egress on a fresh no-login launch. Track finding 4 by registering the cloud cutover as a change there.
