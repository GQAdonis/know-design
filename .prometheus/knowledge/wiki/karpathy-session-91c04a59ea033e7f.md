---
type: SessionRecord
id: karpathy-session-91c04a59ea033e7f
title: Karpathy session 91c04a59ea03
tags:
- karpathy
- session-learning
sources:
- session:46bafb74-43c6-46e7-9603-df21683327c3
timestamp: 2026-09-05T13:09:07.519644+00:00
created_at: 2026-09-05T13:09:07.519644+00:00
updated_at: 2026-09-05T13:09:07.519644+00:00
revision: 0
---

## Delta

**Partly. It generates mobile + desktop together, but not a browser web app.**

Here's the manifest, which is the authoritative answer ([builder.manifest.json:29](../../hybrid-mobile-architecture-src/builder.manifest.json)):

```json
"sovereign-hybrid": {
  "surfaces": ["flutter-mobile", "tauri-desktop", "rust-core"],
  "uarMode": "hybrid",
  "runnableVerticalSlice": true
}
```

Three surfaces in one generation, sharing one Rust core. But `react-web` is not among them — that surface belongs to `governed-web-shell` and `axum-web`, which pair `react-web` with `axum-bff`.

## The "web" ambiguity is the trap

`sovereign-hybrid` *does* contain React — but as the **Tauri desktop renderer**, not a deployable website. The profiles doc is explicit: *"Tauri and React own desktop presentation."* You get React screens that run inside the desktop shell, talking to Rust over Tauri commands. Point a browser at them and there is no `window.__TAURI__`, no command bridge, and no backend — because `sovereign-hybrid` has no BFF. The two web-capable profiles both include `axum-bff` precisely because a browser needs a server-side boundary that a desktop app doesn't.

So: if "web" means *your desktop UI is built with web tech*, yes. If it means *a URL a user visits*, no.

## Why it isn't just a config flag

The blocker is `uarMode`, and it's a genuine architectural split rather than a packaging one:

| Profile | uarMode | What that means |
|---|---|---|
| `sovereign-hybrid` | `hybrid` | UAR **embedded** in-process on mobile; service/in-process facade on desktop |
| `governed-web-shell` / `axum-web` | `service` | UAR behind a server; browser never holds the runtime |

Embedded UAR means the agent runtime, model routing, and tool governance live inside the app process — which is what makes the profile "sovereign" and local-first. A browser tab cannot host that. It must reach a service, and that service must derive actor and tenant from verified identity (the `governed-web-shell` decisions list is emphatic: *"Axum derives actor and tenant from verified identity"*). That's a different authorization model, not a different build target.

## If you need all four surfaces

The doc anticipates this and gives a specific instruction — worth heeding, because the failure mode is inventing a half-profile:

> If answers span both major profiles, do not invent a new implicit profile. Adopt the closest profile and record explicit project-local additions in the policy overlay and generated ownership state.

Practically, two options:

1. **Generate `sovereign-hybrid`, add the web surface as a declared overlay addition.** You keep one Rust core and one token source; you add an Axum BFF and a browser React target as recorded extensions. This is the sanctioned path.
2. **Two generations against one design system.** `sovereign-hybrid` for mobile+desktop, `governed-web-shell` for the browser, both fed by the same `tokens.toml`. Cleaner architecturally, but you now maintain two Rust boundaries and must decide which owns durable state.

There's also `--mode skeleton`, which *may* contain unsupported surfaces — but each gap must be declared in the manifest and generated docs. That's a way to stub the web surface honestly, not a way to get it for free.

## Bearing on the OD handoff

This changes step 2 of the sequence I gave you. Before choosing a profile, sort your OD screens by **delivery surface**, not just by destination:

- Phone-form screens → Flutter
- Desktop-window screens → Tauri/React
- Screens someone opens at a URL → a web surface `sovereign-hybrid` won't generate

If your OD session produced all three, you've discovered a profile decision — and it's better to find it now, from the screen inventory, than after `knowme-builder new` has committed you to a boundary. The `tokens.toml` transcription is unaffected either way; it feeds every surface regardless of how many generations you end up running.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 46bafb74-43c6-46e7-9603-df21683327c3
- Captured: 2026-09-04T00:13:37.678931Z
- Project: /Users/gqadonis/Projects/references/open-design

## Changed Paths

- No changed paths detected.
