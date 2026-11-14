# htmx + Alpine prototype conventions

These conventions make the prototype work today with no backend, and make it convertible later with no redesign: the same routes become Axum handlers, React query hooks or Flutter repository calls. Follow them literally.

## 1. Two kinds of state

| State | Where it lives | Converts to |
|---|---|---|
| **Server state**: anything a real app would store (records, counts, validation) | `od-mock-data` + `hx-*` requests to `/api/...` routes | Axum handler + repository; React TanStack Query; Flutter repository |
| **UI state**: open/closed, selected tab, a draft field, a toggle that is never saved | Alpine `x-data` on the smallest element that needs it | React `useState`; Flutter widget state |

Never fetch JSON for Alpine to render. Never keep server records in `x-data`.

## 2. Routes

- One `<template data-od-route="METHOD /api/<resource>[/:id]">` per interaction. Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Paths are **root-relative** and start with `/api/`. Resources are plural nouns: `/api/tasks`, `/api/tasks/:id`, `/api/tasks/:id/comments`.
- The template body is the HTML **fragment** the server returns, not a whole page.
- Writes declare `data-od-action`:
  - `create:<list>` appends an item built from the form fields; it gets an `id`.
  - `update:<list>` merges form fields into the item at `:id`.
  - `delete:<list>` removes the item at `:id`.
  - `toggle:<list>:<field>` flips a boolean field on the item at `:id`.
- Read one record with `data-od-item="<list>"` on a `GET /api/<list>/:id` route; the record is `item` in the template (404 when missing).
- Guards: several templates may share a route; they are tried in document order and `data-od-when="form.title"` / `data-od-when-not="form.title"` skip a template unless the path is truthy / falsy. Put the 422 template (`data-od-when-not="form.title"`) before the create template.
- Options: `data-od-status="422"` for validation errors, `data-od-delay="250"` to show loading states, `data-od-headers='{"HX-Trigger":"task-saved"}'` for events other parts of the page listen to.
- Interpolate with `{{path}}` (always escaped). Scope: `params`, `form`, `query`, `data`, `item`, `index`. Repeat with `data-od-each="data.tasks"`, show/hide with `data-od-if` / `data-od-unless`.
- Multi-region updates use `hx-swap-oob="true"` elements inside the fragment (for example a counter).
- Every request the page can make has a route. A missing route answers 404 and logs `No mock route for …`.

## 3. Markup

- Put `hx-ext="response-targets, loading-states"` (and any other extension you use) on `<body>`. Extensions run for the swap target, so per-element `hx-ext` is unreliable.
- Use `hx-target` with an `id` selector and an explicit `hx-swap`. Prefer `outerHTML` for single records, `beforeend` for appends, `innerHTML` for lists.
- Forms submit with `hx-post` / `hx-put`; inputs carry `name` attributes that match the entity's field names exactly.
- Validation errors: a `data-od-status="422"` route and `hx-target-422="#form-errors"` on the form.
- Loading: an element with class `htmx-indicator` inside the requesting element, or `hx-indicator="#id"`.
- Confirm destructive actions with `hx-confirm`.
- Mark every component root with `data-od-component="PascalName"` (`TaskList`, `TaskRow`, `TaskForm`). Names become React components and Flutter widgets.
- Mark repeated records with `id="<entity>-{{item.id}}"`.
- No inline `<script>` inside route templates or swapped fragments. Page-level behaviour goes in Alpine attributes.
- Do not use `hx-push-url` / `hx-boost` page navigation; the preview frame cannot change its own history. Use one page with sections, or separate pages with plain links.

## 4. Alpine

- Keep each `x-data` small and flat: `x-data="{ open: false, tab: 'all' }"`. Literal values only; no functions with logic.
- Change state with plain assignments: `@click="open = !open"`, `@click="tab = 'done'"`.
- Show text with `x-text="identifier"` and visibility with `x-show="open"`.
- Combine with htmx through events, not shared data: `@task-saved.window="open = false"` closes a dialog after the server confirms.
- Add `x-cloak` to elements that should stay hidden until Alpine starts.

## 5. Tokens and layout

- Use the role-named CSS variables from `assets/template.html` (`--canvas`, `--chrome`, `--surface`, `--raised`, `--hover`, `--text`, `--muted`, `--accent`, `--destructive`, `--focus`, `--space-*`, `--radius`, `--duration-*`, `--ease-out`). Map them to the active design system's values in `:root`; do not hardcode colours anywhere else. These names match the hybrid-design-tokens roles so the same palette compiles to React and Flutter themes.
- Flat 2.0: separate regions with background colour only. No borders, dividers or layout shadows.
- Semantic HTML first: `nav`, `main`, `section` with `aria-labelledby`, real `button` and `label` elements.

## 6. When files cannot be copied (CDN fallback)

Only when the agent has no filesystem access (API mode), load the same versions from jsDelivr with Subresource Integrity, in this order, and note in the page that it needs network access:

```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/htmx-ext-response-targets@2.0.4/dist/response-targets.min.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/htmx-ext-loading-states@2.0.2/dist/loading-states.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.17.5/dist/cdn.min.js" crossorigin="anonymous"></script>
```

`od-mock.js` has no CDN copy; inline the contents of `assets/vendor/od-mock.js` in a `<script>` after htmx. Take each `integrity` value from `assets/vendor/MANIFEST.json` (`sha256` → base64) when adding SRI.

## 7. Conversion map (for reference)

| Prototype | Axum | React | Flutter |
|---|---|---|---|
| `GET /api/tasks` route template | handler returning `Html<String>` from the same fragment | `useQuery(['tasks'])` | `TaskRepository.list()` |
| `POST /api/tasks` + `create:tasks` | handler inserting via repository | `useMutation` + cache invalidation | `TaskRepository.create()` |
| `data-od-component="TaskRow"` | template partial | `TaskRow.tsx` | `TaskRow` widget |
| `x-data="{ open: false }"` | (client only) | `useState(false)` | widget state |
| `--accent` etc. | static CSS | shadcn/Tailwind theme vars | `tokens.dart` |
