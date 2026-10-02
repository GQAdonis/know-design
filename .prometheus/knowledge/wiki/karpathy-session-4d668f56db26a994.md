---
type: SessionRecord
id: karpathy-session-4d668f56db26a994
title: Karpathy session 4d668f56db26
tags:
- karpathy
- session-learning
sources:
- session:cd5ab2b1-84ee-4348-a688-04178722da76
timestamp: 2026-09-24T10:57:51.816961+00:00
created_at: 2026-09-24T10:57:51.816961+00:00
updated_at: 2026-09-24T10:57:51.816961+00:00
revision: 0
---

## Delta

<od-focus key="0b212998525acfdd" open="screens/consult-capture.html" show="screens/consult-capture.html"/>
<od-done key="0b212998525acfdd"/>
The consult capture prototype is in `screens/consult-capture.html`. It shows the phone and the laptop side by side, both working from the same session. I haven't opened it in a browser or tested it.

**How to use it:**
1. **Today's consults.** Pick how to record (Omi pendant or the phone's mic) and a mode (Conversation or Dictation).
2. **Consent.** Recording consent is required and its time is logged when recording starts. Consent to use the session for training is a separate, optional checkbox. "Patient declined" records nothing, and the laptop's prepared questions become a paper checklist.
3. **Live.** The transcript fills in as the consult plays. In Conversation mode the coach suggests one question at a time, taken from your agent's system prompt. For example: *"Chart shows 5/10 on 2026-07-22. §4.1(a) requires more than 5. What does she rate the pain today?"* When Renata answers "seven", that criterion changes from GAP to PENDING (waiting for the surgeon to confirm), with a link to her line at 00:27.
   - Her report of PT at Northgate keeps that criterion at GAP, marked "records requested". Saying it doesn't count as documentation.
   - Her new left calf symptoms are flagged as needing clinical clarification, because the plan is a right-sided operation.
   - Each device has a "Screen faces patient" switch that hides all coaching. The phone then shows only that recording is happening.
4. **Review.** Accept or reject each finding on either device; you can also edit the wording on the laptop. The draft note is built only from findings you accepted or edited. The raw transcript is locked and has a fingerprint (a code that shows it hasn't changed).
5. **Readiness and training record.**
   - **Case readiness** follows your agent's response format: CASE, CRITERIA STATUS, CONFLICTS, BLOCKERS, NEXT MOVE. It ends with AUTH NOT READY and gives no approval probability.
   - **Training record** stores each finding as heard → what the agent proposed → what the surgeon decided. It is marked as pending de-identification and shows whether the patient consented to training use.

**What to know:**
- The consult is a scripted simulation of the synthetic Kaminski case (PA-2026-0431, BCBS TX SURG-2026-014 rev. 4) and plays at 4× speed. No microphone or speech-to-text is used, and the page says so.
- In Dictation mode, findings are attributed to "Surgeon dictation", not to the patient directly, and the coach never interrupts.
- The fingerprint uses a simple prototype method. The real app would use SHA-256 in the Rust core.
- The §4.1(a)–(d) numbers are made up for this synthetic policy. §4.2(c) matches the existing intake checklist.
- The styles come from the existing ASO design system. The page isn't linked from the sitemap or the workbench navigation yet.
- The code is split into four files: the page, a stylesheet, `consult-sim.js` (the scripted session, kept separate from the display) and `consult-ui.js` (the screens).

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

<od-next key="0b212998525acfdd" value="Add the consult capture screen to the sitemap and the workbench navigation"/>
<od-next key="0b212998525acfdd" value="Add a surgeon exam step that confirms or rejects each pending criterion before the note is signed"/>
<od-next key="0b212998525acfdd" value="Show the phone-to-laptop pairing flow with a QR code and what happens when the link drops"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: cd5ab2b1-84ee-4348-a688-04178722da76
- Captured: 2026-09-24T10:57:11.934797Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
