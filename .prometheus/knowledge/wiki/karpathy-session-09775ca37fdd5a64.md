---
type: SessionRecord
id: karpathy-session-09775ca37fdd5a64
title: Karpathy session 09775ca37fdd
tags:
- karpathy
- session-learning
sources:
- resource: session:5acda4f9-cfd5-4403-9e0e-2693531a3f4a
generated:
  by: pk/1.11.0
  at: 2026-11-14T18:32:02.654727+00:00
created_at: 2026-11-14T18:32:02.654727+00:00
updated_at: 2026-11-14T18:32:02.654727+00:00
revision: 0
---

## Delta

MOCK-1 now passes, but only after fixing a real bug it found: in the packaged app's preview, every htmx prototype showed an empty list. Every scenario in the phase now passes. The phase still won't close, because of the repair budget.

**The bug:** the desktop app shows previews as a `blob:` document, while the web app uses `about:srcdoc`. `od-mock` only rewrote request paths into absolute URLs in the `about:` case. In a `blob:` document, htmx's `new URL('/api/books', <blob URL>)` threw, so no request ever reached the mock. The renderer log recorded the error, and the TPL-1 agent's own preview thumbnail showed the same empty list.

**The fix:** in [od-mock.ts](design-templates/htmx-alpine-prototype/src/od-mock.ts), `od-mock` now rewrites paths in any document that isn't plain http(s).
- A new test failed for `blob:` and `data:` before the change and passes after; all 17 od-mock tests pass.
- I rebuilt `od-mock.js` and updated its hash in MANIFEST.json.
- `pnpm guard` and the web typecheck pass.

**MOCK-1 in the real preview:** I put the rebuilt file into the TPL-1 project and reloaded it in the app. Then I used real clicks and typing inside the sandboxed preview frame:
- The list loads.
- An empty title shows the validation error.
- Adding a book updates the count from 4 to 5.
- Editing a title saves in place.
- Deleting after the "Delete this book?" confirmation removes the row and the count goes back to 4.

No request to the mocked routes appears in the app, web or daemon logs. Screenshots are in the phase's `review/boundary-2026-11-14/mock1/` folder.

**Still worth knowing:**
- **Existing projects keep the broken copy.** Projects generated before this fix have the old `vendor/od-mock.js` and will still show an empty list in the desktop app until that file is replaced. New projects get the fixed file once the app is rebuilt from this branch. The packaged build I tested still bundles the old copy, because I didn't do a second build.
- **Autofocus doesn't work in the preview.** Chromium blocks autofocus inside the preview frame, so the page's "focus the title after adding" step doesn't happen there. It's harmless.
- **External-browser limitation unchanged.** The web UI opened in an external browser against a local daemon still can't load these scripts, as before.

**Why the phase stays open:** the contract caps repair attempts at 3. This fix is the fourth, so the close check refuses with `repairAttempts 4 > 3`. I recorded the true count rather than adjust it. The evidence and the fix are pushed to [GQAdonis/know-design#5](https://github.com/GQAdonis/know-design/pull/5), where Auto-fix is watching CI.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 5acda4f9-cfd5-4403-9e0e-2693531a3f4a
- Captured: 2026-11-14T18:31:57.186508Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
