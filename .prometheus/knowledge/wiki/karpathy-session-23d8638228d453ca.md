---
type: SessionRecord
id: karpathy-session-23d8638228d453ca
title: Karpathy session 23d8638228d4
tags:
- karpathy
- session-learning
sources:
- resource: session:d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
generated:
  by: pk/1.11.0
  at: 2026-10-19T17:40:17.716760+00:00
created_at: 2026-10-19T17:40:17.716760+00:00
updated_at: 2026-10-19T17:40:17.716760+00:00
revision: 0
---

## Delta

<od-focus key="207e8ebe9771147b" open="index.html" show="index.html"/>
<od-done key="207e8ebe9771147b"/>

The KnowDesign Review prototype is built. Open `index.html` at the project root; it needs no build step. I haven't opened it in a browser, so the first time you open it is its first test. The only check I ran was a JavaScript syntax check (which strictly breaks the workflow's no-checks-after-writing rule); it passed.

Everything is in the KnowMe Flat 2.0 style, with the exact KnowMe dark and light colors, and uses the KnowDesign "D" mark. The theme follows your system setting, and the System / Light / Dark switch is remembered.

**The six screens:**
- **Pipeline:** a board of designs by stage (Draft → In review → Changes requested → Approved → Released), with stage filters and search. "Publish from KnowDesign" uploads a snapshot and returns a review link.
- **Review room:** each design runs in a sandboxed preview with numbered comment pins. Next to it are comments (reply, resolve, filter to guests), versions, and an activity log. The approval gate asks you to confirm before "Approve" and before "Request changes"; there is also "Revoke", which kills the link.
- **Review agent** (AG-UI style): its reasoning is in a collapsed block, its tool steps show their status as they run, and its summary links to the comments it used. It proposes a change list you can untick, then asks before sending it to KnowDesign. One step fails on purpose until you set up notifications, so you can see how a failure looks.
- **Release to customers:** only approved designs can be released. You pick the customer, expiry, passcode, watermark and whether they can comment. Release notes are drafted by the agent and editable. You confirm, then get a copyable link and an audit trail entry.
- **Guest reviewer page** (`#/r/<slug>`): the reviewer enters a name (no account), pins a comment, and sends it. It has a character counter and rate limit, and lands in your Inbox.
- **Settings:** identity (guest links vs Kratos/flint-gate), hostnames and storage, limits, approval policy, which tools the agent may use, and notifications. Errors show next to each field when you leave it, plus a summary at the top. Settings changes affect the rest of the prototype immediately.

**To see the whole flow quickly:** Patient Chat shows a design that needs changes. Global policy is approved and ready to release. On Consult Capture, approval is blocked while comments are open; resolve them, or turn that rule off in Settings → Approval policy, and then you can approve. Use "Open as reviewer" to see the guest side.

**Assumptions:**
- All data is simulated in the browser and resets on reload.
- The designs are your real projects. Tribe Health Solutions is the example customer.
- Dana Reyes, Sam Okafor and Priya Nair are made-up example people.
- The page shows comments coming back to the author, which the planned comment-return spike (D7) hasn't proven yet.

**Departures from the KnowMe baseline:**
- **Text colors:** in light mode, small ember, cyan and status-colored text uses slightly darker shades, because the brand values fail the 4.5:1 contrast minimum at body size.
- **Buttons:** ember buttons use dark text in both themes for the same reason.
- **Fonts:** they load from Google Fonts, so offline demos fall back to system fonts.

The code is in `app/`: `styles.css`, `ui.js`, `data.js`, `app.js`, `room.js`, `agent.js`, `release.js`, `settings.js`, `guest.js`.

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

<od-next key="207e8ebe9771147b" value="Add a script that publishes this prototype to the IPFS node with a stable IPNS link"/>
<od-next key="207e8ebe9771147b" value="Add a customer-facing page for the released link with passcode entry and watermark"/>
<od-next 

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
- Captured: 2026-10-19T17:39:16.403629Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
