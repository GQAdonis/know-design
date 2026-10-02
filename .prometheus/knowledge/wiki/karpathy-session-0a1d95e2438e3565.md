---
type: SessionRecord
id: karpathy-session-0a1d95e2438e3565
title: Karpathy session 0a1d95e2438e
tags:
- karpathy
- session-learning
sources:
- session:cd5ab2b1-84ee-4348-a688-04178722da76
timestamp: 2026-09-24T11:45:07.832462+00:00
created_at: 2026-09-24T11:45:07.832462+00:00
updated_at: 2026-09-24T11:45:07.832462+00:00
revision: 0
---

## Delta

<od-focus key="7b23c0ce84157060" open="consult-capture-htmx.html" show="consult-capture-htmx.html"/>
<od-done key="7b23c0ce84157060"/>
The page now has a permanent IPNS link. Share this one from now on:

**https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dkaspanc9zhe05rev8fs7w54vg5sqpr71uxfbn3fcl02odrbwep/**

Your node confirmed that the name points to the latest upload (`bafybeif66f72eieuzaax7wnfeziy6dbxuptwueexrwzhkzv45lhltsddpu`), and the IPNS link loads as a web page.

**What changed:**
- **New IPNS key.** I created a key named `consult-capture` on your node, following the pattern of your `gomark-relay-lab` and `prince-live` keys. The link above is built from it.
- **The page now carries its own permanent address.** I added `og:url` and a canonical link to `consult-capture-htmx.html`, both set to the IPNS address. When the page is shared, preview cards will point to the permanent link instead of the old one.
- **Rebuilt, uploaded and published.** The rebuilt page is pinned on your node. Its IPNS record lasts a year and tells browsers and caches to check again after 5 minutes.

The preview image is unchanged. Copies of the page opened from the old `/ipfs/bafybeicoaae…` link stay as they were and don't get the new tags.

**To publish an update:** rebuild the file, upload it, then point the name at the new upload. The link stays the same:

```sh
curl -X POST "https://ipfs.prometheusags.ai/api/v0/name/publish?arg=/ipfs/<new-dir-CID>&key=consult-capture&lifetime=8760h&ttl=5m"
```

**Two things to know:**
- **Your node's write API is open to the public.** Your gateway config exposes `/api` publicly, and every upload, the key creation and the publish above worked without any credentials. Anyone who finds the address can pin files to your node, create keys, or point your IPNS names at other content, including the three links you share. Put authentication in front of `/api/v0`, or stop exposing it publicly. Kubo has a built-in setting for this (`API.Authorizations`), or you can use a reverse proxy that requires a login.
- **The first visit after an update can be slow.** Your node is the only server that has published this name, so other IPFS gateways and preview crawlers may take a moment to find the new version. Your own gateway picks it up right away.

<od-next key="7b23c0ce84157060" value="Put authentication in front of the IPFS node's /api/v0 so only I can publish"/>
<od-next key="7b23c0ce84157060" value="Move the build script into the project and add a one-command rebuild, upload and IPNS publish"/>
<od-next key="7b23c0ce84157060" value="Retake the preview screenshot mid-consult and republish it under the same IPNS name"/>

<open-design-runtime-state>
{
  "executionIntent": "produce",
  "executionMode": "simple",
  "inputStage": "request",
  "outcome": "completed",
  "reasonCodes": [],
  "route": "direct_edit",
  "schema": "open-design.strategy-state/v2"
}
</open-design-runtime-state>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: cd5ab2b1-84ee-4348-a688-04178722da76
- Captured: 2026-09-24T11:41:59.881799Z
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
