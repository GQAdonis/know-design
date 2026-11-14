---
type: SessionRecord
id: karpathy-session-d988d69c8b2e68b2
title: Karpathy session d988d69c8b2e
tags:
- karpathy
- session-learning
sources:
- resource: session:d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
generated:
  by: pk/1.11.0
  at: 2026-10-20T00:36:58.466075+00:00
created_at: 2026-10-20T00:36:58.466075+00:00
updated_at: 2026-10-20T00:36:58.466075+00:00
revision: 0
---

## Delta

<od-focus key="b84013614824fa90" show="server-interfaces.md"/>
<od-done key="b84013614824fa90"/>

I've added a "Proposed KnowDesign routes" section to `server-interfaces.md`, between the existing route tables and "Local only". None of these routes exist yet in the daemon or the hub. Each table row gives the route, its request and response shape, the prototype screen that uses it, and any rules.

- **Project access (daemon):** read the access list, switch workspace-wide viewing on or off, set view/edit per person, remove people, invite and revoke, and request access.
- **Project lifecycle (daemon):** the new fields on the existing `PATCH /api/projects/:id` (`description`, `agent`, `model`, `archived`), and a new `POST /api/projects/:id/duplicate` route.
- **Releases (hub):** create, list (live, expired or revoked), view, extend, revoke, and a proposed `HubRelease` type that extends `hub.ts`. Only whether a passcode is required is ever returned, never the passcode itself.
- **Customer view (hub, public):** `GET /c/:slug`, which returns 410 for expired or revoked links so the page can say which. Also passcode unlock, which returns 429 after 5 wrong tries a minute, and customer comments.

**Blocker for project access:** checking these permissions on every project route needs the daemon to know who is making each request. The current deployment phase only adds sign-in at the edge, and no table records an owner. So per-project access can't be enforced until the per-user data-isolation work that phase leaves out is done. The doc says this in the project access section.

The section also suggests reviewing these routes and adding them to the hub's OpenAPI file (`docs/contract/openapi.yaml` in `Know-Me-Tools/know-design-hub`) before building them.

<open-design-runtime-state>
{
  "executionIntent": "produce",
  "executionMode": "simple",
  "inputStage": "request",
  "outcome": "completed",
  "reasonCodes": [],
  "route": "direct_edit",
  "schema": "open-design.strategy-state/v2"
}
</open-design-runtime-state>

<od-next key="b84013614824fa90" value="Turn the proposed hub release routes into an OpenAPI 3.1 draft file"/>
<od-next key="b84013614824fa90" value="Add the HubRelease type to packages/contracts/src/api/hub.ts in the repo"/>
<od-next key="b84013614824fa90" value="Add a Studio watch-a-teammate flow to storyboard.html"/>

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: d4c0514a-574c-4fa6-b65e-3f22d5c99c2a
- Captured: 2026-10-20T00:36:38.765156Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
