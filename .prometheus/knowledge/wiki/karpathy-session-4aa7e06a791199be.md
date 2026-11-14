---
type: SessionRecord
id: karpathy-session-4aa7e06a791199be
title: Karpathy session 4aa7e06a7911
tags:
- karpathy
- session-learning
sources:
- resource: session:e40aa98d-c20a-4fce-b869-17f8b90678f6
generated:
  by: pk/1.11.0
  at: 2026-10-20T23:07:47.791914+00:00
created_at: 2026-10-20T23:07:47.791914+00:00
updated_at: 2026-10-20T23:07:47.791914+00:00
revision: 0
---

## Delta

You're right. Last time I took the brand rules and drew shapes from the architecture spec's internals (ownership, fencing, ledgers) without asking what Locus is for. Reading `locus.html` together with the Private Dot docs it links to changes the brief.

## What Locus actually is
- **The dot is the product.** OpenAI's dot and Meta's Muse are one named, always-on, proactive assistant per person. Locus is the engine that lets KnowMe offer its own "private dot", and its memory is per-project, linked to its sources, exportable and kept on your device.
- **The name is the argument.** The Private Dot comparison says of the vendor dot that its "vendor VM is the locus of execution." KnowMe's answer is that the locus becomes your own device. Locus is where your dot lives, and it isn't someone else's server.
- **Muse is the warning.** The criticism of Muse (TIME: it is "building a dossier on you") is exactly what Locus refuses. Its memory stays with you, can be corrected line by line, and can be exported.
- **It speaks only when there's a reason.** The coach acts only on defined triggers, and healthy work gets no commentary. Unlike Muse, it's proactive without being chatty.

So each logo has to show **a dot, and where that dot lives**. All three are still built from KnowMe's own parts: the ember dot from the K monogram and its rounded 20-unit strokes.

## Three new concepts
1. **Locus of points.** In geometry, a circle is "the locus of points equidistant from a centre." The mark is that definition: a large ember dot (you, your intent) inside a ring of 8 small light dots (your phone, desktop, cloud and agents, all equally answerable to you). It reads as a dot with a quiet halo of presence, and the 8 positions hint at a clock, for "always on". I'm using 8 dots rather than 12 so it still reads at 16px. The dots are all the same size so it doesn't look like a loading spinner.
2. **Held ℓ.** A single rounded stroke forms the script "ℓ" (L for Locus), and the ember dot sits inside the loop. Your dot stays inside your Locus: memory and authority don't leave the loop. It's the most letter-like option and works well as an app icon.
3. **Quiet signal.** The ember dot with one light arc next to it, like a voice or attention cue cut down to a single wave. It's proactive like Muse and the dot, but it says one thing only when a trigger fires. It's the most "assistant-like" of the three and the closest to how the dot looks in an interface.

## Files
I'll delete the three rejected folders and write the new ones in their place: `01-locus-of-points/`, `02-held-ell/`, `03-quiet-signal/`. Each folder gets the same three files:
- `mark.svg`: 1024 app tile in the KnowMe icon layout
- `lockup-dark.svg` and `lockup-light.svg`: mark + "Locus" in Space Grotesk 600 with the small "Know"+ember"Me" endorsement, font embedded

Each SVG gets a `<desc>` that states its meaning, and the summary will explain the reasoning for each.

## Assumptions
- Brand rules stay as before: Flat 2.0, the KnowMe palette, one ember element per mark, and cyan left out because none of these concepts is about remote AI.
- I'll design the marks to hold up at 16px, but I won't render or preview them afterwards.

<od-production-ready key="0d735f96b52ba02b" />

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e40aa98d-c20a-4fce-b869-17f8b90678f6
- Captured: 2026-10-20T23:07:22.577264Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
