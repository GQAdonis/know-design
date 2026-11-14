---
type: SessionRecord
id: karpathy-session-066486a73bc0cbeb
title: Karpathy session 066486a73bc0
tags:
- karpathy
- session-learning
sources:
- resource: session:5acda4f9-cfd5-4403-9e0e-2693531a3f4a
generated:
  by: pk/1.11.0
  at: 2026-11-14T18:08:20.357132+00:00
created_at: 2026-11-14T18:08:20.357132+00:00
updated_at: 2026-11-14T18:08:20.357132+00:00
revision: 0
---

## Delta

TPL-1 passes. I created a project from the htmx-alpine-prototype template in the packaged KnowDesign app and ran a generation with Claude Code. It produced a working prototype that also runs on IPFS.

**How the run went:** OD Next writes a plan and waits for approval before building, which is the normal behaviour in the app. So there were two turns: the plan, then the build after I replied "go ahead". I created the project with `od project create --skill htmx-alpine-prototype`, which sends the same request as picking the template in New project → Start from.

**What it produced:**
- `index.html` with 9 route templates, including the empty-title error cases, and 15 component roots.
- A `vendor/` folder with every file listed in the template's manifest, identical to the template's copies.
- `od-prototype.json` with 7 routes, 7 components, 2 state entries, a `books` entity and design tokens. It passes the validator.

**Does it work:** yes, both from the daemon and on the gateway:
- adding a book, with the error when the title is empty;
- marking read and unread;
- editing a title, with its own empty-title error;
- deleting after the inline "Delete this book?" confirmation;
- the All / Unread / Read filter;
- the book count.

On IPFS the page loaded only its own vendored files:
- Gateway: https://ipfs.prometheusags.ai/ipfs/bafybeihzx5l4iikwlgiunqhi3pd2wgak5ejejdskwa2qijbrwlhg4fbmye/
- IPNS: https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5djkvf1yn2bk5dwthk2zrq6e9koom2nn7jbki70gtlgdi47j56rj/
- Every asset returned 200, and the deploy raised no warning that the HTML and manifest disagree.

**Two things I found:**
- **The `vendor/` folder is hidden in the file panel.** The daemon's ignore list in `apps/daemon/src/project-ignored-dirs.ts` includes `vendor`, so users won't see the runtime files in the project's file tree. The preview and deploy still serve them correctly.
- **New books go to the bottom of the list,** not the top as the agent's plan said.

**Not done:** the scenario's negative check (a generation without the template produces none of these files) wasn't run as a separate generation.

**Where things stand:** the evidence is committed and pushed to [GQAdonis/know-design#5](https://github.com/GQAdonis/know-design/pull/5). The phase close check now blocks only on MOCK-1, the full flow inside the app's real preview frame.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 5acda4f9-cfd5-4403-9e0e-2693531a3f4a
- Captured: 2026-11-14T18:02:17.177122Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
