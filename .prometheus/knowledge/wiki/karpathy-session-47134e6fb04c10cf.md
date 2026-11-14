---
type: SessionRecord
id: karpathy-session-47134e6fb04c10cf
title: Karpathy session 47134e6fb04c
tags:
- karpathy
- session-learning
sources:
- resource: session:4f9fcdf7-b3a7-4efe-9a98-7f8440373b7f
generated:
  by: pk/1.11.0
  at: 2026-10-25T09:56:53.828327+00:00
created_at: 2026-10-25T09:56:53.828327+00:00
updated_at: 2026-10-25T09:56:53.828327+00:00
revision: 0
---

## Delta

I've read the sources and checked the integrations; this plan uses only what I found. Building starts in the next turn.

## What I found

**Content source.** `TribeHealth-Strategy.html` is 310,846 bytes with SHA-256 `e7785f8b…`. That matches the handoff's "Current final delivery — business/site edition." `public/index.html` (`15997d0d…`) also matches. I'll take the content from these bytes once and record that version; I won't recheck for later edits. I won't read the private files in `evidence/`.

**Brand.** I'll use the Cited Letter system from `simple-ai-care/DESIGN.md`:
- a cool gray background, white document panels and full-width navy bands;
- yellow highlight only for the evidence currently in view;
- Met/Gap/Void colors for evidence states;
- Nexa for headings and labels, Source Serif 4 for body text;
- square corners;
- the circular mark from the existing Android icon files.

The repo's source slip, claim note and evidence badge components are the starting point. No ASO branding.

**Integrations actually available:**

| Service | Status | What I'll do |
|---|---|---|
| Local OpenAI-compatible proxy (`127.0.0.1:8181/v1`) | Responding, no new credentials needed | Concierge inference goes through it, from the server only |
| PEM entity store (`@prometheus-ags/*` 4.2.0, built, React 19) | Exists in code | Use for shared case state |
| PEM schema resolver / renderer overrides | Proposal only | Show as proposed in the architecture view |
| Praxis 1.3 | Proposed contracts; no concierge or navigation action names | Follow its `EntityRef`, `CommandIntent`, outcome and revision rules; label navigation actions as a TribeHealth extension |
| UAR (KnowDesign) | Plan only, no code | Not used |
| KnowMe UAR container (port 6565) | Running, contract not checked | Read-only health check at most; use only if its contract fits; never restart |
| Locus | Not found | Not used |
| Flint | Sign-in layer only | Not used |
| LiveKit | Only the API key is set (no URL, secret or server) | Voice is shown as not connected |
| Local FHIR server | Not running | Diagram only |

## Deliverables

All of this goes in a new app inside this project folder. No source repository is modified.

**1. Landing page and concierge (first priority)**

Long-form editorial site built with Vite, React 19 and TypeScript. Opening plus sections for:
- mission and history: FacTotem 2008–2009 development vs. the later iPad release; the premium athlete market with the founder-reported DICOM demo; the COVID pivot; documented 2019 imaging work; the 2021 Resolve to Save Lives specification with the Google Doc link;
- patient-controlled consent, provenance and FHIR aggregation, kept separate from large DICOM objects;
- the three products, starting with spine orthopedics;
- the operator model;
- an interactive architecture view: selecting a component shows its role, implementation status and source;
- maturity, limits and sources.

Every claim gets a small citation that opens the source passage. All content is readable without JavaScript, chat or sign-in.

The concierge is a side panel, never a gate:
- the server retrieves passages from the snapshot and the model answers with citations;
- the server checks every proposed action against a fixed allowlist with fixed IDs (`navigate.section`, `open.evidence`, `open.architecture`, `open.case`) before the browser runs it;
- status always reads Live, Retrieval only or Unavailable;
- when inference is down, it shows the matching passages labeled as retrieval and never presents them as generated answers;
- the voice button stays disabled with an explanation.

**2. Authorization Runway (second priority)**

About six cases labeled synthetic, each with payer criteria, evidence requirements and flags for missing documents. Every action needs a human click (request document, mark received, mark ready for review, hold). The server stores changes in SQLite with revision checks. PEM keeps the list, summary counts and detail view in sync. Change

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4f9fcdf7-b3a7-4efe-9a98-7f8440373b7f
- Captured: 2026-10-25T09:55:31.077437Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
