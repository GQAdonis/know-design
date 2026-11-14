---
type: SessionRecord
id: karpathy-session-5a93e6bec4148e8a
title: Karpathy session 5a93e6bec414
tags:
- karpathy
- session-learning
sources:
- resource: session:5acda4f9-cfd5-4403-9e0e-2693531a3f4a
generated:
  by: pk/1.11.0
  at: 2026-11-14T17:42:57.341702+00:00
created_at: 2026-11-14T17:42:57.341702+00:00
updated_at: 2026-11-14T17:42:57.341702+00:00
revision: 0
---

## Delta

The HTMX prototype and IPFS deploy work is built and committed on `feat/htmx-prototypes-ipfs-deploy` (9 commits, not pushed). The KBD phase is still open: the close check refused to close it because two required checks haven't been run.

**What works:**
- **IPFS deploy** works from the `od` CLI. The web UI is only covered by component tests so far: I didn't click through it in the app. Both CLI and UI return a pinned CID link and an optional IPNS name for each project.
  - A live deploy of the example prototype is up: [CID link](https://ipfs.prometheusags.ai/ipfs/bafybeib3yf2vw3r4o3dsopvjzpse7pzh442gdi7g67ghf2zis5emiim6d4/) and [IPNS link](https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dl7u934gykrg6x2lxy4s27nbgltvqkvz1jq1hx4nllvxqjhqv9p/).
  - In the packaged app, "Import from shell" read your IPFS credentials from your login shell, and the deploy that followed succeeded.
  - The password never appears in responses or logs. A test plants a known value and checks this.
- **Vendored runtime kit:** htmx 2.0.8, Alpine 3.17.5 and seven htmx extensions, plus the in-page mock router (`od-mock`). The example's full create, edit and delete flow works at the IPFS gateway URL.
- **Template, craft rule and `od-prototype.json` manifest:** the manifest has a schema, a validator, and a deploy-time warning when the routes in the HTML and the manifest disagree.
- **Axum export:** the exported Rust server ran the same page with the full flow working against real handlers.
- **Conversion spec:** the React and Flutter mapping is in [docs/knowdesign/htmx-conversion.md](docs/knowdesign/htmx-conversion.md). The two skill PRs are open and unmerged: Prometheus-AGS/prometheus-skills-mini#86 and Know-Me-Tools/hybrid-mobile-architecture-skill#28.
- `pnpm guard` and `pnpm typecheck` pass, as do the focused tests: daemon 72/72 and web 19/19.

**What's still open:**
- **TPL-1 not run:** no generation run from the template has been done yet.
- **MOCK-1 only partly checked:** the full flow inside the real preview iframe hasn't been run. A quick test in the packaged app did load the scripts there.
  - The web UI opened in an external browser can't load the prototype's scripts in the preview. Chrome blocks sandboxed frames from loading local-server scripts. The packaged app doesn't have this problem.
  - You need to decide whether to accept that (desktop-first) or fix it, either by inlining the scripts for the preview or by serving previews from a real origin.
- **D-008 not built:** the plan said deploying from the hosted web surface should require a signed-in member. That isn't implemented because no surface mechanism exists in the code yet. Deploy currently uses the same permission check as Vercel and Cloudflare, and that needs your OK.
- **`.kimi-code` keeps getting deleted:** every OpenSpec refresh deletes the tracked `.kimi-code/skills` files. I restored them before each commit, but this needs a permanent fix: either untrack the folder or pin the integration.
- **Unreviewed suggestions:** the knowledge tool has pending promotion and skill suggestions. I left them untouched; they only change if you tell me to accept or reject them.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 5acda4f9-cfd5-4403-9e0e-2693531a3f4a
- Captured: 2026-11-14T17:42:47.866717Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
