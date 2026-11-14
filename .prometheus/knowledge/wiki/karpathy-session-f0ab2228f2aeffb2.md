---
type: SessionRecord
id: karpathy-session-f0ab2228f2aeffb2
title: Karpathy session f0ab2228f2ae
tags:
- karpathy
- session-learning
sources:
- resource: session:8bd2c83a-0467-48b5-902a-ea8495952f60
generated:
  by: pk/1.10.0
  at: 2026-10-04T18:00:12.677457+00:00
created_at: 2026-10-04T18:00:12.677457+00:00
updated_at: 2026-10-04T18:00:12.677457+00:00
revision: 0
---

## Delta

<od-focus key="e1eeb29227409397" open="rag-chat.html" show="rag-chat.html, vault-agent-ui-concept.md, agent-panel.html"/>

<od-done key="e1eeb29227409397"/>

It is now in the concept as its own mode. The Chat tab has a two-position switch: **Notes** is the RAG chat and the default; **Agent** is the agentic chat I showed first. Same thread, composer, scope bar and lane chip; different contract for what a turn may do.

**What makes Notes mode a RAG chat and not search**

- It answers, it does not list. Retrieval happens, but as the first step of a turn, shown as a collapsible *Retrieved 3 passages from 2 notes* card with note, heading, similarity score and excerpt. That card is the RAG equivalent of a tool-call card: the retrieval is the only tool, so it is the one thing to make visible.
- Citations are passage-level, not note-level. Hover a superscript and its passage row highlights; click and the note opens at that heading with the block flashed in the editor. Copy produces markdown with `[[Note#Heading]]` links.
- A grounding line sits under every answer: *grounded · 3 sentences · 3 cited · 0 without a source*. An uncited sentence is counted, not hidden.
- It refuses honestly. Below a similarity floor it generates nothing, shows the near-misses, says "Not in your notes", and offers text search or a hand-off to Agent mode. It never answers from the model's own knowledge.
- The user can steer retrieval: **Pin** keeps a passage in context for following questions, **Exclude** drops it from the next retrieval, and a context strip shows the passage budget so the window is not magic.
- **Quote only** switches to verbatim sentences from the notes, each cited. That is the right default for small offline models that paraphrase badly.
- It writes nothing: no tools, no skills, no approval cards. If a question needs an action, the way out is the mode switch.

**Files**

- `rag-chat.html` is new. Send the first starter to watch a grounded answer stream after its Retrieved card; send the second to see the "Not in your notes" state; toggle Quote only before sending to get the verbatim variant.
- `vault-agent-ui-concept.md` gained section A2a (Notes mode) and the mode-switch framing; the agent chat is now A2b.
- `agent-panel.html` gained the same Notes / Agent switch so the two screens read as one view, and the launcher links the new screen.

**Checks**

Tag balance and script syntax pass on all five screens; no forbidden calls. One render of the new screen showed the right pane growing past the viewport rather than scrolling, which I fixed in the shared stylesheet afterwards, so that fix is unverified visually.

<od-next key="e1eeb29227409397" value="Show the uncited-sentence case: an answer with one sentence marked as unsupported and the grounding badge in warning"/>
<od-next key="e1eeb29227409397" value="Add a mobile bottom-sheet variant of Notes mode to quick-ask.html"/>
<od-next key="e1eeb29227409397" value="Add a Notes chat section to the control center: answer floor, passage budget, quote-only default, local answer model"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 8bd2c83a-0467-48b5-902a-ea8495952f60
- Captured: 2026-10-04T17:52:14.597059Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
