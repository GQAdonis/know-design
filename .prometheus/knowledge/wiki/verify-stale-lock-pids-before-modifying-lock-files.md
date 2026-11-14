---
type: Lesson
id: verify-stale-lock-pids-before-modifying-lock-files
title: Verify stale lock PIDs before modifying lock files
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- lock-files
- stale-locks
- process-safety
- git
- openspec
- commerce-removal
- kbd-process
links:
- commerce-removal-phase-reflection-and-corrective-actions
sources:
- id: lesson
  resource: learning:42156743ab50d1fd
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:49:44.245759+00:00
created_at: 2026-10-05T16:49:44.245759+00:00
updated_at: 2026-10-05T16:49:44.245759+00:00
revision: 0
content_hash: 0dd0e17634189ea4d76d2b44a1294188f796b0bd6bfe2a6c3fa0413807320605
---

## Lesson

Before touching or deleting a lock file, read the PID recorded in it and confirm that the owning process is no longer running. This applies to OpenSpec `operation.lock` and Git `.git/index.lock` files.[^lesson]

## Engineering implications

- Treat lock files as active concurrency guards until proven stale.
- Inspect the lock contents first; do not blindly remove or overwrite the file.
- Confirm the PID is absent or the process has exited before cleanup.
- For Git operations blocked by `.git/index.lock`, verify no active Git process owns the lock before removal.
- For OpenSpec operations blocked by `operation.lock`, verify the recorded operation process is gone before editing or deleting the lock.
- This supports the review/process discipline captured in [Commerce-removal phase reflection and corrective actions](/commerce-removal-phase-reflection-and-corrective-actions.md): corrective action should preserve evidence and avoid masking active work.

[^lesson]: Phase commerce-removal reflection lesson.