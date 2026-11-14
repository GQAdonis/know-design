---
type: SessionRecord
id: karpathy-session-96763cd9aaaabd41
title: Karpathy session 96763cd9aaaa
tags:
- karpathy
- session-learning
sources:
- session:dbe9b88d-81c3-442a-8499-40c740a50f53
timestamp: 2026-10-02T13:31:54.495320+00:00
created_at: 2026-10-02T13:31:54.495320+00:00
updated_at: 2026-10-02T13:31:54.495320+00:00
revision: 0
---

## Delta

The plan is frozen and nothing has changed on disk yet. It covers a right-side Files and evidence panel, a state indicator on every case row, and a storyboard page that shows each sidebar click with the screen it produces.

## What the search found

- **Claude Cowork:** the right side of the window holds three panels (Progress, Working folders and Context), and it surfaces the files Claude has read or created there.
- **Claude Code desktop:** panes for diff, files, browser, terminal, plan and tasks sit beside the chat and can be rearranged. A change counter opens the diff pane, which lists files on one side and the content on the other.
- **ChatGPT Codex app:** a review pane lists changed files, each expandable, and can switch scope between uncommitted changes, the whole branch, or the last turn.
- **Phones:** none of these sources describe how the panel adapts on mobile, so the phone version below is my own design.

## Goal

You can see what each left-navigation click does, see every case's process state at a glance, and open one panel that holds the files and evidence for the current patient or case.

## Deliverables

- `patient-chat.html`, reworked in place.
- `patient-chat-storyboard.html`, new. Each step names the click and shows the resulting screen as a live frame of the real prototype at desktop width, so it reads correctly even in a narrow preview pane.

## Left navigation

- **Storyboard steps:** nothing selected, click a patient, click a case, click a history row at each scope, open the files panel, and the phone versions.
- **Cases visible on load:** the patient with the nearest deadline starts expanded.
- **Sturdier clicks:** navigation will run from in-memory state, so it no longer depends on the address bar or on default link behavior.

## Case state indicator

It uses the product's own state machine from `schema.sql`: Intake, Evidence assembly, Policy review, Awaiting surgeon, Drafting, Ready to submit, Submitted, Peer-to-peer, then Approved, Denied or Withdrawn.

- **In the sidebar:** each case row gets a second line with a stage track and the state's name, so the state never rests on color alone.
- **Live:** Renata Kaminski's fusion case moves along the track as you work it. The other cases sit at fixed states.

## Files and evidence panel

- **Opening:** a Files control in the top bar, shown when a patient or case is in context. The panel slides in from the right.
- **Case context:** what was generated (letter, surgeon statement, staff request, gate record, packet, receipt), evidence by criterion with its state, other chart documents, and unfiled items.
- **Patient context:** the same, with generated items grouped by case and the whole chart.
- **Opening an item:** it shows in the existing viewer in the same place, with a way back to the list.
- **Phones:** a bottom sheet over a dimmed page; opening an item goes full screen and Back returns to the sheet.

## Assumptions

- **Why you have not seen the case list:** I am guessing your preview is narrower than 768px, where the sidebar is a drawer behind the top-left button. I have not confirmed that.
- **One right-hand region:** the files list and the document viewer share it, as Claude's and Codex's side panes do.
- **Scope of "generated":** files and records the workflow produced, plus the evidence they cite. Conversations stay in History.
- **Phone width cutover:** the sidebar stays a drawer below 768px.

## Risks

- **Storyboard weight:** it loads about nine live copies of the prototype, so it opens more slowly than the prototype itself.
- **Fixed states:** only the Kaminski case changes state as you work; the rest are illustrative.
- **Unreviewed render:** it ships as written, with no browser check from me.

Sources:
- [Claude Cowork: The Ultimate Guide for PMs](https://www.productcompass.pm/p/claude-cowork-guide)
- [Claude User Guide (Nexthink)](https://hc.nexthink.com/hc/en-us/articles/35220954772882)
- [Use Cowork on web, desktop and mobile](https://supp

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: dbe9b88d-81c3-442a-8499-40c740a50f53
- Captured: 2026-10-02T13:30:28.456299Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
