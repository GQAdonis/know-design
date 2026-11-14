---
type: SessionRecord
id: karpathy-session-29453d643abbbbbe
title: Karpathy session 29453d643abb
tags:
- karpathy
- session-learning
sources:
- resource: session:c3ae0965-5f26-4e29-b4e5-a0b4ffb406b6
generated:
  by: pk/1.11.0
  at: 2026-10-29T09:04:32.437547+00:00
created_at: 2026-10-29T09:04:32.437547+00:00
updated_at: 2026-10-29T09:04:32.437547+00:00
revision: 0
---

## Delta

I built KnowDesign 0.26.2 and installed it at `/Applications/KnowDesign.app`, but you need to restart it before the new version is the one actually running.

**What's installed:**
- It's built from the current `main`, which includes the upstream merge and today's fixes.
- It uses the same namespace (`knowdesign`), profile (`knowdesign`) and data location as your old 0.25.1 install, so your existing 882 MB of projects and settings carry over.
- Its code signature checks out. It's signed locally rather than with a developer certificate, the same as the previous install.
- The old 0.25.1 app is in the Trash as `KnowDesign 0.25.1 (replaced 2026-10-29).app` if you need to roll back.

**What you need to do:** the old 0.25.1 app was still running in the background. That's the headless copy your MCP setup starts, which is why the `open-design` MCP connection dropped earlier. I should have stopped it before swapping the app. When I tried to stop it afterwards, the permission system blocked me from ending those processes. They're still the old version, running from the copy in the Trash. To switch over:
1. Quit KnowDesign. If it's only running in the background, run `pkill -f KnowDesign` in a terminal, or type `! pkill -f KnowDesign` here.
2. Open KnowDesign from Applications, and restart whatever launches the `--od-mcp-managed` copy (likely your MCP client), so it starts 0.26.2.
3. Once the new version is running, you can empty the old copy from the Trash.

I haven't launched 0.26.2 myself, so its first run will be after you restart it.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: c3ae0965-5f26-4e29-b4e5-a0b4ffb406b6
- Captured: 2026-10-29T09:01:44.041932Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
