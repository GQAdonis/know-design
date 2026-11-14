---
type: SessionRecord
id: karpathy-session-cee41846fdefadc2
title: Karpathy session cee41846fdef
tags:
- karpathy
- session-learning
sources:
- resource: session:5acda4f9-cfd5-4403-9e0e-2693531a3f4a
generated:
  by: pk/1.11.0
  at: 2026-11-14T12:49:13.302258+00:00
created_at: 2026-11-14T12:49:13.302258+00:00
updated_at: 2026-11-14T12:49:13.302258+00:00
revision: 0
---

## Delta

Both tests pass now. In both cases the test was wrong, not the app, so I only changed the two test files (commit `794064e9e2`, not pushed yet).

**Packaged startup test** ([startup-timing-wiring.test.ts](apps/packaged/tests/startup-timing-wiring.test.ts)): our commit `6af8c32c2a` made the app record each startup phase through a `startup` recorder. This test runs that startup code on its own and never supplied the recorder, so it crashed with `startup is not defined`. I gave it a fake recorder and added a check that all four phases get recorded, so our feature is now covered by the test too.

**Daemon Codex test** ([od-next-automatic-simple-server.test.ts](apps/daemon/tests/od-next-automatic-simple-server.test.ts)): it only failed on machines that export `OPENAI_API_KEY`, which yours does. When that key is set, the daemon treats Codex as signed in and skips running `codex login status`, which is the thing this test checks for.
- The test tried to block this by saving the key as an empty value in the agent settings. But the daemon throws away saved API-key entries that come without a base URL or an explicit override flag, so the empty value never took effect.
- The fix clears the key from the environment for the duration of this test and restores it afterwards, the same way the test already handles `PATH`.
- I confirmed it fails with your key exported and passes with it unset. With the fix, all 74 tests in the file pass even with your key still exported.

The packaged suite passes 421/421, the four daemon test files I ran before pass 89/89, and guard and typecheck pass.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 5acda4f9-cfd5-4403-9e0e-2693531a3f4a
- Captured: 2026-11-14T12:49:05.816239Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
