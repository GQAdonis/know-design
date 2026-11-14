---
type: SessionRecord
id: karpathy-session-ac1a8f3538785cc0
title: Karpathy session ac1a8f353878
tags:
- karpathy
- session-learning
sources:
- resource: session:e808e059-d85b-440d-9eb3-623a1278a153
generated:
  by: pk/1.11.0
  at: 2026-11-14T14:30:15.978553+00:00
created_at: 2026-11-14T14:30:15.978553+00:00
updated_at: 2026-11-14T14:30:15.978553+00:00
revision: 0
---

## Delta

<od-focus key="f9b9115de7b6b283" open="index.html" show="index.html, DESIGN.md, SOURCES.md, VALIDATION.md"/>

<od-done key="f9b9115de7b6b283"/>

I've built the first E4 Family prototype with all five flows and the storyboard, and the official E4 logo is in the header. The automated suite passed 133 of 133 checks at desktop and phone widths. No human usability testing has taken place.

**Design Files path:** `/Volumes/T7/Projects/references/open-design/.tmp/tools-pack/runtime/mac/namespaces/knowdesign/data/projects/990915ad-9f0b-4bba-ad9a-4fd217105cd4/`

Nothing in `e4-family-app` was changed. Nothing was published, sent or installed, and no separate project was created.

**Files created**
- **`index.html`**: the prototype. Its assets are in `assets/`: the stylesheet, six scripts, the official logo (byte-identical to Jason's file) and the open-licensed Source Sans 3 and Playfair Display fonts.
- **`DESIGN.md`**: the design decisions, with three groups kept apart:
  - decisions taken from the sources;
  - conflicts I resolved (Flat 2.0 overrides the derived guide's borders; E4 identity is used, not KnowMe ember);
  - substitutions and assumptions, each labelled.
- **`SOURCES.md`**: exact paths and SHA-256 hashes for every source, plus a list of what was deliberately not read.
- **`VALIDATION.md`**: step-by-step test scripts, every check with its result and evidence, and what remains untested.
- **`validation/`**: the test script, raw results, the run log and 17 screenshots.

**How the prototype works**
- **Two views of one app.** The everyday phone-first view is the default. The Workspace button adds the Praxis-style layout and keeps your place when you switch back.
- **Always-visible prototype bar.** It labels everything as simulated and holds the Prototype controls (role, AI on/off, offline, success/failure/unknown outcomes) and a Reset demo button that asks before clearing.
- **Flows A–E.** All five flows and the six-panel storyboard work end to end, with the states you asked for:
  - a private worksheet that facilitators can never see;
  - Scripture, reviewed teaching and AI explanation kept separate;
  - honest "no answer" and "AI unavailable" states;
  - queued, dispatched, acknowledged, failed and unknown for a shared question;
  - an approval that doesn't publish;
  - cancel-requested kept distinct from cancelled;
  - uncertain outcomes checked against the record before any retry.

**What validation found and fixed.** Several runs turned up real problems, all fixed before the final run:
- At 320px the course list overflowed the screen.
- The brand link had no keyboard focus state.
- On phones the prototype bar's text collapsed into a narrow column.
- The Workspace button scrolled out of reach. Moving keyboard focus to it also made the page jump, so the "keep my place" behaviour failed.
- On phones, a save's outcome only appeared in the hidden conversation pane.

Opening `index.html` straight from disk blocks the web fonts, so view it through KnowDesign's preview or any local web server.

**Assumptions and corrections**
- **Logo size:** the file is 878 × 430, not the 860 × 418 quoted. Its hash matches the official manifest, so the layout uses the measured size.
- **Brand board:** the board matches Jason's January 6 email exactly. The iMessage originals were never downloaded or hashed.
- **Fonts:** Playfair Display stands in for Eloquent JF, and Source Sans 3 for Raleway. Both are labelled as substitutions.
- **Scripture:** quotations use the public-domain World English Bible and are labelled as a demo text that hasn't been checked against a validated corpus.
- **Content:** the Responsibility poem is left out. All people and records are synthetic.

**Untested or limited**
- No human testing.
- No screen readers.
- Only Chromium was used: no Safari, Firefox or real phones.
- No dark mode.
- Not built in this first prototype: interactive Days 2–5, the 30-day plan, print export and a second organisation.
- The check that the 

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e808e059-d85b-440d-9eb3-623a1278a153
- Captured: 2026-11-14T14:30:12.159038Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- .kbd-orchestrator/current-waypoint.json
- .kbd-orchestrator/model-preflight.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/children/identity-and-collaboration/children/knowdesign-brand/children/uar-acp-runtime/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/children/identity-and-collaboration/children/knowdesign-brand/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/children/identity-and-collaboration/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/decision-log.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/backend-complete-replacement/tasks.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/commerce-removal/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/commerce-removal/tasks.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/hosted-publish-and-review/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/identity-and-collaboration/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/children/hosted-publish-and-review/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/uar-acp-runtime/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/progress.json
- .kbd-orchestrator/phases/upstream-fixes-and-skill-integration/progress.json
- .kbd-orchestrator/position-reminder.txt
- .kbd-orchestrator/position.json
- .kbd-orchestrator/project.json
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
- .kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/
