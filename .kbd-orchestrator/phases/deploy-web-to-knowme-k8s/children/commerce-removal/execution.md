# EXECUTION: deploy-web-to-knowme-k8s › commerce-removal

- **Date**: 2026-10-03T13:24:26Z · **Backend**: openspec · **Executor**: Claude Code (this session)
- **Dispatched now**: change 1 of 6 only — `capture-test-baseline`. The remaining five changes depend on it (attribution) and on the build-profile seam, and are dispatched in order after it.
- **Safety**: work on `main`'s working tree is read-only for this change (it runs tests; it writes only `baseline.md`). No source edits until the baseline exists.

## Resumed dispatch — 2026-10-04 (operator: "use the agent team")

- **Backend**: openspec (unchanged). **Phase owner/KBD completion**: this session (Claude Code); subagents never mark changes complete.
- **Runtime**: the baseline and every later check run on **Node 24.21.0** (`engines.node ~24`; the shell default is Node 26.5.0 and is not used). Package manager pnpm 10.33.2.
- **Baseline re-measured**: the earlier session's guard/typecheck/web results were never persisted, so all four measurements are rerun sequentially by `.tmp/baseline/run.sh` (logs and vitest JSON in `.tmp/baseline/`), then `baseline.md` is written from those files only. No source edits until it exists.
- **Task model selection (legacy plan, no assignment table)** — explicit selection per the task-selection protocol:
  | Change | Model class | Route | Rationale |
  |---|---|---|---|
  | 0 capture-test-baseline | small | local shell + this session | measurement only |
  | 1 build-profile-seam… | frontier | executor subagent (isolated worktree) | cross-cutting permission decoupling; plan says frontier |
  | 2 stub-amr-and-billing | frontier | executor subagent (isolated worktree) | plan: frontier |
  | 3 drop-touchpoints… | frontier | executor subagent (isolated worktree) | plan: frontier |
  | 4 disable-telemetry… | frontier | executor subagent (isolated worktree) | plan: frontier |
  | 5 remove-vela-collab-hardcoding | frontier | executor subagent (isolated worktree) | plan: frontier |
  Actual model/route is inherited from the harness for each subagent and is recorded per change at completion.
- **Agent team** (no project team definition exists; harness subagents): *executors* implement one change each in an isolated git worktree off the current tree; *reviewer / verifier / integration-checker* roles stay **dormant until every production change is complete**, then run once (final phase QA gate). No per-change tests or reviews.
- **Sequencing**: change 0 → change 1 (serial; seam) → changes 2–5 in parallel worktrees (they all depend only on 1) → merge back in plan order → final gate.
- **Constraint reminders for every executor** (`.kbd-orchestrator/constraints.md`, root `AGENTS.md`): no root `pnpm build/test` aliases; tests live in `tests/` beside `src/`, never under `src/`; new `.js/.mjs/.cjs` are forbidden; `packages/contracts` stays pure TypeScript; web must not import `apps/daemon/src`; new i18n keys go in `types.ts` and all 19 locale files; **no `Co-authored-by` trailers** on commits (project policy overrides the harness default).

## Final phase gate — 2026-10-04 (HEAD `876085dd8c`)

**Implementation**: 6/6 changes complete in canonical state; merged to `main` (`6534dcc` seam, `2008104` collab hardcoding, `a5b76e2` AMR/billing, `9d98517` telemetry, `a26bc9d` touchpoints/marketplace/media, then fix commits `5ea6091`, `97bbfb3`, `ed4b94b`, `9fd30c4`, `876085d`).

**Integration gate (Node 24.21.0), compared by name with `baseline.md`**
| Check | Result |
|---|---|
| package build, `pnpm guard`, `pnpm typecheck` | pass |
| contracts tests | 73 files / 730 tests pass |
| web tests | 1252 of 1253 files pass; the one failure (`deepseek-v4-flash-ui-contract`, two source-text pins on lines the profile legitimately changed) was fixed and passes alone (12/12). Baseline had 0 failures. |
| daemon tests | 11 files / 22 tests failing vs baseline 33 / 44. 8 files appeared that were not in the baseline failing set; **all 8 pass when run alone** (`amr-session-resume` and `routes/live-artifacts` need >90s alone, 204s and ~3 min, and pass), so they are load/order-dependent, the baseline's class C. No deterministic regression. |
| new e2e (`tests/amr/knowdesign-no-cloud`, `tests/tools-dev/knowdesign-profile-no-upstream-network`) | 3/3 pass, exit 0. The recorder first caught a real leak (daemon startup `reconcileImpossibleTeamShares` → `amr-api…/workspaces`), fixed in `876085d`. |

**Review gate: NOT satisfied.** `dispatch-judge.sh` exit 4 (liter-llm `:4000` answers 401; 0 distinct dispatchable models), so a `pending_review` receipt was written (`review/cumulative/pending-review.json`, packet kept for re-dispatch). Three fresh-context harness-native reviews (security, profile-off parity, acceptance coverage; same model family, weaker guarantee) ran in its place; their blocking finding (deleted/deleting workspaces were normalised to active) and the web-profile/onboarding/media/leak findings were fixed. A real receipt or an SSH-signed waiver is still required for final certification.

**Not done, by design**: `kbd-apply verify` / `archive` for the changes (they follow a passing review gate) and the Execute stage completion handoff. Execute stays active.

**Recorded deviations and known gaps**
- Plan acceptance for change 1 said write permission for *every* lifecycle input; implemented as every *billing* lifecycle state, with `deleting`/`deleted` kept denied (security).
- Not fixed (logged): daemon `MEDIA_MODEL_ALIASES` still map legacy ids to `vela/*` (now "unknown model"); `telemetry-relay.ts` / `langfuse-bridge.ts` / four Vela CLI collab sites have no profile guard of their own; `od plugin open-design-pr` still allowed; web `AmrLoginPill` in `SettingsDialog` is hidden only by trigger gating; the network recorder only sees proxy-aware egress (`NODE_USE_ENV_PROXY=1`).
- Known leftover: baseline classes A/B daemon failures (machine/environment dependent) unchanged and unrelated.
