# Decision log — deploy-web-to-knowme-k8s › backend-complete-replacement

Operator decisions recorded at /kbd-analyze, 2026-10-02 (provenance: user).

- **D-001 · Hosting model** [analyze · 2026-10-02] — Shared workspace, with support for collaborating with stakeholders and external validators.
- **D-002 · Keep/drop** [analyze · 2026-10-02] — DROP: billing, credits, marketplace (for now), vela media. KEEP: team workspaces. RESTRUCTURE: message center to fit our model. Operator wants commerce/billing de-emphasised up front (UX). Operator invites additional recommendations.
- **D-003 · Upstream strategy** [analyze · 2026-10-02] — Stay mergeable with upstream; continue consuming upstream features.
- **D-004 · Rename depth** [analyze · 2026-10-02] — Rename everything (backend is being replaced). NOTE: in tension with D-003; resolution strategy to be proposed in analysis.md and confirmed by operator.
- **D-005 · Brand source of truth** [analyze · 2026-10-02] — KnowMe CSS tokens (`know-me-system/desktop/src/index.css`), not the Dart tokens.
- **D-006 · UAR** [analyze · 2026-10-02] — UAR does not replace ACP; keep ACP. Build an ACP wrapper around UAR.

Operator decisions recorded at /kbd-plan, 2026-10-02 (provenance: user, except where noted).

- **D-007 · Reconciliation of D-003/D-004** — Accepted: rename everything users/operators see, alias internals, re-runnable idempotent codemod, stub-swap instead of deletion. Literal `@knowdesign/*` is NOT pursued.
- **D-008 · Surface policy** — Web: limit guests. Desktop: allow everything. Capabilities partitioned by surface (web/desktop) x authentication (guest/signed-in).
- **D-009 · UAR deployment** — Operator-selectable: local sidecar bound to the application, or remote (same machine launched elsewhere, or cloud). ACP is kept; UAR is reached through an ACP wrapper.
- **D-010 · Touchpoints/campaigns** — Dropped with billing.
- **D-011 · Roles** — Keep viewer + commenter roles, partitioned by surface and sign-in state. (provenance: user for roles; **planner assumption** for the rest: audit log + scoped share links in scope, reviewer handoff package + mention routing deferred.)
- **D-012 · Spike** — Approved: throwaway-branch merge-conflict spike is change 0 and a GO/NO-GO gate.

Spike result, 2026-10-03 (provenance: measured; see spike-report.md).

- **D-013 · Spike verdict: GO** — 0 conflicts at 30 commits behind, 23 at 100 behind (19 locale files + 4 tests), all resolved by prefer-upstream + codemod re-run. `pnpm guard` passes; `pnpm typecheck` passes once workspace `dist/` is rebuilt after the merge.
- **D-014 · Plan corrections (planner, derived from D-013):** (a) do not commit locale/test brand renames — apply the brand at build/runtime; (b) re-scope change 2 around the single `amr` registry seam, verify billing degradation by e2e first; (c) drop bundler/TS aliasing in favour of explicit profile checks; (d) runbook must rebuild workspace packages between merge and typecheck; (e) sync cadence ≤ 1 week.

Final-gate review decisions, 2026-10-05 (provenance: assistant, on the operator's instruction "do it properly" after the recommendations were presented; the operator may reverse either).

- **D-015 · Lifecycle acceptance amended** [commerce-removal · 2026-10-05] — Change 1's criterion "write permission for every lifecycle input" is read as "every *billing-derived* lifecycle state" (`billing_past_due`, `locked`) under `OD_BUILD_PROFILE=knowdesign`. `deleting` and `deleted` remain hard denials, and `readable` is never widened for `deleted`. *Why:* the security review showed that normalising every state would let an active member write to a deleted workspace, and many gates key off the tombstone. The independent judge (gpt-6.1-sol) flagged the mismatch and asked for it to be resolved explicitly. *Alternative rejected:* honouring the literal wording.
- **D-016 · Provider selector carries implementations** [commerce-removal · 2026-10-05] — Change 5's goal ("a new context source needs only additive files") is met by registering the provider's directory, hub and digest implementations alongside its capabilities, with call sites dispatching through the selected provider, not by gating booleans alone. *Why:* the judge showed a third kind could declare capabilities yet still run Vela code. This widens the plan's "diff limited to the five sites + selector"; accepted because the stated goal could not be met otherwise.
- **D-017 · D-015 ratified by the operator** [commerce-removal · 2026-10-06] — The operator reviewed D-015 and chose to keep it: under `OD_BUILD_PROFILE=knowdesign` only the billing-derived lifecycle states (`billing_past_due`, `locked`) stop gating a workspace; `deleting` and `deleted` remain hard denials. *Why:* it costs nothing, and it protects against a member writing into a deleted workspace if a deletion state ever reaches a knowdesign install. *Alternative rejected by the operator:* the literal "every lifecycle state" wording. Supersedes the "awaiting operator ratification" status carried in `commerce-removal/reflection.md` and `execution.md`.
- **D-018 · No-clash identity scope** [knowdesign-brand · 2026-10-06] — "Rename everything" means every OS- or second-install-observable identifier (bundle/app IDs, product name, data and user-state roots, URL scheme, sidecar IPC and port, MCP server name, CLI bin, install/uninstall names, update and image names, GitHub slug), driven from one brand descriptor. Internal code identifiers (`@open-design/*`, `OD_*` env names, TypeScript names) stay aliased per D-007 so weekly upstream merges stay cheap. Operator rationale: remove any possibility of clashing with the original install. *Supersedes* the plan's "register the KnowDesign scheme alongside the existing one": a knowdesign build registers only `knowdesign://`.
- **D-019 · Repository rename** [knowdesign-brand · 2026-10-06] — The GitHub repository is renamed `GQAdonis/open-design` → `GQAdonis/knowdesign` (operator-chosen name). The local checkout directory stays `open-design`, because KBD state, Claude project memory, pk registration and worktree paths embed it. The rename is the final step of change 21 and is re-confirmed immediately before it is run; `upstream` (nexu-io/open-design) is untouched.
- **D-020 · Profile by construction** [knowdesign-brand · 2026-10-06] — A knowdesign build bakes `OD_BUILD_PROFILE=knowdesign` into the packaged config instead of reading it only from the launch environment, and is tested by launching with no environment variable (closes commerce-removal Delta 1).
