---
type: SessionRecord
id: karpathy-session-6a82fc74fcc42926
title: Karpathy session 6a82fc74fcc4
tags:
- karpathy
- session-learning
sources:
- session:31d3eb3b-e2a1-49c4-a7bf-1f2e644d130e
timestamp: 2026-09-07T19:59:17.980800+00:00
created_at: 2026-09-07T19:59:17.980800+00:00
updated_at: 2026-09-07T19:59:17.980800+00:00
revision: 0
---

## Delta

Written to **`design-to-development-method.md`** (504 lines), copied to `prior-auth/docs/method/` so it sits beside the code it describes.

## The structure

Ten stages, each with what it consumes, what it emits, what actually happened, and a reusable checklist — 43 checkable items total.

```
0 Frame → 1 Prototype → 2 Pressure-test → 3 Formalize → 4 Adversarial
→ 5 Research → 6 Document → 7 Publish → 8 Scaffold → 9 Enforce
```

**The framing that makes it a method rather than a retrospective:** stages 0–2 are OpenDesign's territory, 8–9 are the skill packages', and **3–7 are the seam** — which is where design-to-code handoffs normally fail. The contribution is making that seam explicit and executable.

## What I emphasized, and why

I weighted the document toward the moments where **execution contradicted intention**, because those are the transferable parts:

- The schema's first draft didn't run — three defects found only by applying it to a real database
- The adversarial reviewer returned BLOCK with four criticals, and checking one of its claims surfaced something worse: a laundering path already sitting in the code
- Parallel research agents overturned two premises I was about to publish as fact
- Dependency versions I'd invented rather than looked up
- **The audit had three bugs of its own**, including reporting PASS while a check failed

That last one gets its own section. An audit that has never failed is an audit that has never been tested, and negative-testing it — planting a real violation to confirm it catches one — is the single most transferable habit in the whole document.

## Verification

I checked every numeric claim against the artifacts rather than trusting recall: 18 screens ✓, 60 tables ✓, 9 typed pairs ✓, 6 audit checks ✓, 22 token roles ✓, shared core shell-free ✓, and the T1/T4/T9 test IDs quoted verbatim from the check suite.

One finding worth surfacing: **the web app has grown from 9 source files to 121 since the scaffold**, with new features and components — and the audit still passes. The boundaries held under work I didn't do, which is the only real evidence they were boundaries rather than intentions. I added that as durability evidence in stage 9.

The closing rule is the one I'd hold onto: *"Working" is a runtime claim. Compiling is not evidence* — with the four-word vocabulary (Passed / Build-only / Blocked / Failed) where only the first means finished.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 31d3eb3b-e2a1-49c4-a7bf-1f2e644d130e
- Captured: 2026-09-05T15:51:47.883432Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
