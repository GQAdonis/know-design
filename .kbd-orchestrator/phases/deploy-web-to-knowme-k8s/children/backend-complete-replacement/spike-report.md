# SPIKE REPORT: rebrand-merge-conflict-spike

- **Date**: 2026-10-03 · **Verdict: GO** (with the corrections below)
- **Method**: two throwaway worktrees, branches `spike/rebrand-merge-30` (base `upstream/main~30` = `94f27cb0ab`, 2026-09-21, 30 commits behind) and `spike/rebrand-merge-100` (base `upstream/main~100` = 2026-09-14, 100 commits behind). On each: one prototype commit, then `git merge upstream/main` with `rerere` enabled. Nothing was pushed; nothing touched `main`.
- **Prototype commit** (the "layer"): (1) `brand/apply.ts`, an idempotent TypeScript codemod replacing the display string `Open Design` → `KnowDesign` across an allowlist (top-level docs, `apps/web/{src,tests}`, `apps/desktop`, `apps/packaged`, `tools/pack`, `apps/daemon/src`), with a deny-list for the must-not-rename paths; (2) `runtimes/build-profile.ts` + a one-line edit in `runtimes/registry.ts` that drops the `amr` agent when `OD_BUILD_PROFILE=knowdesign`.

## Results

| Metric | 30-back base | 100-back base |
|---|---|---|
| Files in the prototype commit | 138 (135 codemod + 3) | 128 (125 codemod + 3) |
| Upstream files changed by the merge | 412 | (larger; ~100 commits) |
| Files git auto-merged (both sides touched) | 34 | 49 |
| **Merge conflicts** | **0** | **23** |
| Nature of conflicts | — | 19 locale files (`apps/web/src/i18n/locales/*.ts`) + 4 web tests |
| Resolution | none needed | `git checkout --theirs` on all 23 (prefer upstream), re-run codemod |
| New brand strings introduced by upstream, needing a codemod re-run | 4 files | 38 files |
| Codemod idempotent (second run = no diff) | yes | yes |
| `registry.ts` edit survived the merge | yes | yes (no conflict) |
| `pnpm guard` on merged prototype | **PASS** (1m47s) | not run |
| `pnpm typecheck` on merged prototype | **PASS** after rebuilding workspace packages (see caveat) | not run |

**Reading the numbers.** Conflict count grows with distance from the last sync (0 at ~9 days, 23 at ~16 days), but every conflict in the 100-back run was in a **mechanical, resolvable-by-policy category**: the locale value files and the tests that assert them. None was in application logic. "Prefer upstream, then re-run the codemod" fully resolved them with no hand edits. The consequence is operational: **sync often**; conflicts are cheap at weekly cadence and still tractable at two weeks.

## Findings that change the plan

1. **The locale files are the conflict hotspot, not the code seam.** They changed upstream constantly in the window. This validates the analysis's "change values, not keys" rule, but shows that even value edits collide. **Recommendation (plan change 19/21):** do **not** commit the locale rename. Apply the display-name substitution at **build/runtime** via the brand config (a name interpolation in the i18n loader, or generate locales at build time), leaving upstream's locale files byte-identical. That removes the largest conflict class.
2. **The same applies to the tests that assert brand strings.** Prefer tests that read the brand name from the brand config over committed renames of assertion strings.
3. **A configuration-only path exists for the Vela/AMR surface — verified in code, partly verified at runtime.**
   - [V runtime] With `OD_BUILD_PROFILE=knowdesign`, `AGENT_DEFS` drops from 27 to 26 entries and `amr` is absent. The **entire** web gate is keyed on `config.agentId === 'amr'` (`EntryShell.tsx:709`), so with AMR undetected the onboarding redirect, `CloudSignInTip` and balance gates cannot trigger.
   - [V code-read, NOT run] `runVelaCommand` (`vela-command.ts:198`) does `getAgentDef('amr')` and rejects when missing; every billing fetcher (`fetchVelaBillingSummary`, `…Catalog`, `…Balance`) wraps its runner in `try/catch → null`. So all Vela-CLI-backed billing/team calls should degrade to `null` with no further edits. **My runtime probe of this hung and was killed — treat it as unverified until change 2 runs it as an e2e.**
   - Net effect: change 2 (`stub-amr-and-billing`) is probably **much smaller** than planned — one registry line plus UI that renders independently of the `amr` agent (message center / avatar menu sign-in state / wallet pill) rather than module-by-module stubbing. Re-scope after a real probe.
4. **`pnpm guard` accepts the pattern.** A new TypeScript `brand/` script and a build-profile module pass the repo guard. Bundler/TS aliasing was **not needed or tested**; the spike's registry seam is an explicit conditional, not an alias. The "alias" mechanism in the plan can be dropped in favour of explicit profile checks at a handful of call sites.
5. **Stale `dist/` caused a false typecheck failure.** The first two `pnpm typecheck` runs failed with errors about missing exports in `@open-design/contracts`, `diagnostics`, `sidecar-proto` and `sidecar`. These were **not** caused by the prototype: install builds package `dist/` at the old base, and the merge brought new exports. After `pnpm -r --filter "./packages/*" build`, typecheck passed with 0 errors. **The upstream-sync runbook (change 22) must include "rebuild workspace packages" between merge and typecheck**, or every sync will show spurious failures.
6. **Install cost:** `pnpm install` in a fresh worktree took ~5 minutes (sharp builds from source via node-gyp) — relevant for CI time budgets and for worktree-per-change execution.

## Limits of this spike (do not over-read)

- The prototype covered **display-string rename + one agent-registry seam**. It did **not** include the removal of billing UI, collab, telemetry or marketplace code, nor the brand tokens/icons. Conflict cost for those is unmeasured.
- Two samples (30 and 100 commits back) are a small sample of a fast-moving upstream (~6 commits/day).
- The codemod covers only the exact string `Open Design`. `OpenDesign`, `open-design`, `@open-design/*`, `OD_*` and `od://` were deliberately left (aliased, per D-007), so this does not measure a full rename — it measures the **recommended** reduced-surface one. A literal full rename was not measured; the research predicts it is far worse.
- `rerere` recorded the 23 resolutions, but I did not measure replay benefit (a third merge would show whether it cuts a repeat conflict).
- Unit/e2e/daemon test suites were **not** run; only `guard` and `typecheck`.

## Verdict: **GO**, conditions

**GO** for the stub-swap/profile seam, the idempotent codemod, and the "merge → prefer-upstream on conflicts → re-run codemod → rebuild packages → guard/typecheck" workflow. Conditions folded back into the plan:

1. **Plan change 19/21:** keep locale JSON/TS and brand-asserting tests **untouched**; apply the brand at build/runtime from the brand config. (Biggest single conflict reduction.)
2. **Plan change 2:** re-scope around the single `amr` registry seam; run the billing-degradation probe as a real e2e first. Do not stub modules that already degrade.
3. **Plan change 1:** replace "bundler/TS aliasing" with explicit profile checks; keep the footprint at a handful of call sites.
4. **Plan change 22 / runbook:** add the package-rebuild step and a sync cadence of **≤ 1 week**.
5. **Fallback if conflicts at the 1-week cadence exceed ~5 per sync after changes 1–5 land:** re-evaluate option 2 (regenerated branch).
