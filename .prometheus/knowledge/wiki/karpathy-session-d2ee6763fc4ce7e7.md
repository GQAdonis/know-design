---
type: SessionRecord
id: karpathy-session-d2ee6763fc4ce7e7
title: Karpathy session d2ee6763fc4c
tags:
- karpathy
- session-learning
sources:
- resource: session:d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
generated:
  by: pk/1.11.0
  at: 2026-10-19T23:54:33.305528+00:00
created_at: 2026-10-19T23:54:33.305528+00:00
updated_at: 2026-10-19T23:54:33.305528+00:00
revision: 0
---

## Delta

<od-focus key="44077f839e3cce47" open="storyboard.html" show="storyboard.html"/>
<od-done key="44077f839e3cce47"/>

`storyboard.html` now has two new flows, each reachable from the top navigation. I haven't opened the page.

- **Flow 7: Projects, create and manage.** Six steps:
  - Starting a project (blank, template or import).
  - Settings.
  - Access.
  - Rename, duplicate or move.
  - Archive and restore.
  - Delete with the type-the-name confirmation, plus the no-access page.
- **Flow 8: Customer links.** This picks up where Flow 3 leaves off, once a release has gone out. Six steps:
  - Opening a link's details.
  - Extend or revoke.
  - Release again.
  - The customer entering the passcode (demo passcode `bench-2026`).
  - The customer reviewing and commenting.
  - What the customer sees on an expired or revoked link.

Each step uses the same layout as the earlier flows: a small sketch of the screen, what you do, the server request behind it, and a link to that screen in `index.html`. Customer-side links open in a new tab, the way a customer would arrive. Each flow ends with a link to its section of `screens.html`.

Two parts of these flows are proposals rather than existing server features:
- **Project access:** shown as a proposed route, because upstream Open Design only shares projects with a whole workspace.
- **Release and customer-link routes:** these hub routes aren't written yet either.

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

<od-next key="44077f839e3cce47" value="Add the proposed project access and release routes to server-interfaces.md"/>
<od-next key="44077f839e3cce47" value="Add a Studio watch-a-teammate flow to storyboard.html"/>
<od-next key="44077f839e3cce47" value="Write a publish script that bundles index.html, screens.html and storyboard.html for sharing"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
- Captured: 2026-10-19T23:48:36.298786Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
