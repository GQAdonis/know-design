---
type: SessionRecord
id: karpathy-session-f0af7141ce71960a
title: Karpathy session f0af7141ce71
tags:
- karpathy
- session-learning
sources:
- session:cd5ab2b1-84ee-4348-a688-04178722da76
timestamp: 2026-09-24T11:41:16.647104+00:00
created_at: 2026-09-24T11:41:16.647104+00:00
updated_at: 2026-09-24T11:41:16.647104+00:00
revision: 0
---

## Delta

<od-focus key="13fd3a98566d2cdd" open="consult-capture-htmx.html" show="consult-capture-htmx.html"/>
<od-done key="13fd3a98566d2cdd"/>
The HTMX version of the prototype is on your IPFS node:

**https://ipfs.prometheusags.ai/ipfs/bafybeicoaae2f3zob4qe3clw7viy6cngb4ufztjgpk7r6cafoe2omrpcxy/**

The preview image is at https://ipfs.prometheusags.ai/ipfs/bafybeiaobkkoygzatr6fieu6mx3u4r7stfoaj2fmz7wwzjkotluv2ydmp4/consult-capture-og.png. The page's OpenGraph and Twitter tags point to it, so a shared link should show that image. Both files are pinned, and the gateway returned the page as `text/html` and the image as `image/png`.

I haven't opened the uploaded page in a browser or clicked through the flow.

**What's in the file (`consult-capture-htmx.html`, project root):**
- **HTMX 2.0.8** changes every screen: the phone's steps and the laptop's review tabs. Each screen is stored inside the page, and a small extension (`local-tpl`) hands it to HTMX, so no server is needed. That extension also blocks any request to an address outside the page.
- **Alpine.js 3.17.4** holds the session state: the clock, consent, the privacy switches and the accept/edit/reject decisions.
- **One official HTMX extension, `alpine-morph`,** runs the screen swaps and keeps Alpine's state through them. I left out the others, such as sse, ws and preload, because they need a live server.
- Libraries load from jsDelivr at pinned versions with integrity hashes. The styles and the session engine are written into the file, so the IPFS copy doesn't depend on any other project file. The Google Fonts link still loads from Google.

**Phone vs desktop:**
- At 820 px wide and below, you see only the phone app, full screen, with no handset frame, laptop or page header.
- Wider screens show the phone and laptop together. They sit side by side above 1240 px and stack between 820 and 1240 px.

**Things to know:**
- **The preview shows the start of the demo:** today's consults on the phone and the chart pre-read on the laptop. It doesn't show a consult in progress.
- **Link unfurlers only see one server.** Your node is the only gateway serving these files, so if a service like Slack or iMessage times out fetching it, the preview may not appear the first time.
- **The files are public.** Anyone with a link can open them, which is fine here because the case data is synthetic.
- **The upload is fixed.** Editing the file locally creates a new address, and the current link keeps showing this version. To publish changes, rebuild and upload again, then share the new link.
- **The build script isn't in the project.** It's in `/tmp/cchx/build.mjs` and rebuilds the file from `screens/consult-capture.css`, `screens/consult-sim.js` and `assets/aso.css`. The OG screenshot is also in the project as `consult-capture-og.png`.

<open-design-runtime-state>
{
  "executionMode": "simple",
  "inputStage": "production",
  "outcome": "completed",
  "reasonCodes": [],
  "route": "full_plan",
  "schema": "open-design.strategy-state/v2"
}
</open-design-runtime-state>

<od-next key="13fd3a98566d2cdd" value="Move the build script into the project so I can rebuild and re-upload the HTMX file myself"/>
<od-next key="13fd3a98566d2cdd" value="Retake the preview screenshot mid-consult with the coach card and criteria changes showing, then re-upload"/>
<od-next key="13fd3a98566d2cdd" value="Publish the page under an IPNS name so the shared link stays the same across updates"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: cd5ab2b1-84ee-4348-a688-04178722da76
- Captured: 2026-09-24T11:38:11.553580Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
