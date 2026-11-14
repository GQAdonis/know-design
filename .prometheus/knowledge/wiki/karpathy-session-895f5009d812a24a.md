---
type: SessionRecord
id: karpathy-session-895f5009d812a24a
title: Karpathy session 895f5009d812
tags:
- karpathy
- session-learning
sources:
- resource: session:c2a7429d-1beb-47fe-a334-cde38050dbcd
generated:
  by: pk/1.11.0
  at: 2026-10-19T13:45:23.018712+00:00
created_at: 2026-10-19T13:45:23.018712+00:00
updated_at: 2026-10-19T13:45:23.018712+00:00
revision: 0
---

## Delta

<od-focus key="e8e324e0b762e95d" open="index.html" show="index.html"/>

<od-done key="e8e324e0b762e95d"/>

I've built the agentic meeting prototype as one file, `index.html`, in the project root. It opens directly in a browser with no build step. I haven't opened it in a browser or tested it, so the first time you open it is its first run.

**Before joining.** You enter your name, which is required and shows an error if left blank. You can turn on a real camera preview and run a mic check with a live level meter. A switch decides whether **Iris, your dot,** comes with you. The lobby also shows who is already in the room: Avery (the host), two other people, Avery's dot **Sol**, and the **Scribe** note-taker agent.

**In the room.**
- **Tiles:** people get initials tiles, or your own camera feed if it's on. The two dots appear as animated orbs, and LiveKit agents get a glyph with a small sound visualizer.
- **Agent status:** each dot and agent shows whether it is listening, thinking, speaking or paused. That status is spelled out in words and a small icon as well as colour.
- **Scripted conversation:** captions run through the meeting, naming who is speaking and whether it's a person, a dot or an agent. When Scribe logs an action item, it also posts it to chat.
- **Controls:** mute, camera, real screen sharing, captions, chat, knowledge, add agent, your private agent, and leave.

**Your private agent (slides in from the right).** Only you can see it. It has suggested questions and a "thinking" state, and it answers from the meeting's files and transcript. Every answer lists the files it used, and clicking one opens that file in the knowledge panel. A few answers show the access rules at work:
- Avery's pricing draft is shared with the host's agents only, so your agent says it can't open it.
- A file that is still processing gets a "still indexing" reply.
- If you're offline, you get an error with a retry button.

**Meeting knowledge.** You can drag files anywhere onto the room or use the file picker. Each file shows uploading, then indexing (or transcribing for audio and video), then ready or failed. Unsupported types and files over 50 MB fail with an explanation. Files are grouped as "From the host" and "From participants". For your own uploads you can choose whether every agent in the room can read them or only your own, and removing one asks you to confirm. A section at the bottom lists which dots and agents can read the shared files.

**Adding agents.** There are four registered LiveKit agents: Scribe, Researcher, Facilitator and Translator. Each shows its LiveKit worker name and briefly shows "Joining…" before it appears. You can remove an agent from its tile or from the dialog, and you can pause or resume Iris.

**Leaving.** A confirmation explains that Iris leaves with you and keeps what it heard. The end screen shows your time in the meeting, a count of people, agents and files, Scribe's action items, a note that the meeting was saved to your memory, and buttons to rejoin or go back to the lobby.

**Light and dark mode.** Both use the KnowMe brand colours and fonts from know-me-system, and every screen has a toggle. It follows your system setting the first time and remembers your choice after that.

Things to know:
- **Two departures from the brand colours, both for readable text.** In light mode, white text on the brand ember (#E04E28) fails contrast. Filled buttons and small ember text therefore use the brand's darker ember-2 (#C13E1E), and small cyan text uses a darker cyan (#0E7490). For the same reason, the Leave button uses #DC2626 in both themes instead of the brand red.
- **Nothing connects to LiveKit.** Other people's video, agent speech, captions, indexing and private-agent answers are all scripted. Your camera, mic check and screen share are real browser features.
- **The people and meeting content are made up.** Avery Chen and the others are fictional, and so are the file contents, page counts and conversatio

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: c2a7429d-1beb-47fe-a334-cde38050dbcd
- Captured: 2026-10-19T13:42:26.023105Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
