---
type: SessionRecord
id: karpathy-session-8703c3be74141a5c
title: Karpathy session 8703c3be7414
tags:
- karpathy
- session-learning
sources:
- resource: session:e3006cf8-b85c-4041-a20e-d6ffe6e3638f
generated:
  by: pk/1.11.0
  at: 2026-11-09T16:44:46.425690+00:00
created_at: 2026-11-09T16:44:46.425690+00:00
updated_at: 2026-11-09T16:44:46.425690+00:00
revision: 0
---

## Delta

Both adversarial reviews are running. MiniMax-M3 is the critic and Kimi k3.1-pro is the judge. Each has the full research and instructions to attack the recommendation rather than confirm it.

**What the research found:**
- **Vercel's new release** is **AI Elements on shadcn/ui**, announced 14 October 2026. It's 21 copy-in components, built on the same Message, Trace and Code Block components you already have. It's tied to Vercel's AI SDK message format and doesn't support AG-UI or A2UI.
- **The protocols work without CopilotKit.** `@ag-ui/core` is MIT-licensed and has no dependencies. Google's `@a2ui/react` is Apache-licensed and renders A2UI v0.9 to v1.0. Neither pulls in CopilotKit. One caveat: CopilotKit's account publishes the AG-UI npm packages, so it effectively controls them.
- **Recommendation, ranked:**
  1. **Build our own on the entity-graph.** Use the AG-UI types, Streamdown for markdown with math, Mermaid and code, Google's A2UI renderer mapped onto our shadcn components, and the shadcn AI Elements patterns. The entity-graph already reads AG-UI state events. Messages, tool calls and the run lifecycle still need writing, which the researcher puts at about 7–10 engineer-weeks.
  2. **assistant-ui with its AG-UI adapter.** It has the most complete client, but it keeps its own copy of conversation state alongside the entity-graph.
  3. **assistant-ui as low-level building blocks only.** This drops the adapter, which is the part worth paying for.
- **Ruled out:** LlamaIndex chat-ui is archived, NLUX has had no release since 2024, and Tambo's cloud service shut down. OpenUI and json-render each bring their own generative-UI format, which would compete with A2UI.
- **Strongest argument against building our own:** we'd spend about two months rebuilding what assistant-ui hardened over 69 releases, while the AG-UI spec keeps adding event types.
- **Biggest unknowns:**
  - how the entity-graph copes with one write per streamed token in the Tauri webview (needs a short test build)
  - a version conflict between the A2UI renderer and our zod library
  - how screen readers announce streaming text
  - the Flutter A2UI renderer is still an early alpha

The research is saved in `docs/research/agentic-ui-library-evaluation/`. When both verdicts are back, I'll bring them to you alongside the research. Nothing gets installed until you decide.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e3006cf8-b85c-4041-a20e-d6ffe6e3638f
- Captured: 2026-11-09T16:44:43.462415Z
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
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/identity-and-collaboration/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/uar-acp-runtime/progress.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/hooks-status.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/hooks.log.jsonl
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/progress.json
- .kbd-orchestrator/phases/upstream-fixes-and-skill-integration/progress.json
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
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/hosted-publish-and-review/
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/assessment-delta-2026-10-12.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/children/
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/handoffs/execute.handoff.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/handoffs/reflect.handoff.json
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/reflection.md
- .kbd-orchestrator/phases/deploy-web-to-knowme-k8s/children/knowdesign-brand/review/
- .prometheus/progress-memory-receipts/
- .prometheus/session-log.md
