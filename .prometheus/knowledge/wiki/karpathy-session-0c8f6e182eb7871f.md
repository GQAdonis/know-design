---
type: SessionRecord
id: karpathy-session-0c8f6e182eb7871f
title: Karpathy session 0c8f6e182eb7
tags:
- karpathy
- session-learning
sources:
- resource: session:e40aa98d-c20a-4fce-b869-17f8b90678f6
generated:
  by: pk/1.11.0
  at: 2026-10-21T01:01:37.095611+00:00
created_at: 2026-10-21T01:01:37.095611+00:00
updated_at: 2026-10-21T01:01:37.095611+00:00
revision: 0
---

## Delta

<od-focus key="16facd85609889a7" open="design/index.html" show="design/index.html, design/og-image.png, design/screenshots/landing-1440.png, design/screenshots/landing-375.png"/>

<od-done key="16facd85609889a7"/>

The brand kit is live on IPFS, and every page and file returned HTTP 200 from the gateway.

**Share this link:** https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dj2amu2cfz96e847vsomwbxv3swpu5ojut7yh6y1y7i7k8ojp1i/

The stable link stays the same when you publish again. The other addresses:
- **This exact version:** https://ipfs.prometheusags.ai/ipfs/bafybeiesvfltmlazgan4ohroolaebkhk3yrkijnqbsrnffzvo4lcakigda/
- **Brand guide:** …/branding-guide.html
- **Moodboard:** …/moodboard.html
- **Template:** …/brand-template/template.html
- **OpenGraph image:** https://ipfs.prometheusags.ai/ipfs/bafkreihhmqqm2eesx625bltifjzepvped322fvnqhqn5kydx3rju7ctm7e

**What I built:**
- **Landing page (`index.html`):**
  - The headline "The dot lives with you." next to a large mark you can click to switch between signal and silent.
  - Cards linking the brand guide, moodboard, starter template and README.
  - A download gallery of all 18 logo and wordmark files.
  - The token files, plus the code snippet for the status icon.
- **Back links:** the guide, moodboard and template each now have a "← Brand home" link.
- **OpenGraph image (`og-image.png`, 1200×630):** the lockup, the headline and the large mark on the dark background. Its source is `og/og-card.html`.
- **Landing screenshots in `screenshots/`:** full-page captures at 1440px in dark and light, and at 375px. Looking at the first ones led me to two fixes:
  - The landing page now opens in the signal state, so the hero shows the whole mark instead of a lone orange circle.
  - The logo gallery shows two columns on phones.

**How the publish worked:**
1. The OpenGraph image went up on its own first, to get its address.
2. That address and the stable link went into the landing page's OpenGraph and Twitter tags. I checked that they're present in the published page.
3. All 48 files went up as one folder, and the stable link now points to it.

`publish-ipfs.sh` repeats all of this whenever you want to publish a new version. It reads credentials from `~/.config/prometheus/ipfs-rpc.env` and never writes them anywhere.

**Saved in the target folder:** everything above is copied to `/Users/gqadonis/Projects/know-me/locus/docs/design/`, along with the generator scripts in `source/`. Nothing is committed.

**Gaps:**
- I added the published links to `README.md` after the upload, so the README on IPFS doesn't have them yet. Running `./publish-ipfs.sh` again fixes that, and the stable link stays the same.
- Only the landing page and OpenGraph card were checked in a browser. The guide, moodboard and template haven't been visually checked.
- I haven't tested how the link preview appears in Slack, X or iMessage.

<od-next key="16facd85609889a7" value="Republish the kit so the README on IPFS includes the live links"/>
<od-next key="16facd85609889a7" value="Screenshot the brand guide and moodboard at 1440 and 375 and fix anything that breaks"/>
<od-next key="16facd85609889a7" value="Add the Locus favicon and OpenGraph tags to locus.html in the architecture docs"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: e40aa98d-c20a-4fce-b869-17f8b90678f6
- Captured: 2026-10-21T01:01:05.071077Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
