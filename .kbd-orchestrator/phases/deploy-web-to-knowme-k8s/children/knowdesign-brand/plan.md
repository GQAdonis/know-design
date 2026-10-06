# PLAN: deploy-web-to-knowme-k8s › knowdesign-brand

- **Date**: 2026-10-03 · **Inherited from** `../backend-complete-replacement/plan.md` as amended by `plan-amendments.md` (spike result, D-013/D-014). Change text below is copied from the umbrella and is authoritative here.
- **Changes**: 4
- **Round order**: Round 1: brand-seam-and-rename-codemod · Round 2: knowdesign-tokens-icons-and-app-identity · Round 3: knowdesign-docs-locales-ci-and-repo-name · Round 4: merge-rehearsal-and-runbook. Depends on commerce-removal (the seam).
- **Decisions in force**: D-001…D-014 in `../backend-complete-replacement/decision-log.md`.

## CHANGE LIST (ordered)

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

## AMENDMENTS APPLIED (2026-10-06, see plan-amendments.md; D-018, D-019, D-020)
- Change 19 also owns the single brand descriptor and baking `OD_BUILD_PROFILE=knowdesign` into the packaged config (test: launch with no env var).
- Change 20 replaces the "alongside the existing scheme" wording: knowdesign registers only `knowdesign://` and renames every OS-observable identifier (bundle ID, userData, sockets, port, user-state dir, MCP name, CLI bin, installer/registry names).
- Change 21 adds GitHub-slug literals and image/chart names, and renames the repository to `GQAdonis/knowdesign` as its last step after re-confirmation; local directory kept.
- Phase acceptance: a KnowDesign build runs beside an installed, running original with no shared identifier.

## AMENDMENTS APPLIED (2026-10-03)
- Locale files and brand-asserting tests stay **byte-identical to upstream**; apply the display name at build/runtime from the brand config (19 of 23 spike conflicts).
- Runbook: rebuild workspace packages between merge and typecheck; sync at least weekly.
