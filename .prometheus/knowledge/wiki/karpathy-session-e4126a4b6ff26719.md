---
type: SessionRecord
id: karpathy-session-e4126a4b6ff26719
title: Karpathy session e4126a4b6ff2
tags:
- karpathy
- session-learning
sources:
- resource: session:3fcad7e4-9c88-4131-a4a2-cf6d4c3ef8aa
generated:
  by: pk/1.11.0
  at: 2026-11-14T16:52:44.898465+00:00
created_at: 2026-11-14T16:52:44.898465+00:00
updated_at: 2026-11-14T16:52:44.898465+00:00
revision: 0
---

## Delta

<od-focus key="b852e7dab37ca9f7" open="index.html" show="index.html, publication/index.html, PAGE-COVERAGE.md, VALIDATION.md, DESIGN.md, publication/preview-1200x630.png"/>
<od-done key="b852e7dab37ca9f7"/>

The complete IPFS demo is built and packaged. The final validation run of the actual bundle, served beneath `/ipfs/test-cid/`, passed **371 of 371** automated checks. Nothing was uploaded and no credentials were read or used.

**What to open**
- **The app:** `index.html`, which uses hash routes such as `index.html#/lesson/1/worksheet`. There are **78 routes**, covering all 13 page families.
- **Ideas behind this demo:** `#/why`. For each topic it shows the source idea, what you see in the design, and a "Try it" button that opens the working journey. Each topic marks what comes from the source, what is a prototype adaptation, and what is still simulated. It links only to three verified public sources: the approved E4 v0.4 plan, the earlier KnowWord edition and the World English Bible. Private sources are described without links. Eleven major screens have a "Why this design?" link.
- **Traceability inside the public package:** the `#/trace` page and `publication/traceability.json`, both listing every route with its requirement IDs.

**Deliverables**
- **`PAGE-COVERAGE.md`:** all 78 routes, generated from the app itself, grouped by family with interactions, states, who can open each page and the requirement IDs.
- **`DESIGN.md`**, the private **`SOURCES.md`**, and a new **`VALIDATION.md`**. The old 133-pass claim is retired, and the old prototype files are moved to `archive/first-prototype/`.
- **`publication/`** (29 files, about 0.8 MB). It contains the app, a public README, `traceability.json`, a real 1200×630 Today screenshot as the link preview, local fonts with their OFL licences, and the official logo.
- **`publication-manifest.json`**, holding the SHA-256 of every file, an aggregate hash (`294b6aa6…26d3d`), the privacy exclusions and the publishing order. No CID is invented.
- **`e4-family-ipfs-demo-publication.zip`**, sitting next to the package.
- **Test evidence** in `validation-ipfs/`, outside the package: results, logs, 25 screenshots and the test scripts.

**What the final run covered**
- Every route reloads correctly at 1440, 768, 375 and 320 px, with no script errors, dead buttons, unlabelled fields or horizontal scrolling.
- 44 end-to-end journeys: the five lessons, the 30-day plan (download, print, offline edit and conflict merge), private shares, sermon notes, review, release and withdrawal, export and delete, two churches, and the workspace.
- Keyboard and reduced-motion checks.
- Zero external requests, zero missing files, and a clean privacy scan.

**Changes from the QA note**
- Validation now uses the already-installed 1255 browser. Nothing was installed and no checks were weakened.
- Earlier runs scored 352/367, then 365/370, then 371/371. They found real overflow and focus bugs at phone width, which I fixed.
- The README and manifest describe your upcoming native upload with your existing IPFS access, with no extra logo-approval step. New teaching and help copy is still labelled "Prototype adaptation · awaiting ministry review".

**Still not covered**
- No human usability or real screen-reader testing, and only Chromium was tested.
- Privacy and church boundaries are enforced in the browser only; they don't prove server security.
- The bundle hasn't been tested on a real gateway yet. After you upload, check that the gateway serves files byte-identical to the manifest, and swap in an absolute preview image address if link previews need one.

<od-next key="b852e7dab37ca9f7" value="Walk me through the demo from Today to the 30-day plan and point out each Why link"/>
<od-next key="b852e7dab37ca9f7" value="Add a Spanish locale variant of Day 1 to show the variant review flow end to end"/>
<od-next key="b852e7dab37ca9f7" value="Design a dark theme for the everyday screens and re-run the validation"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 3fcad7e4-9c88-4131-a4a2-cf6d4c3ef8aa
- Captured: 2026-11-14T16:52:42.224977Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/progress.json
- .kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/tasks.md
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
- .kimi-code/skills/openspec-apply-change/SKILL.md
- .kimi-code/skills/openspec-archive-change/SKILL.md
- .kimi-code/skills/openspec-bulk-archive-change/SKILL.md
- .kimi-code/skills/openspec-continue-change/SKILL.md
- .kimi-code/skills/openspec-explore/SKILL.md
- .kimi-code/skills/openspec-ff-change/SKILL.md
- .kimi-code/skills/openspec-new-change/SKILL.md
- .kimi-code/skills/openspec-onboard/SKILL.md
- .kimi-code/skills/openspec-propose/SKILL.md
- .kimi-code/skills/openspec-sync-specs/SKILL.md
- .kimi-code/skills/openspec-update-change/SKILL.md
- .kimi-code/skills/openspec-verify-change/SKILL.md
- docs/knowdesign/
- plugins/_official/scenarios/od-axum-export/
