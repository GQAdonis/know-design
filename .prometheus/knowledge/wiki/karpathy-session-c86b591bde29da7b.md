---
type: SessionRecord
id: karpathy-session-c86b591bde29da7b
title: Karpathy session c86b591bde29
tags:
- karpathy
- session-learning
sources:
- session:349d9edd-f8b6-4f83-b5cc-4e83f1d48611
timestamp: 2026-09-24T10:12:42.859872+00:00
created_at: 2026-09-24T10:12:42.859872+00:00
updated_at: 2026-09-24T10:12:42.859872+00:00
revision: 0
---

## Delta

Right — I'll be notified when the build completes rather than polling.

Here's where things stand while it finishes:

**Your projects are safe, twice over**
- Original: `.tmp/tools-pack/runtime/mac/namespaces/default/data/` — all 5 projects, untouched
- New independent backup: `~/Desktop/open-design-projects-backup-20260924-0508` (64MB, consistent DB snapshot + project files, all 5 verified by name)

**In progress**: rebuilding without `--portable`, which will bake `namespaceBaseRoot` back into the bundle pointing at your existing data root — reproducing exactly what 0.22.1 had, but on the current merged code. Then I'll install it to `/Applications` and confirm your projects appear in the sidebar before calling it done.

**One thing I want to raise once you're working again**: your project data lives inside `.tmp/` in a git repo. I verified it's gitignored, but that's the problem — `git clean -xdf` would delete it without warning, and `tools-pack mac cleanup` targets that tree too. It's a scratch directory holding your real work. Worth relocating to somewhere stable (via `OD_DATA_DIR`) once the immediate issue is fixed. Not now — one thing at a time.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 349d9edd-f8b6-4f83-b5cc-4e83f1d48611
- Captured: 2026-09-24T10:09:42.572005Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
