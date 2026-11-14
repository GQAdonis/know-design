---
type: SessionRecord
id: karpathy-session-867eaec967d13351
title: Karpathy session 867eaec967d1
tags:
- karpathy
- session-learning
sources:
- session:dbe9b88d-81c3-442a-8499-40c740a50f53
timestamp: 2026-10-02T13:42:39.605933+00:00
created_at: 2026-10-02T13:42:39.605933+00:00
updated_at: 2026-10-02T13:42:39.605933+00:00
revision: 0
---

## Delta

<od-done key="a67cb53f1ed42c11"/>

The prototype now has the right-side Files and evidence panel and a state indicator on every case row, and there is a new storyboard page that shows each sidebar click with the screen it produces. Nothing has been opened or run, so treat the first open as the first test.

## Where to look first

Open `patient-chat-storyboard.html`. It has nine steps, each naming one click and showing the result as a live frame of the real prototype at desktop size, scaled to fit your pane. Steps 1 to 6 cover the left navigation; 7 to 9 cover the Files panel and the phone layout.

I built it this way on a guess: if your preview is narrower than 768px, the sidebar has been a drawer behind the top-left button, which would explain why you had not seen the case list. If instead clicks do nothing in the prototype itself, tell me, because that is a different fault.

## Left navigation

- **Cases visible on load:** the patient with the nearest deadline (Marcus Delgado) starts expanded.
- **Sturdier clicks:** navigation runs from in-memory state, so it no longer depends on the address bar or on default link behavior inside a sandboxed preview.

## Case state indicator

Each case row has a second line: a track of eight blocks plus the state's name. The states and their order come from `case_statuses` in your `schema.sql`.

- **Reading it:** filled blocks are stages passed, the wide ember block is the current stage, and Approved or Denied adds an icon.
- **Live:** Renata Kaminski's fusion case moves from Policy review through to Submitted as you work it. The other cases sit at fixed states.
- **Also shown:** in the strip under the top bar, the Due next list and the patient page.

## Files and evidence panel

A Files control with an item count appears in the top bar whenever a patient or case is in context.

- **Case context:** generated records (surgeon statement, staff request, gate record, letter, packet, receipt), evidence by criterion with its state and sources, other chart documents, and unfiled items.
- **Patient context:** generated records grouped by case, then the whole chart.
- **Opening an item:** it shows in the viewer in the same place, with a Files button to go back. The X closes both the viewer and the panel.
- **Layout:** at 1100px and wider it docks beside the chat, between 768px and 1099px it overlays from the right, and on phones it is a bottom sheet.

## What to know

- **What opens:** chart documents everywhere, plus the letter and surgeon statement on the Kaminski case. Generated records on the other cases are listed but have no content to open.
- **Signing from the panel:** if you sign the letter before sending any message, the prototype starts a conversation called "Letter v1 signed" to hold the packet.
- **No closing animation:** the panel slides in but closes instantly.
- **Phone pattern:** the bottom sheet is my design; the sources I found describe the desktop panes only.
- **Storyboard weight:** it loads ten live copies of the prototype, so it opens more slowly.

`index.html` and `consult-capture-htmx.html` are untouched.

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

<od-next key="a67cb53f1ed42c11" value="Keep the sidebar visible down to 600px so the case list shows in a narrow preview pane"/>
<od-next key="a67cb53f1ed42c11" value="Make the packet and receipt in the Files panel openable, showing their contents in the viewer"/>
<od-next key="a67cb53f1ed42c11" value="Add a storyboard for the Kaminski case flow showing the state indicator advancing at each step"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: dbe9b88d-81c3-442a-8499-40c740a50f53
- Captured: 2026-10-02T13:42:19.015548Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
