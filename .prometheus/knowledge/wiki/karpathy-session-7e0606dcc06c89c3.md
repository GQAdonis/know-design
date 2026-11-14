---
type: SessionRecord
id: karpathy-session-7e0606dcc06c89c3
title: Karpathy session 7e0606dcc06c
tags:
- karpathy
- session-learning
sources:
- resource: session:3ca2df01-20f4-4838-82df-88486d5190b9
generated:
  by: pk/1.11.0
  at: 2026-10-20T14:53:19.436157+00:00
created_at: 2026-10-20T14:53:19.436157+00:00
updated_at: 2026-10-20T14:53:19.436157+00:00
revision: 0
---

## Delta

I added a link-preview card and republished, so sharing the stable link should now show a preview card. I checked that the gateway serves both the new page and the image (200, `image/png`). I haven't tested how Slack, iMessage or X actually render the card.

**Share this link (unchanged):**
https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dkruhr6deso7sb43vt9vprqe8hkzcb5jdg3g1o45688c4a2brl6/

- **The image:** `assets/og-home.png`, 1200 × 630, captured from the prototype's Home view. It shows "Your node is running", the three waiting decisions and the assistant pane.
  https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dkruhr6deso7sb43vt9vprqe8hkzcb5jdg3g1o45688c4a2brl6/assets/og-home.png
- **The tags:** I added Open Graph and Twitter card tags to `index.html`: title "Promethity — node and agent redesign", a short description, alt text for the image, and the large-image card type. The image is referenced by the stable IPNS address, so it keeps working after future republishes.
- **This build:** https://ipfs.prometheusags.ai/ipfs/bafybeic4f6zad4vbusxh7essd7snlpbbef3zha73qptj5zl2s2qqeqhev4/

If a chat app already cached the link before this update, it may keep showing the old preview with no image for a while.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 3ca2df01-20f4-4838-82df-88486d5190b9
- Captured: 2026-10-20T14:40:30.225884Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
