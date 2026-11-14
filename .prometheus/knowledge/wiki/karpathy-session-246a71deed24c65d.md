---
type: SessionRecord
id: karpathy-session-246a71deed24c65d
title: Karpathy session 246a71deed24
tags:
- karpathy
- session-learning
sources:
- session:dbe9b88d-81c3-442a-8499-40c740a50f53
timestamp: 2026-10-02T14:23:43.818530+00:00
created_at: 2026-10-02T14:23:43.818530+00:00
updated_at: 2026-10-02T14:23:43.818530+00:00
revision: 0
---

## Delta

<od-focus key="67d8bec1638aecf5" open="patient-chat-storyboard.html" show="patient-chat-storyboard.html, patient-chat.html, publish-ipfs.sh"/>

<od-done key="67d8bec1638aecf5"/>

The guide and the prototype are published, and every case in the prototype can now be worked. The stable link to the index page is:

**https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dltw9o2136sbfbw34e1vjvdgl12jvt09n10t9z0dr9gd6q4abf4/**

I confirmed that the index page, the prototype and its scripts respond at that address. I have not opened or clicked through any of it in a browser, on desktop or phone, so your first open is the first real test. The scripts were only parsed for syntax.

## Updating later

Run `./publish-ipfs.sh` in the project folder. It uploads a new copy and repoints the same IPNS name (`pa-workbench-chat`), so the link above stays the same.

## The guide page

- **"Open the prototype":** it now opens the full prototype in the same window, and the prototype has a Guide link in its sidebar to come back.
- **Seven cases to work:** each row names the case, its state, what to do, and opens straight into it.
- **On phones:** one column, full-width buttons, and each frame shows the prototype's phone layout at phone size. On a phone the frames are previews only; the button under each opens that screen.

## What each case does now

| Case | State | What you can do |
|---|---|---|
| Kaminski fusion | Policy review | The earlier flow, through to the receipt |
| Delgado ACDF | Awaiting surgeon | Affirm gates, read the cited letter, sign, submit |
| Brennan microdiscectomy | Peer-to-peer | Talking points with sources, one question, a brief, then record the call outcome |
| Vasquez laminectomy | Evidence assembly | Attach the outside MRI, answer the prior-care question |
| Raman arthroplasty | Submitted | Check payer status, open the receipt, attach the determination letter |
| Kaminski injection | Approved | Open the letter, packet, receipt, gate record and determination |
| New case | Intake | Name the procedure, confirm the payer policy, see which chart documents carry over |

- **Records:** every generated record opens in the viewer on every case, and the Files panel also lists the governing policy.
- **Agent feedback:** every answer ends with suggested next prompts that follow the case's state. A request that needs a case ("Draft the letter" from the home screen) gets a pick list, and your request carries into the case you choose.
- **State changes:** when a case moves along the track, the chat says so where it happened.

## What to know before showing it

- **Still scripted:** the flows are deterministic. Free typing outside them falls back to search, or to "I need more to go on" with suggestions.
- **Vasquez stalls on purpose:** the chart has no conservative care, so the assistant offers two paths and will not mark the criterion met.
- **Appeals and second letter versions:** the assistant lists what an appeal needs but does not draft one.
- **New cases:** the policy is matched on the payer alone, and a new case with missing documents stays in Evidence assembly because there is nothing to attach.
- **Nothing is saved:** reloading starts every case over.
- **Open write access:** your node accepted the upload, key creation and publish with no credentials, so anyone else can do the same.
- **Fonts:** they load from Google Fonts.

`index.html` and `consult-capture-htmx.html` are untouched. Three script files are new in `patient-chat/`: `data-docs.js`, `flows.js` and `records.js`.

<open-design-runtime-state>
{
  "executionIntent": "produce",
  "executionMode": "simple",
  "inputStage": "production",
  "outcome": "completed",
  "reasonCodes": [],
  "route": "full_plan",
  "schema": "open-design.strategy-state/v2"
}
</open-design-runtime-state>

<od-next key="67d8bec1638aecf5" value="Add an appeal letter flow to the Brennan case after a denial is upheld"/>
<od-next key="67d8bec1638aecf5" value="Add a link preview image to the guide page and repu

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: dbe9b88d-81c3-442a-8499-40c740a50f53
- Captured: 2026-10-02T14:23:22.746284Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
