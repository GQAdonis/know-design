---
type: SessionRecord
id: karpathy-session-1d612ebcdda21505
title: Karpathy session 1d612ebcdda2
tags:
- karpathy
- session-learning
sources:
- session:62e61bd9-11d0-49ba-94ba-c1a2e9e12f6d
timestamp: 2026-08-07T08:14:11.635360+00:00
created_at: 2026-08-07T08:14:11.635360+00:00
updated_at: 2026-08-07T08:14:11.635360+00:00
revision: 0
---

## Delta

Done. The DMG is at:

```
~/Downloads/Open Design-default.dmg
```

Verified: SHA-256 `39b163ff…6bc0adf` matches the build output, 283M, mounts cleanly with full CRC verification passing, and contains `Open Design.app` (0.16.2) alongside the `Applications` symlink for drag-install.

Two notes:

- **My "MOUNT FAILED" a moment ago was wrong** — a flaw in my verification script, not the file. Mounting from `~/Downloads` triggers full checksum verification whose output broke my mount-point parsing. The DMG was always good.
- **It's unsigned**, so Gatekeeper will block it on first open. Right-click → Open, or `xattr -d com.apple.quarantine "$HOME/Downloads/Open Design-default.dmg"`. On your own machine the quarantine flag isn't set by a local copy, but it will be if you send this to anyone else.

The scratchpad copies (zip, updater payload, `.app`) are still in the session directory if you want any of those moved too — they're the ones at risk from temp cleanup.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 62e61bd9-11d0-49ba-94ba-c1a2e9e12f6d
- Captured: 2026-08-07T08:14:08.069117Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- .prometheus/knowledge/wiki/index.md
- .prometheus/knowledge/wiki/log.md
- .prometheus/knowledge/wiki/karpathy-session-8bde6d5f3dfe885a.md
- .prometheus/knowledge/wiki/karpathy-session-caf7f89a0733065b.md
- .prometheus/knowledge/wiki/karpathy-session-ff0134ddafa1da25.md
