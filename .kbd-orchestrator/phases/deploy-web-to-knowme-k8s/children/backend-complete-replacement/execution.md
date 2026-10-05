# EXECUTION: deploy-web-to-knowme-k8s › backend-complete-replacement

- **Date**: 2026-10-03T09:24:11Z
- **Backend**: `openspec` (spec-backed; tasks tracked in `openspec/changes/<id>/tasks.md`, mirrored into KBD via `prometheus kbd task register`)
- **Executor**: Claude Code (this session). Model class: frontier (no `model_policy`; default per plan).
- **Scope of this dispatch**: **change 0 only** — `rebrand-merge-conflict-spike` (GO/NO-GO gate). Changes 1–22 are **not dispatched**: their ordering and shape depend on the spike result (NO-GO re-plans 1–5 and 19–22), and the plan recommends splitting into four child phases after a GO.
- **Round order**: per plan.md; Round 0 = change 0.
- **QA**: per kbd-execute, final cumulative QA/adversarial review happens only after all planned production changes complete. The spike produces no production code, so its evidence is the spike report. Adversarial review is not available (preflight degraded).

## Safety constraints for this dispatch
- All spike work on a separate git worktree + local branch; **no push** of any spike ref; branch and worktree are deleted at the end.
- `main` working tree is not touched by spike commits.
- No `Co-authored-by` trailers (AGENTS.md).

## Pending after dispatch
Changes 1–22 pending (registered). Task list for change 0: 11 tasks registered (1–11).
