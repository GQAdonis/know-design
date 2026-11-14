---
type: SessionRecord
id: karpathy-session-0f6b22832c3d25a9
title: Karpathy session 0f6b22832c3d
tags:
- karpathy
- session-learning
sources:
- resource: session:e3006cf8-b85c-4041-a20e-d6ffe6e3638f
generated:
  by: pk/1.11.0
  at: 2026-11-09T16:30:29.766800+00:00
created_at: 2026-11-09T16:30:29.766800+00:00
updated_at: 2026-11-09T16:30:29.766800+00:00
revision: 0
---

## Delta

The research is underway. An agent is surveying every serious option, verifying each claim against primary sources (npm, GitHub releases, official docs and changelogs). It covers:

- assistant-ui
- whatever Vercel just released: AI Elements, Streamdown or something newer, which the agent will pin down
- CopilotKit, which created AG-UI
- Google's official A2UI renderers
- LlamaIndex chat-ui, prompt-kit and shadcn's own chat components
- Thesys C1, Tambo, Hashbrown, NLUX, deep-chat and Kibo UI
- any React client built directly on AG-UI
- for each option, whether a Flutter counterpart exists

Every option is scored against your requirements:
- AG-UI endpoints, including custom events
- A2UI rendering
- custom chunks and how each one is displayed
- streaming markdown with diagrams, math, SVG, images, video and code highlighting
- tool calls and human approval steps
- how well it fits shadcn, Tailwind 4 and our tokens
- React 19 and Vite inside Tauri, without being tied to Next.js
- maturity, accessibility and lock-in

The findings will go in `docs/research/agentic-ui-library-evaluation/`.

After that, the adversarial review runs through the same gateway as before. MiniMax-M3 plays critic and Kimi k3.1-pro is the judge; both are available right now. Neither model wrote the research. Each is asked to attack the recommendation: check whether the evidence supports each claim, flag outdated or wrong version and support claims, find missed candidates, and make the strongest case for the runner-up. The review instructions are written and ready.

Until there's a verdict, assistant-ui stays a tentative choice. I'll hold c08, the shared UI kit, until you've seen the result. If the review points elsewhere, I'll update the plan, the agentic-UI rule and the decision log to match.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e3006cf8-b85c-4041-a20e-d6ffe6e3638f
- Captured: 2026-11-09T16:30:18.372749Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
