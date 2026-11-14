---
type: SessionRecord
id: karpathy-session-419d2e09329f4774
title: Karpathy session 419d2e09329f
tags:
- karpathy
- session-learning
sources:
- resource: session:e40aa98d-c20a-4fce-b869-17f8b90678f6
generated:
  by: pk/1.11.0
  at: 2026-10-21T00:56:28.647797+00:00
created_at: 2026-10-21T00:56:28.647797+00:00
updated_at: 2026-10-21T00:56:28.647797+00:00
revision: 0
---

## Delta

Here's the plan. I've confirmed the inputs: the earlier IPFS publish script and credentials file (`~/.config/prometheus/ipfs-rpc.env`) are on this machine, and Playwright's Chromium is installed for screenshots.

## Plan

**1. Landing page: `design/index.html`.** A single brand home for the kit, built with the same tokens, type and Quiet signal mark. Sections:
- **Hero:** the lockup on the left and a large live signal mark on the right that switches between silent and signal when clicked.
- **Kit cards:** one each for the brand guide, moodboard, starter template and README. Each shows a preview, says what the page is for, and links to it.
- **Logo and wordmark gallery:** every SVG from `logo/` and `wordmarks/`, each on its intended background, as a download link.
- **Tokens:** links to `tokens.css`, `tokens.json` and `locus_tokens.dart`, plus the presence-icon code snippet.
- **Footer:** version, source and font licences.

I'll also add a "← Brand home" link to the guide, moodboard and template, so every page links back.

**2. OpenGraph image: `design/og-image.png` (1200×630).** It's built from a small source page, `design/og/og-card.html`, and captured with headless Chromium. It shows the dark canvas, the horizontal lockup at large size and the line "The dot lives with you."

**3. Landing screenshots: `design/screenshots/`.** I'll capture the landing page at 1440px and 375px with the same Chromium.

**4. IPFS publish, in the order you described:**
1. Upload `og-image.png` on its own to the Prometheus IPFS node (`rpc.prometheusags.ai`), pinned, and get its CID.
2. Create or find a stable IPNS key, `knowme-locus-brand`, which gives a permanent address.
3. Write the OpenGraph and Twitter tags into `index.html`: title, description, `og:image` pointing at the absolute gateway URL of the uploaded image (with width and height), and `og:url` pointing at the IPNS address.
4. Upload the whole `design/` folder as one directory. All pages link to each other with relative paths, so the links work at `…/ipfs/<cid>/` and `…/ipns/<name>/` alike.
5. Point the IPNS name at that directory.
6. Save a reusable `design/publish-ipfs.sh` that reads credentials only from the environment or credentials file and never writes them anywhere.

**5. Copy to the target folder.** I'll copy the final `design/` folder into `/Users/gqadonis/Projects/know-me/locus/docs/design/`, including the landing page, OG image, screenshots and publish script. Nothing gets committed.

**6. What I'll report back:** the stable IPNS link, the build-specific IPFS link, the OG image URL and the screenshot paths.

**Assumptions and risks:**
- An earlier session found the IPFS console asking for KnowMe sign-in, though later publishes worked. If the RPC rejects the stored credentials, I'll stop at that point, leave everything else built and saved, and tell you exactly what failed.
- A new IPNS name can take a few minutes to resolve through the gateway. The direct `/ipfs/<cid>/` link works immediately.

<od-production-ready key="36e5e77a860be179" />

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e40aa98d-c20a-4fce-b869-17f8b90678f6
- Captured: 2026-10-21T00:55:42.525767Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
