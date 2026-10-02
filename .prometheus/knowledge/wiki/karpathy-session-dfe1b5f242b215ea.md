---
type: SessionRecord
id: karpathy-session-dfe1b5f242b215ea
title: Karpathy session dfe1b5f242b2
tags:
- karpathy
- session-learning
sources:
- session:38236301-311b-4f9f-b9c6-e40cb938305f
timestamp: 2026-09-22T12:03:30.445671+00:00
created_at: 2026-09-22T12:03:30.445671+00:00
updated_at: 2026-09-22T12:03:30.445671+00:00
revision: 0
---

## Delta

<od-focus key="d1d1dba89c8a8d58" open="relay-lab.html" show="relay-lab.html, assets/og-cover.png, README.md"/>

<od-done key="d1d1dba89c8a8d58"/>

## Live URL

```
https://ipfs.prometheusags.ai/ipfs/bafybeiblqqc5rrhunsdpyjsraqcuc4auv3juvubidx6itrjfo7zwwhmhlu/
```

All 25 paths verified serving HTTP 200 after upload — every module, stylesheet and the OG image. JavaScript comes back as `text/javascript`, which matters because ES modules won't load otherwise.

## The handoff

This was the biggest change. Previously the baton switched owner instantly and the incoming runner froze mid-stride. Now, over a 0.34 s window centred on the modelled meeting:

- the incoming runner drives an arm **forward**, the outgoing reaches **back**, both eased so the motion grows rather than snapping on
- the baton belongs to **neither** runner mid-pass — it's drawn between their two real hand positions, which `drawRunner` now reports back, so the stick lands *in a hand* instead of near one
- the passer **runs on and decelerates** over ~1.15 s instead of stopping dead

Critically, the handoff time and distance are still decided purely by where the two trajectories meet. This changes how the pass is *drawn*, not when it happens — and a failed exchange animates none of it, which a test asserts across the whole timeline.

## Runners and UI

Rebuilt the figure with a filled tapered torso, real shoulder and pelvis segments, and a head tilted down the track — they read as athletes rather than stick figures now. Track surface deepened to a proper terracotta; waiting runners sit at 62% opacity so the eye goes to whoever carries the baton (opacity only — the leg colour and numbered badge are untouched, so nothing is identified by brightness alone). Also fixed a close-up layout bug where the canvas growth for the oval had pushed runners off the bottom edge.

## Mobile landscape

Pressing **Play** on a phone promotes the stage to fullscreen and rotates it a quarter turn so the oval uses the long edge; the button contracts it, Escape also exits. A device *already* held landscape expands without rotating — rotating there would be wrong. The native Fullscreen API and orientation lock are requested opportunistically and allowed to fail (iOS Safari refuses fullscreen on non-video elements); the CSS layout does the real work, so it behaves either way.

## Verification

56 unit tests, plus two jsdom harnesses I kept in the repo: 14 app smoke checks and 13 mobile checks covering the full expand/contract flow. All pass. Every authored file is back under 500 lines — I extracted `src/baton.js` and split the test file to get there.

## Two things worth flagging

**The OG URL is a genuine fixed point.** On IPFS the absolute `og:image` URL must contain the CID, but the CID hashes the bytes that tag lives in — so adding it changes the CID. Chasing it never converges. I resolved it with a two-pass publish: `og:image` points at a prior CID that serves the byte-identical image (verified: HTTP 200, `image/png`, 79 KB). `og:url` is a canonical hint only; crawlers preview the URL they were actually given, so link previews work correctly.

**`sips --cropOffset` crops from the centre, not the top-left.** This silently misframed the OG image several times before I caught it by painting a registration ring into the render and locating it in the output. `tools/build-og.py` now does a real top-left crop with a box-average downscale, dependency-free, and the process is documented in the README.

<od-next key="d1d1dba89c8a8d58" value="Add a slow-motion replay that auto-triggers at each exchange"/>
<od-next key="d1d1dba89c8a8d58" value="Show a trailing path behind each runner marking distance covered this leg"/>
<od-next key="d1d1dba89c8a8d58" value="Publish it behind a stable IPNS name so the URL survives updates"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 38236301-311b-4f9f-b9c6-e40cb938305f
- Captured: 2026-09-22T11:57:33.483502Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- .github/workflows/docker-image.yml
- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/model-preflight.json
- .kbd-orchestrator/phases/upstream-fixes-and-skill-integration/progress.json
- .kbd-orchestrator/project.json
- .kbd-orchestrator/current-waypoint.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
- .kimi-code/
- .prometheus/project.json
- openspec/changes/publish-fork-container-image/
- openspec/config.yaml
