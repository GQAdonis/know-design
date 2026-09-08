# PLAN: upstream-fixes-and-skill-integration

Project: open-design (fork of `nexu-io/open-design`)
Date: 2026-08-14
OpenSpec available: **YES** (`openspec/{specs,changes,changes/archive}`, OpenSpec 1.4.1)
Changes to implement: **7**

Inputs: `assessment.md`, `analysis.md`, `library-candidates.json` (9 candidates,
10 gaps), `decision-log.md` (Goal 3 resolved → **3a**), `AGENTS.md`,
`.kbd-orchestrator/constraints.md`.

---

## Planning basis and two new measurements

Two facts were measured during planning because they change the ordering:

1. **The rebase is cheaper and safer than feared.** Upstream's 25-commit delta
   touches `EntryShell.tsx` by only **48 lines (+35/−13)**, and — decisively —
   **the gate is byte-identical at `upstream/main` HEAD** (it merely moved to
   lines 596-601). `git diff $MB..upstream/main -- EntryShell.tsx` shows upstream
   **never touched the gate lines**. So rebasing first does not fight our patch,
   and it lands us on the same tree the `tony-box` reference patch targets.
   → **change-001 (rebase) goes first**, as analysis recommended, now with
   evidence rather than caution.

2. **The test baseline is large: 934 test files** (436 daemon + 498 web). This is
   why the assessment's 2-minute probe timed out. Capturing a baseline is
   therefore its own change, not a step inside another — otherwise every later
   failure is unattributable.
   → **change-002 (baseline)**.

## Scope cuts made deliberately

Per the phase's own goals and the S-07 discipline, the following were considered
and **cut**:

- **Goal 3 reading 3b** (invoke `knowme-builder`) — deferred to its own phase by
  the 2026-08-10 decision. Not planned here.
- **Auto-detection of external packs** (gap-8) — `cand-009` is a **reject**;
  scanning `~/.claude/plugins/` couples us to another tool's private layout.
  Planned instead as an *explicit path* input inside change-004. The "detect"
  half of Goal 2 is thereby **partially descoped, deliberately** — see Risks.
- **Reconciling the duplicate `DESIGN-HANDOFF` generators** (gap-5) — real, but
  a pre-existing divergence unrelated to the four goals. **Not planned**; logged
  as follow-up.
- **A UI toggle for local mode** — deferred to change-003's judgment; if a
  toggle is added it costs 19 locale keys. v1 targets config + CLI.

---

## CHANGE LIST (ordered)

### 1. `rebase-onto-upstream-main`
- **Scope:** repo-wide (merge only, no feature code)
- **Depends on:** NONE
- **Recommended agent:** Manual (human-supervised merge)
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** LOW (enabling)
- **Details:** Merge/rebase the 25 upstream commits. Measured conflict surface:
  55 changed files under `apps/web/src` + `apps/daemon/src`; `EntryShell.tsx`
  is +35/−13 with the gate lines untouched. Land this before any gate edit so
  the reference patch (`tony-box@9dfc269e`) applies against a comparable tree.
  Verify with `pnpm guard && pnpm typecheck` before proceeding.
- **Gap:** gap-10 · **library:** n/a

### 2. `capture-test-baseline`
- **Scope:** ci/tooling (no product code)
- **Depends on:** change-001
- **Recommended agent:** OpenCode / Codex
- **Est. complexity:** S
- **Complexity score:** Low
- **Model class:** small
- **Customer value:** LOW (enabling)
- **Details:** Run and record the full package-scoped suites
  (`pnpm --filter @open-design/daemon test`, `… @open-design/web test`) with
  generous timeouts, storing pass/fail counts and any pre-existing failures to
  `.kbd-orchestrator/phases/<phase>/test-baseline.md`. 934 test files exist; a
  baseline *after* the rebase is the only way later regressions are attributable.
  **Do not fix pre-existing failures here** — record them.
- **Gap:** (enabling) · **library:** n/a

### 3. `local-first-mode`
- **Scope:** web + daemon config + CLI (`all`)
- **Depends on:** change-001, change-002
- **Recommended agent:** Claude Code / Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** **HIGH**
- **Details:** The phase's headline deliverable. Two coupled edits:
  (a) make the `EntryShell.tsx` redirect conditional on an explicit local/cloud
  mode instead of on `amrLoggedIn` (currently 588-594 here, 596-601 upstream);
  (b) **reorder onboarding so Local-CLI/BYOK are selectable without cloud
  sign-in** — `setStep(1)` is currently reachable only via
  `continueAfterCloudSignIn()`. (b) is the root problem; (a) alone leaves BYOK
  behind the wall. Read `tony-box@9dfc269e` first as a reference — but it
  *reverts* the gate, whereas we add a mode, so do not cherry-pick blind.
  Dual-surface: config + `od` surface required in the same PR; a UI toggle
  triggers 19 locale keys.
- **Gap:** gap-1, gap-2 · **library:** cand-002 (reference), cand-001 (interim)

### 4. `skill-pack-import-adapter`
- **Scope:** daemon (`skills.ts` + install route) + CLI
- **Depends on:** change-001, change-002
- **Recommended agent:** Claude Code
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** MEDIUM
- **Details:** Import external skill packs from an **explicit local path**
  without misclassifying them. `SkillMode` (`skills.ts:34`) has no `utility`
  value, so a skill with no `od:` block falls through to prose-regex
  `inferMode()` — measured over the 39 hybrid skills that yields 6 **image**,
  2 **video**, 1 **deck**, plus `designSystemRequired: true` for all. Inject
  `od.mode` + `design_system.requires: false` at import. **Ship a test that
  asserts resulting modes** — misclassification is otherwise silent. Surface
  the already-working `{source:'local', path}` route
  (`static-resource.ts:1085-1088`) in CLI help.
- **Gap:** gap-3, gap-8 (partial) · **library:** cand-003 (adopt), cand-004 (adapt)

### 5. `import-hybrid-architecture-skills`
- **Scope:** content + verification (uses change-004)
- **Depends on:** change-004
- **Recommended agent:** OpenCode / Codex
- **Est. complexity:** S
- **Complexity score:** Low
- **Model class:** small
- **Customer value:** MEDIUM
- **Details:** **Goal 3, reading 3a as decided 2026-08-10.** Import the 39
  `.claude/skills/` from `/Users/gqadonis/Projects/hybrid-mobile-architecture-src`
  through change-004's adapter, then verify each lands with a sensible mode and
  `designSystemRequired: false`. Zero name collisions were confirmed against
  OD's bundled catalogue. **Explicitly does NOT generate applications** —
  this imports guidance the agent reads.
- **Gap:** gap-6 · **library:** cand-004

### 6. `eject-skills-with-project`
- **Scope:** daemon export + contracts + CLI + web
- **Depends on:** change-004
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** **HIGH**
- **Details:** Goal 2's *purpose* clause — skills must travel to ejected code
  projects. Today nothing does: the archive ZIP filters dotfiles
  (`projects.ts:499`) so `.od-skills/` never ships, and writing
  `AGENTS.md`/`CLAUDE.md`/`.claude/` has zero precedent. Adapt the
  `plugins/export.ts:69-127` pattern (already writes `SKILL.md` +
  `.claude-plugin/plugin.json` to an arbitrary `--out`). **Write to a separate,
  visible, git-committable path — NOT `.od-skills/`**, which
  `cwd-aliases.ts:9-18` deliberately keeps disposable because agents can write
  to their own cwd. New contract DTO + route + `od` subcommand + UI in one PR.
  `jszip`/`tar` already present; no new deps.
- **Gap:** gap-7 · **library:** cand-005 (adapt), cand-008 (adopt)

### 7. `hybrid-export-scenario-plugin`
- **Scope:** plugin content (+ web surface if absent)
- **Depends on:** change-005, change-006
- **Recommended agent:** Claude Code
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** **HIGH**
- **Details:** Goal 4, fixed at **4a** now that Goal 3 resolved to 3a. Clone
  `plugins/_official/scenarios/od-react-export` (verified git-tracked source):
  `kind: scenario`, `scenario: downstream-export`, `mode: export`,
  `capabilities: [prompt:inject, fs:read, fs:write]`, `pipeline.stages:
  [{id: handoff, atoms: [handoff]}]`. Point it at the imported hybrid skills.
  **Verify a web entry point exists first** — grep found no scenario-plugin
  surface in `apps/web/src`; if absent, building it is part of this change
  (that is why 4a is S–M, not S). Plugins cannot ship atoms
  (`atoms/registry.ts:55-81`), so this stays prompt-only.
- **Gap:** gap-4 · **library:** cand-006 (adapt)

---

## EXECUTION ROUND ORDER

```
Round 1 (serial):    change-001  (rebase — everything else builds on it)
Round 2 (serial):    change-002  (baseline — must follow the rebase)
Round 3 (parallel):  change-003, change-004
Round 4 (parallel):  change-005, change-006
Round 5 (serial):    change-007
```

change-003 and change-004 are independent (web onboarding vs daemon skill
import) and may run in parallel worktrees. change-005 and change-006 both depend
only on change-004.

---

## COMMANDS TO RUN

```
/opsx:new rebase-onto-upstream-main
/opsx:new capture-test-baseline
/opsx:new local-first-mode
/opsx:new skill-pack-import-adapter
/opsx:new import-hybrid-architecture-skills
/opsx:new eject-skills-with-project
/opsx:new hybrid-export-scenario-plugin
```

---

## RISKS AND TRADE-OFFS

1. **Goal 1 is not fully satisfied by change-003 alone.** AMR ships
   `fallbackModels: []` (`runtimes/defs/amr.ts:649`), so the default runtime
   resolves no models offline. change-003 must also make local mode *select* a
   runtime that works offline, or the user reaches a working screen with a
   non-working agent. This is called out in the change but is the likeliest way
   the phase ships "done" and still fails the goal.

2. **Goal 2's "detect" clause is partially descoped.** We plan explicit-path
   import, not auto-detection. If the intent was "OD notices my Claude Code
   pack automatically," this plan does not deliver it — by choice, since
   scanning another tool's cache is fragile.

3. **The patch must be carried indefinitely.** Upstream #6599 confirms the gate
   is intentional and uncommitted to change. Every future rebase re-touches it.

4. **change-007 may be larger than M** if no plugin UI surface exists. The
   estimate assumes a modest surface; verify before committing to the round.

5. **Auto-update opt-out is still UNKNOWN in our tree.** `tony-box@82bfa63d`
   suggests it matters (0.18.1 auto-updating over a pinned 0.18.0). Not planned
   as its own change; fold the check into change-003 or defer knowingly.

6. **gap-5 (duplicate `DESIGN-HANDOFF` generators) is not planned.** Daemon
   (`projects.ts:640`) and web (`exports.ts:239`) build the same artifact
   independently. Pre-existing divergence risk, outside the four goals.

## SYCOPHANCY SELF-CHECK

- **S-02 (agreement without grounding):** The plan does **not** assert the four
  goals are cleanly achievable. Risk 1 states plainly that change-003 can ship
  and still leave Goal 1 unmet; risk 2 states Goal 2's "detect" clause is
  deliberately only partly delivered.
- **S-07 (scope creep):** Four items explicitly cut (3b, auto-detection, gap-5,
  UI toggle) rather than absorbed to look thorough.
- **S-03 (caveat collapse):** Six risks retained, including two that concede the
  plan may not satisfy the stated goals as written.

PLAN COMPLETE
