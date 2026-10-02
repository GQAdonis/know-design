---
type: SessionRecord
id: karpathy-session-2caec44062b6cb9c
title: Karpathy session 2caec44062b6
tags:
- karpathy
- session-learning
sources:
- session:38236301-311b-4f9f-b9c6-e40cb938305f
timestamp: 2026-09-22T11:37:16.901548+00:00
created_at: 2026-09-22T11:37:16.901548+00:00
updated_at: 2026-09-22T11:37:16.901548+00:00
revision: 0
---

## Delta

<od-focus key="58a361447b371cc4" open="relay-lab.html" show="relay-lab.html, README.md"/>

<od-done key="58a361447b371cc4"/>

The track is now a real 400 m oval — curves, eight lanes, and the changeover zones in their true positions around the lap.

**What changed**

The old view unrolled one lane onto a flat 400 m axis. It now draws measured track geometry: two 84.39 m straights joined by 36.80 m-radius bends, eight lanes at 1.22 m spacing. That checks out to exactly 400.00 m on lane 1. (The 36.50 m radius often quoted is the inside *kerb*; the measured line a runner follows sits 0.30 m outside it, and that's the line the model uses.)

Because the relay starts one lap back from the common finish, race distance and track station are the same number — so the three zones land where a coach expects them: **exchange 1 on the exit of the first bend, exchange 2 on the back straight, exchange 3 on the exit of the final bend**. The close-up now names which of the two its zone sits on, since a bend exchange is mechanically different from a straight one.

Runners take position *and facing* from the geometry, so leg 2 genuinely runs right-to-left down the back straight and turns through the bends. The squad runs lane 4, tinted; the other seven are drawn for realism and explicitly not simulated.

**Three real bugs surfaced and fixed during verification**

1. `drawRunnerAt(ctx, opts)` was being called with only the options object, so every runner draw threw and silently aborted the rest of the frame — no runners rendered at all.
2. Lane rings were sampled `0→400` for *every* lane, but only lane 1 is 400 m, so the rings failed to close and `closePath` cut chords across the infield.
3. Ticks and zone edges drew a straight line between inner and outer edge at one station. On a bend those points sit at different angles, so the chord sliced through the infield — the stray diagonals.

Each is now covered by a regression test that fails on the old behaviour.

**Verified**

- 51/51 tests pass (`node --test "tests/*.js"`) — 9 new geometry tests covering lap length, path continuity, heading tangency, zone placement, ring closure, and cross-track lines.
- 14/14 headless smoke checks: boot, scrub, all three close-ups, edit-resets-run, baseline capture, and an assertion that **no non-finite coordinate reaches the canvas**.
- Rendered and inspected at rest and mid-race, in both themes; oval fits with clearance at 320/768/1024/1440/1920 and no label clips.
- Every authored file is back under 500 lines (the geometry tests moved to their own file).

One correction worth flagging: the README documented `node --test tests/` — on Node 24 that's read as a module path and fails. The working form is `node --test "tests/*.js"`, now fixed in the docs.

Not modelled, and stated as such: lane stagger, the extra distance an outer lane would add, curve-running effects, wind. The race clock remains labelled *Simulated*.

<od-next key="58a361447b371cc4" value="Show the stagger lines so each lane starts at its own offset"/>
<od-next key="58a361447b371cc4" value="Add a trailing path behind each runner showing distance covered this leg"/>
<od-next key="58a361447b371cc4" value="Let me pick which lane the squad runs in"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 38236301-311b-4f9f-b9c6-e40cb938305f
- Captured: 2026-09-22T11:23:45.089788Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
