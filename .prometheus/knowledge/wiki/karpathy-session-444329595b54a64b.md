---
type: SessionRecord
id: karpathy-session-444329595b54a64b
title: Karpathy session 444329595b54
tags:
- karpathy
- session-learning
sources:
- session:38236301-311b-4f9f-b9c6-e40cb938305f
timestamp: 2026-09-22T13:12:20.480764+00:00
created_at: 2026-09-22T13:12:20.480764+00:00
updated_at: 2026-09-22T13:12:20.480764+00:00
revision: 0
---

## Delta

<od-focus key="4e814343d8fb797b" open="relay-lab.html" show="relay-lab.html, README.md"/>

<od-done key="4e814343d8fb797b"/>

## Permanent URL

```
https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dle7iwdddfzusoti8g4lgp8pc19tg2633d6h705u3k2jmiig00e/
```

This link never changes. Publishing a new build moves the name to a new CID; anything you've already shared follows it.

## This also fixed the OG problem properly

Last turn I worked around a genuine fixed point: `og:image` needed an absolute URL, but a CID is a hash of the bytes the tag lives in, so writing the CID in changes it. I resolved it by pointing at a prior CID — correct, but a workaround.

An IPNS name dissolves the circularity outright, because it's **stable and known before the content is added**. The tags now reference the same name that serves them, so `og:url` and `og:image` are genuinely self-referential (verified resolving, 200 / `image/png`). Previews also re-fetch the current build now instead of pinning to an old snapshot.

`tools/set-og-url.py` existed only for the two-pass workaround, so I removed it.

## Updating

```
./tools/publish.sh
```

It stages the shipped files (excluding `tools/`, `tests/`, `_og-source.html`), adds the directory, moves the name, and then **checks the name actually resolves to the new CID** before reporting success — a 200 from `name/publish` isn't proof a later read returns the new value.

I proved the update path rather than assuming it: added a footer line naming the permanent address, republished, and confirmed the unchanged URL served the new build while the name moved to the new CID. All 25 paths return 200 over `/ipns/`; 56 tests, 14 smoke and 13 mobile checks still pass.

## Three things worth knowing

**Old links don't break.** Content addressing is permanent — previously shared `/ipfs/<cid>` links still serve their exact snapshot. I verified the earlier CID is still reachable.

**Records expire.** Published with a one-year lifetime. Re-running the script refreshes it; if the name ever stops resolving after a long idle period, republishing is the fix.

**The key can't be backed up from here.** The name is derived from a `gomark-relay-lab` keypair on the node, and whoever holds it controls the name. I tried to export a backup and `/api/v0/key/export` returns 404 — it's disabled on this node, so durability rests on the node's own backups. If the key is lost the name can never be updated again and you'd need to issue a new one. Worth knowing before treating this as permanent infrastructure; I've documented it rather than leaving it implied.

<od-next key="4e814343d8fb797b" value="Point a DNSLink record at the IPNS name so the URL becomes a plain domain"/>
<od-next key="4e814343d8fb797b" value="Add a build stamp in the footer showing which CID is currently served"/>
<od-next key="4e814343d8fb797b" value="Add a slow-motion replay that auto-triggers at each exchange"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 38236301-311b-4f9f-b9c6-e40cb938305f
- Captured: 2026-09-22T13:06:31.843580Z
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
