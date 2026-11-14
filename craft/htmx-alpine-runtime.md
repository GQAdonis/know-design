# htmx + Alpine runtime craft rules

Rules for prototypes that must work, not just look right: server interactions
are real htmx requests answered in the page by the `od-mock` router, and
client-only state lives in Alpine. They apply wherever a skill or template
loads the htmx + Alpine runtime. The active `DESIGN.md` decides how things
look; this file decides how they behave and how they are structured so they
convert cleanly into a server-rendered app, React or Flutter later.

## The behaviour contract

| Rule | Why |
|---|---|
| Every control in the brief works: buttons act, forms submit, lists change | A prototype that only looks interactive fails review the first time someone clicks |
| Every htmx request has a matching `<template data-od-route>` | An unanswered request shows "No mock route" instead of the result |
| Writes change the store (`data-od-action`), and the next read shows the change | Created, edited and deleted records must stay that way while the page is open |
| No request leaves the page: no external API calls, no `fetch` to real hosts | The preview frame and IPFS gateways have no backend; external calls fail there |
| No history changes (`hx-push-url`, `hx-boost` navigation) | The sandboxed preview cannot rewrite its own history |

## Server state vs UI state

- **Server state** (anything a real app stores) goes through `hx-*` requests to root-relative `/api/...` routes, with seed records in `<script type="application/json" id="od-mock-data">`.
- **UI state** (open/closed, selected tab, a draft) goes in the smallest possible Alpine `x-data`, with literal values and plain assignments.
- Never fetch JSON for Alpine to render, and never keep server records in `x-data`.
- htmx and Alpine talk through events: a route's `HX-Trigger` header, and Alpine listening with `@event-name.window`.

## Structure that converts

- Mark every component root `data-od-component="PascalName"`; mark repeated records `id="<entity>-{{item.id}}"`.
- Route fragments are partial HTML, never whole pages, and contain no inline `<script>`.
- Form field `name`s match the entity's field names exactly; the same names appear in the seed data.
- Use one route per interaction with plural resource paths (`/api/tasks`, `/api/tasks/:id`).
- Colours, spacing, radius and motion use the role-named CSS variables (`--canvas`, `--surface`, `--accent`, `--space-*`, `--radius`, `--duration-*`); nothing below `:root` hardcodes a colour.

## States, the htmx way

| State | How |
|---|---|
| Loading | `.htmx-indicator` inside the requester, plus `data-od-delay` on the route so it is visible |
| Empty | `data-od-unless="data.<list>"` content in the list route, refreshed by an out-of-band swap after deletes |
| Error | A guarded route (`data-od-status="422"` + `data-od-when-not="form.<field>"`) and `hx-target-422` on the form; keep the user's input |
| Success | Swap the changed record, update counters out of band, and fire `HX-Trigger` for anything else that reacts |

## Runtime loading

- Script order in `<head>`: htmx, extensions, `od-mock.js`, then Alpine with `defer`.
- Put `hx-ext` on `<body>`; extensions run for the swap target, not only the element that made the request.
- Load the runtime from the project's own `vendor/` folder so the page works offline and on IPFS. Use a pinned CDN with integrity hashes only when files cannot be copied.
- To run against a real server later, add `<meta name="od-backend" content="<base URL>">`; nothing else in the page changes.
