---
type: SessionRecord
id: karpathy-session-1671073f27030b55
title: Karpathy session 1671073f2703
tags:
- karpathy
- session-learning
sources:
- resource: session:3ca2df01-20f4-4838-82df-88486d5190b9
generated:
  by: pk/1.11.0
  at: 2026-10-20T15:07:22.369063+00:00
created_at: 2026-10-20T15:07:22.369063+00:00
updated_at: 2026-10-20T15:07:22.369063+00:00
revision: 0
---

## Delta

I copied the design package into `docs/design/` in all three repos and wrote an agent-team implementation prompt for each. No repo had a `docs/design/` folder before, so nothing was overwritten. Nothing is committed: the files are untracked on each repo's `feat/ipfs-mcp-server` branch.

Every repo gets the same layout:

| Item | What it is |
|---|---|
| `IMPLEMENTATION-PROMPT.md` | The prompt to paste into Claude Code at the repo root |
| `README.md` | Index of the folder, plus the published IPNS link |
| `DESIGN-PROPOSAL.md` | The full design, including §13 (views) and §14 (phone layout) |
| `prototype/` | The clickable prototype with its fonts, logos and images; opens directly in a browser |
| `kbd-phase/` | The phase records: goals, assessment, analysis, plan, decision log, execution and reflection |
| `openspec/` | Only the OpenSpec changes that touch that repo |

**Which changes went where:**
- **kubo** (54 files): all eight changes, because Kubo holds the canonical copies.
- **ipfs-webui** (52 files): visual roles, shell modes, decision inbox, context inspector, origin guard and unpin wording, MCP App views through A2UI, and decision model v2 for reference.
- **ipfs-desktop** (42 files): Desktop tray and confirmation window, plus decision model v2, decision inbox and visual roles, which it depends on.

**What each prompt tells the agent team:**
- **What to read first:** the proposal, the prototype routes, the OpenSpec changes and the Praxis spec. Each change's `tasks.md` is the work breakdown.
- **Which changes this repo owns,** in round order R1 to R4.
- **Team roles:**
  - **Kubo:** the agents already in `.claude/agents/`: `ipfs-agent-architect`, `mcp-server-engineer`, `ui-ux-engineer`, `security-reviewer` and `reviewer`.
  - **The two forks:** the same roles, plus an accessibility reviewer on the webui.
- **Rules that apply everywhere:**
  - the ten decision states, with their exact badge words
  - nothing an agent proposes changes the node until a person approves it
  - network content is shown only as data
  - the exact wording for unpinning and for peer builds
  - the Promethity visual rules and the phone layout
- **Repo-specific notes:**
  - **Kubo:** keep RPC and wire compatibility, and write an architecture decision record before building the decisions endpoint.
  - **Web UI:** stay on React 16 and keep every existing IPFS action.
  - **Desktop:** keep Electron and leave the Touch ID gate unchanged.
- **Checks:** each repo's real build, lint and test commands, plus comparison against the prototype at 375 and 1440 px in both themes.
- **Reporting:** a running `IMPLEMENTATION-LOG.md` with commit hashes and real check output.

To start one, open Claude Code at that repo's root and paste everything below the line in its `docs/design/IMPLEMENTATION-PROMPT.md`.

<od-next key="9aa7bcddb5d79bbe" value="Commit the docs/design folders in all three repos on feat/ipfs-mcp-server"/>
<od-next key="9aa7bcddb5d79bbe" value="Write the OpenSpec change for Explore agent profiles in kubo and copy it to the webui docs"/>
<od-next key="9aa7bcddb5d79bbe" value="Write the ADR for the decisions endpoint in kubo docs/mcp before implementation starts"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 3ca2df01-20f4-4838-82df-88486d5190b9
- Captured: 2026-10-20T15:07:08.136145Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
