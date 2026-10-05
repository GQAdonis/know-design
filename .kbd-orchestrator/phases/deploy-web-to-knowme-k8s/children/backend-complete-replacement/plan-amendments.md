# Plan amendments after change 0 (spike, GO)

Source: `spike-report.md`. These supersede the matching text in `plan.md`; the plan body is left intact for history.

- **Change 1** — replace "aliases + conditional route registration" with explicit profile checks at a handful of call sites (`OD_BUILD_PROFILE=knowdesign`); prototype: `runtimes/build-profile.ts` + one registry line. `pnpm guard` accepts it.
- **Change 2** — re-scope: the `amr` agent removal (27 -> 26 agents, verified at runtime) disables every `agentId==='amr'` web gate. Billing fetchers already degrade to null when the runner rejects (code-read). **First task: an e2e that proves it** (the spike's runtime probe hung and is unverified). Then remove only UI that renders independently of the `amr` agent. Likely M, not L.
- **Changes 19, 21** — do not commit renamed locale files or brand-asserting tests. Apply the display name at build/runtime from the brand config; keep upstream's locale files byte-identical. This removes the dominant conflict class (19 of 23 conflicts).
- **Change 22 / runbook** — add "rebuild workspace packages (`pnpm -r --filter './packages/*' build`)" between merge and `pnpm typecheck`; sync at least weekly; document `rerere` enablement as a deliberate setting.
- **Fallback trigger** — if a weekly sync yields > ~5 conflicts after changes 1–5 land, re-evaluate the regenerated-branch option.
