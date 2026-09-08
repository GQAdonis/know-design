---
type: SessionRecord
id: karpathy-session-11555d91df3f7771
title: Karpathy session 11555d91df3f
tags:
- karpathy
- session-learning
sources:
- session:e4709b64-8ae0-4d8e-905a-2748d218154a
timestamp: 2026-09-05T11:31:37.937534+00:00
created_at: 2026-09-05T11:31:37.937534+00:00
updated_at: 2026-09-05T11:31:37.937534+00:00
revision: 0
---

## Delta

The three ember values read as one coherent family — a legible progression from mark to fill to text, each carrying its own contrast job. The system still reads as ember, not brown.

## Audit complete — 6 defects found and fixed, `ok: true`, ID unchanged

### First, a scope correction

Five of the files you named don't exist in this package: `brand.json`, `variables.css`, `theme.json`, `kit.html`, `kit.dark.html`. That's not a gap — this package uses a different convention, and the equivalents are all present:

| You asked about | This package uses |
|---|---|
| `variables.css` / `theme.json` | `colors_and_type.css` + `assets/aso.css` (light + `html.dark` in one file) |
| `brand.json` | `assets/brand/*.svg` + DESIGN.md §2 |
| `kit.html` / `kit.dark.html` | `ui_kits/app/index.html` — one kit with a live theme toggle, not two files |

Nothing needs creating; a dark-specific kit file would duplicate a working runtime toggle.

### What the audit actually found

The structural audit passed before I started. **The real defects were in contrast — which no automated check here covers.** I measured every foreground/background pair the system renders, in both themes:

| Defect | Was | Now |
|---|---|---|
| **Primary button, white text** | **2.97:1** ✗ | 4.51:1 |
| Primary button hover | **3.99:1** ✗ | 6.03:1 |
| `--accent` on `--s3` (active rail step) | **4.20:1** ✗ | 4.75:1 |
| `--fg-3` on `--s2` (metadata on raised panels) | **4.38:1** ✗ | 4.93:1 |
| `.chain-stage` pending | **4.46:1** ✗ | 5.78:1 |
| **`.doc .cite` — citation chip inside the letter** | **4.38:1** ✗ | 4.93:1 |

The primary button is the most-used control in the system and was failing AA by a wide margin. The last one matters most in context: that's the chip a payer reads to verify a claim's source, on a document that gets printed and faxed.

**The fix respects the system's own rules.** I added `--ember-fill` `#B85E1C` rather than changing `--ember` — the mark keeps `#DF7C35` in all three SVGs, unchanged. Ember now has three contrast-graded values with distinct jobs: mark, fill, text. I rejected the alternative (ink text on bright ember) because the source explicitly forbids changing a solid button's foreground alone, and it would read as a warning chip rather than a primary action.

**Dark mode needed no corrections** — every pair already passed, lowest 4.64:1. Those ratios were flagged "unverified" in my previous handoff; they're now measured and recorded.

I also corrected my own earlier documentation: `--fg` is 16.3:1 (I'd written 15.8), `--fg-2` 7.3 (not 7.4), `--fg-3` was 5.03 (not 5.1). Those came from source CSS comments I'd reproduced without checking.

### Also fixed
- **`.landed` had no live demo** — the sanctioned replacement for forbidden `scrollIntoView` was described but never shown. Added a working one to `radius-shadows.html`.
- Synced all token values and ratio claims across DESIGN.md, README.md, SKILL.md, and 4 preview cards.
- Added a **README § Accessibility** with the full measured matrix, two new enforceable anti-patterns, and a **§ Readiness audit** in `context/provenance.md` marking these as the only values that *don't* trace to the source.

### Remaining gaps before publishing

1. **`--fg-3` on `--s3` is 4.46:1 — unfixable without cost.** Darkening it enough would collapse the gap between `--fg-2` and `--fg-3` and flatten the three-weight hierarchy. Documented as a hard rule instead: *never place `--fg-3` on `--s3`*. One component violated it; now fixed.
2. **Non-contrast accessibility is untested.** No screen-reader pass, no keyboard-only run through the ten-step flow, no 200% zoom reflow. Static review looks sound — real `<label for>`, ARIA on disclosure, text on every status — but that's review, not testing. This is the largest genuine gap.
3. **No `build/` or `fonts/`.** The source has zero raster assets and zero font binaries; all three families load from Google Fonts. Unchanged from before, and not fixable without inventing assets.
4. **C

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e4709b64-8ae0-4d8e-905a-2748d218154a
- Captured: 2026-09-04T00:35:31.304314Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
