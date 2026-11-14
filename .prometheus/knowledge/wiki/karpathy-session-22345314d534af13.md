---
type: SessionRecord
id: karpathy-session-22345314d534af13
title: Karpathy session 22345314d534
tags:
- karpathy
- session-learning
sources:
- session:dbe9b88d-81c3-442a-8499-40c740a50f53
timestamp: 2026-10-02T14:50:52.228212+00:00
created_at: 2026-10-02T14:50:52.228212+00:00
updated_at: 2026-10-02T14:50:52.228212+00:00
revision: 0
---

## Delta

<od-focus key="8f39a9397d7b0fec" open="patient-chat-og.png" show="patient-chat-og.png, patient-chat-storyboard.html, publish-ipfs.sh"/>

<od-done key="8f39a9397d7b0fec"/>

The index page now has a link-preview image, and it is live at the same address:

**https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dltw9o2136sbfbw34e1vjvdgl12jvt09n10t9z0dr9gd6q4abf4/**

I took "home page" to mean the prototype's home screen, since you named the index page separately. If you wanted the guide page itself in the preview, say so and I'll swap it.

- **The image:** `patient-chat-og.png`, 1200×630, light theme. It shows "Which case first, Dr. James?", the chat box, the Due next list and the sidebar with Marcus Delgado's case open.
- **The tags:** the guide page (`patient-chat-storyboard.html`, published as the index) now carries the OpenGraph image tags with size and alt text, plus the matching Twitter large-image card tags.
- **Publishing:** `publish-ipfs.sh` now includes the image and points the preview tags at the image's own fixed address, so a changed image shows up in new previews. I re-ran it, and the live index page serves the new tags and the image responds.

Two things to know:

- **Not tested in a messaging app:** I have not pasted the link into Slack, iMessage or similar. Apps that already previewed the link may show the old imageless card until their cache expires.
- **Sidebar footer is cropped:** at 630px tall the "Surgeon" line under Dr. K. James sits at the bottom edge of the image.

The capture was the first time the prototype's home screen was rendered. It drew as intended, but that covers only that one screen.

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

<od-next key="8f39a9397d7b0fec" value="Use a screenshot of the guide page as the preview image instead"/>
<od-next key="8f39a9397d7b0fec" value="Add the same preview image and tags to patient-chat.html and republish"/>
<od-next key="8f39a9397d7b0fec" value="Retake the preview image with a case open and the Files panel showing"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: dbe9b88d-81c3-442a-8499-40c740a50f53
- Captured: 2026-10-02T14:50:05.283495Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
