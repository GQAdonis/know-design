# Current Waypoint

- **Phase**: `deploy-web-to-knowme-k8s`
- **Previous phase**: `upstream-fixes-and-skill-integration`
- **Status**: `plan_complete`
- **Stage**: assess ✅ → plan ✅ → **execute (next)**
- **Plan revision**: 2 · **Runtime revision**: 4
- **Updated**: 2026-09-14

## Next step

```
/opsx:new publish-fork-container-image
```

`publish-fork-container-image` is change 1 of 12 — S / Low complexity / small model class.
**No workflow edit**: cut a `v*.*.*` tag and let the existing active trigger publish
`ghcr.io/GQAdonis/od`. Acceptance asserts `git diff` touches **no** file under
`.github/workflows/`.

## Phase artifacts

| Artifact | Path |
|---|---|
| Goals (6) | `phases/deploy-web-to-knowme-k8s/goals.md` |
| Assessment | `phases/deploy-web-to-knowme-k8s/assessment.md` |
| Plan | `phases/deploy-web-to-knowme-k8s/plan.md` |
| Assess handoff | `phases/deploy-web-to-knowme-k8s/handoffs/assess.handoff.json` |
| Plan handoff | `phases/deploy-web-to-knowme-k8s/handoffs/plan.handoff.json` |
| Review (assess) | `phases/deploy-web-to-knowme-k8s/review/assess/` |
| Review (plan) | `phases/deploy-web-to-knowme-k8s/review/plan/` |

## Change order (12)

```
R1  publish-fork-container-image · dns-a-record-prerequisite   [parallel; DNS is Manual]
R2  provision-namespace-and-pull-secret
R3  deploy-daemon-workload · provision-postgres-cluster        [parallel]
R4  expose-via-shared-gateway                                  [needs R1 DNS]
    ^ creates the TEMPORARY open-design-direct route
--- SITE LIVE on SQLite; goals 1-4 verifiable ---
R5  decide-postgres-backend-design                             [spike, no prod code]
R6  implement-postgres-daemon-backend
R7  cut-over-deployment-to-postgres                            --- goal 5 observable ---
R8  gate-authenticated-access
    ^ DELETES open-design-direct; auth bypass closes here
R9  surface-authenticated-identity                             --- goal 6 complete ---
R10 document-deployment-runbook
```

## Carry into execute

- **SECURITY**: `expose-via-shared-gateway` leaves an unauthenticated `open-design-direct`
  HTTPRoute. `gate-authenticated-access` **must** delete it in the same change, or two
  routes match `design.know-me.tools` and authentication is bypassable. Acceptance:
  exactly one HTTPRoute for the host, backed by flint-gate.
- The site is **intentionally unauthenticated between R4 and R8**. Reorderable if that
  window is unacceptable.
- **Capture the daemon test baseline before R6** — it is UNKNOWN (540s timeout), and R6
  propagates an async boundary through the 79 files importing the DB handle.
- R6 adds the workspace's **first Postgres client**: `pnpm install`, committed lockfile,
  Nix pnpm deps hash refresh check, `pnpm guard`, `pnpm typecheck`, package-scoped daemon
  test/build, PR-checklist declaration.
- **DNS is external** — `design.know-me.tools` must resolve to `23.239.29.33` before R4.
- `openspec/changes/` is deliberately **empty of these 12**; create each through
  `/opsx:new <id>` so `proposal.md` / `tasks.md` are scaffolded properly.
