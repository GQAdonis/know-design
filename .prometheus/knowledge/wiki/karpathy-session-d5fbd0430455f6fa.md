---
type: SessionRecord
id: karpathy-session-d5fbd0430455f6fa
title: Karpathy session d5fbd0430455
tags:
- karpathy
- session-learning
sources:
- session:dbe9b88d-81c3-442a-8499-40c740a50f53
timestamp: 2026-10-02T11:39:09.531061+00:00
created_at: 2026-10-02T11:39:09.531061+00:00
updated_at: 2026-10-02T11:39:09.531061+00:00
revision: 0
---

## Delta

<od-done key="d612bf3e8d8ebb25"/>

The chat-centric prototype is written as `patient-chat.html`, with its styles and scripts in `patient-chat/`. I have not opened, rendered or run it, so treat the first open as the first test.

## What it is

It is a ChatGPT-shaped workspace in the Advanced Spine & Orthopedics branding, light and dark. Patients sit in the sidebar where Projects would be, and each case is a chat inside its patient. At phone widths the sidebar becomes a drawer and the letter opens full-screen.

## Try this path

1. From home, open **Renata Kaminski** under "Due next". The assistant catches you up live and reports in the CASE / CRITERIA STATUS / CONFLICTS / BLOCKERS / NEXT MOVE format.
2. Answer the one question it asks (left calf versus the right-sided plan). Your answer is recorded as your statement, not as chart evidence.
3. Send the HbA1c request to Maya Ortiz. That criterion stays VOID.
4. Use **+** to attach the Northgate fax. The PT criterion moves from GAP to MET because a document arrived, and the header updates.
5. Ask it to draft the letter. It refuses until you affirm the four gates, which the app draws and only you can tick.
6. The letter opens beside the chat with every claim cited and the HbA1c listed as not asserted. Sign it, then submit the packet and see the receipt.

A patient page shows the chart once for all cases. Starting a new case there carries the existing documents over.

## How AG-UI and A2UI are used

- **AG-UI:** every assistant turn is a timed stream of AG-UI-shaped events (run, step, tool call, streamed text, state change, interrupt). The "Worked for 9s" disclosure shows the steps and tool calls.
- **A2UI:** criteria lists, the coach question, the staff request, queues and document lists are declarative surfaces drawn by an allowlisted renderer. Anything not on the list is refused in place.
- **Surgeon authority:** gates, signing and submission are drawn by the app, outlined in navy. Assistant output is a filled warm-neutral block.

## What to know before showing it

- **Scripted agent:** only PA-2026-0431 runs end to end. Other cases answer status and blockers, and other typed input gets a plain "this prototype can answer…" reply.
- **Protocol shapes:** the event and surface formats follow AG-UI and A2UI as I know them, not your pinned package versions.
- **Submission by the surgeon:** I let Dr. James submit the packet himself so the flow reaches a receipt. If only coordinators submit in the real product, that button should become a hand-off to Maya.
- **Composer shape:** the composer and your message bubbles use ChatGPT's large rounded shape. That is the one departure from the 5px/8px brand radius.
- **Dictation:** the microphone uses the browser's own speech recognition where it exists and says so where it does not.
- **Fonts:** they load from Google Fonts, as in the existing prototype, so offline it falls back to system faces.
- **Impeccable:** I applied its guidance by hand; its detector and finish review were not run.
- **Existing files:** nothing existing was changed, including `index.html` and `consult-capture-htmx.html`. The + menu in the Kaminski case links to the consult capture prototype.

All data is synthetic.

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

<od-next key="d612bf3e8d8ebb25" value="Add a coordinator view for Maya Ortiz with her request inbox and the submission hand-off"/>
<od-next key="d612bf3e8d8ebb25" value="Script the Odalys Brennan peer-to-peer case end to end with talking points drawn from the cited criteria"/>
<od-next key="d612bf3e8d8ebb25" value="Bundle patient-chat into one self-contained HTML file so it can be published to the IPFS node"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: dbe9b88d-81c3-442a-8499-40c740a50f53
- Captured: 2026-10-02T11:18:54.923865Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
