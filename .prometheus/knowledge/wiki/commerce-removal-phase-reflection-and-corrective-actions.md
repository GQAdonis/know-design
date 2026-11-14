---
type: Lesson
id: commerce-removal-phase-reflection-and-corrective-actions
title: Commerce-removal phase reflection and corrective actions
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- commerce-removal
- knowdesign-profile
- packaged-e2e
- openspec
- review-gates
- network-policy
- kbd-process
links:
- karpathy-session-e8376c3dd4e9b0a9
sources:
- id: reflection
  resource: learning:f6e217f4ca8c193e
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:48:30.079226+00:00
created_at: 2026-10-05T16:48:30.079226+00:00
updated_at: 2026-10-05T16:48:30.079226+00:00
revision: 0
content_hash: c3130baccd33413d60fe4036f9dab7e6e04c17c4d4a2acc39657d06283b90393
---

## Summary

The `commerce-removal` phase reached a packaged e2e pass on a real DMG-built app, but the pass did not prove the delivered product behavior for normal Finder launches. `OD_BUILD_PROFILE=knowdesign` is still read from the process environment at launch and is not baked into packaged config (`apps/packaged/src/build-profile.ts`, `sidecars.ts`), so double-clicking the DMG app runs the stock profile with Cloud sign-in, balance, and upstream calls still included.[^reflection]

This reflection extends the earlier packaged-desktop gap described in [Karpathy session e8376c3dd4e9](/karpathy-session-e8376c3dd4e9b0a9.md): the missing packaged/Electron fresh-install e2e was eventually added, but it validates an env-var-launched app, not a KnowDesign-by-construction package.[^reflection]

## Key findings

### Packaged profile was not baked in

- Test success criterion was satisfied by the test harness, not by the product artifact.
- The packaged e2e launched the DMG-built app with `OD_BUILD_PROFILE=knowdesign` in the process environment.
- A user launching from Finder does not inherit that environment and therefore sees the stock profile.
- The user-visible symptom was immediate: KnowMe/KnowDesign branding was not apparent in the handed-over DMG.[^reflection]

### Network-denial assertions were too narrow

The phrase “no upstream calls” was not defined precisely in the plan. The e2e asserted only a named set of upstream hosts: Open Design cloud, telemetry, GitHub, and Discord. It did **not** assert against all third-party traffic.[^reflection]

On a fresh KnowDesign install with no user action, the daemon made 274 requests to 10 third-party hosts, recorded in `.tmp/e2e-release-report/mac/knowdesign-fresh-install/result.json`:[^reflection]

| Host/category | Requests |
|---|---:|
| `pub.dev` | 216 |
| `api2.cursor.sh` | 24 |
| `api.osv.dev` | 15 |
| `registry.npmjs.org` | 5 |
| `mcp.typeui.sh` | 4 |
| `antigravity` | 6 |
| `dashscope` | unspecified |
| `aihubmix` | unspecified |
| `openrouter` | unspecified |

Additional coverage gap: Electron main-process Chromium traffic is not routed through the recorder at all.[^reflection]

### Review gate required seven rounds

- Initial judge dispatch failed because `liter-llm :4000` returned `401` and exposed zero dispatchable models.
- The failed dispatch left a `pending_review` receipt and three weaker same-family harness reviews.
- Rounds 1–6 each returned `BLOCK` on a real defect.
- Round 7 returned `PASS`.
- One CRITICAL finding—the missing packaged/Electron fresh-install e2e—remained open for most of the phase and was declared rather than hidden.[^reflection]

### Lifecycle write-permission criterion was amended by the agent

The original acceptance wording, “write permission for every lifecycle input,” was interpreted as “every billing-derived lifecycle state.” `deleting` and `deleted` remain denied under decision `D-015`.[^reflection]

This amendment is safety-preserving—allowing deleted workspaces to write would be wrong—but it has not been ratified by anyone other than the agent.[^reflection]

### OpenSpec changes were placeholders

All six OpenSpec change directories had a README, and some had proposals, but they had no spec deltas. As a result:[^reflection]

- `openspec validate` failed.
- `kbd-apply verify` could not run.
- `kbd-apply archive` could not run.
- Five capability specs plus one baseline spec had to be authored at the end of the phase.

### Plan text diverged from decision log

The plan still said “aliases + conditional route registration,” while decision `D-014(c)` had replaced that approach with explicit profile checks. The judge flagged this mismatch in round 6 because its packet included only the original plan text, not later amendments.[^reflection]

### Final tree did not receive the full daemon suite

Only the files touched by the phase were re-run: 57 tests. The baseline’s 33 pre-existing failing files were not re-measured after late fixes.[^reflection]

### Gate plumbing consumed significant time

Operational and environment issues included:[^reflection]

- stale OpenSpec `operation.lock` for dead PID `28164`, blocking every verify;
- gate `PATH` resolving a broken `TheBoss/commands/node` shim, causing typecheck failure;
- `certification`-kind gate refusing to run until every boundary in the tree had a receipt;
- stale `.git/index.lock` recurrence;
- first packaged e2e attempt failing on a 45-second launcher-convergence timeout during cold first launch.

### Reflection hook wrote context to the wrong directory

Tooling wrote `prior-context.md` to `.kbd-orchestrator/phases/commerce-removal/` instead of the nested child phase path. The skill’s documented path therefore did not exist.[^reflection]

## Root causes

1. **Runtime-switch design:** The build profile was designed and tested as a runtime environment switch. The plan never assigned ownership for “packaged build is KnowDesign by construction.”[^reflection]
2. **Undefined upstream boundary:** “Upstream” was left ambiguous. Package registries and agent-CLI model-discovery calls came from features unrelated to commerce, and no decision classified them as allowed or forbidden for KnowDesign.[^reflection]
3. **Late environment/authorization gates:** Judge reachability and packaged-app e2e operator approval were not sequenced early, so they accumulated near the end.[^reflection]
4. **Unsafe literal permission criterion:** “Any lifecycle state may write” would have allowed deleted workspaces to write; only “billing no longer locks a workspace” is safe.[^reflection]
5. **Plan generated unverifiable OpenSpec stubs:** `/kbd-plan` allowed OpenSpec change directories without spec deltas, making verify/archive unreachable by construction.[^reflection]
6. **Amendments not merged into review packets:** Packet building quoted `plan.md`, while amendments lived separately in `plan-amendments.md` and the decision log.[^reflection]
7. **Long full-suite runtime:** The full daemon suite takes about 99 minutes serially, outside a normal gate window, so it was dropped instead of scheduled or sharded.[^reflection]
8. **Missing stale-lock liveness checks:** State under `~/.prometheus` and `.git` retained locks after owning processes died.[^reflection]
9. **Phase path resolution bug:** `reflect:before` resolves the phase directory by slug alone rather than by nested path.[^reflection]

## Corrective actions

### Phase-specific

1. Add a `knowdesign-brand` change, including change 20’s app identity work, to bake `OD_BUILD_PROFILE=knowdesign` into packaged config for KnowDesign builds.[^reflection]
2. Add a packaged test that launches without `OD_BUILD_PROFILE` and asserts that the KnowDesign profile is active.[^reflection]
3. Until that change lands, treat any DMG as “KnowDesign only when launched with the profile.”[^reflection]
4. Ask the operator to decide whether a fresh KnowDesign install may contact the third-party hosts observed in the fresh-install run: package registries, agent-CLI model discovery, and MCP catalogs.[^reflection]
   - If forbidden: add these hosts to the asserted forbidden set and silence them under the profile.
   - If allowed: record that decision in the plan so acceptance wording matches behavior.
5. Ask the operator to ratify or reject decision `D-015`; until then, it remains an agent-authored amendment.[^reflection]
6. Schedule the full daemon suite as an explicit, separately timed lane—or shard it—before the next phase’s final gate, then re-measure against `baseline.md` by name.[^reflection]
7. Fix `reflect:before` so `prior-context.md` is written into the nested child phase path.[^reflection]

### Global process/tooling

1. Make `/kbd-plan` require at least one spec delta per OpenSpec change before plan acceptance.[^reflection]
2. Merge plan amendments into `plan.md`, or have packet construction append amendments, so reviewers and judges evaluate the amended criterion.[^reflection]
3. Sequence environment and authorization gates—judge reachability and packaged-app e2e approval—into the first plan rounds, not the last.[^reflection]
4. Add preflight stale-lock checks before verify/archive:[^reflection]
   - read the lock PID;
   - confirm the process is dead;
   - clear the stale lock;
   - apply the same policy to `.git/index.lock`.
5. Run gates with the project’s pinned Node first on `PATH`.[^reflection]

[^reflection]: Commerce-removal reflection lesson