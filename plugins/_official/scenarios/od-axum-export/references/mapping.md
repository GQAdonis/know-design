# Prototype → Axum mapping

| Prototype (page) | Exported server |
|---|---|
| `<template data-od-route="POST /api/tasks">` | One entry in `routes.json` (`method`, `path`, `axumPath` = `/api/tasks/{id}` style) and `templates/NN_post_api_tasks.html` |
| Several templates on one route (guards) | Several `routes.json` entries in page order; the server tries them in that order |
| `data-od-when` / `data-od-when-not` | `when` / `whenNot`, evaluated with the same truthiness (empty, `false`, `0`, `off`, empty list are false) |
| `data-od-action="create:tasks"` etc. | `action`; same semantics (create assigns the next numeric id, update merges fields, delete removes, toggle flips a boolean) |
| `data-od-item="tasks"` | `item`; loads the record at `{id}` or answers 404 |
| `data-od-status`, `data-od-headers` | `status`, `headers` (e.g. `HX-Trigger`), exposed through CORS so htmx can read them |
| `{{item.title}}` | `{{ item.title }}`, auto-escaped (`.html` templates) |
| `{{data.tasks.length}}` | `{{ data.tasks\|length }}` |
| `data-od-each="data.tasks"` | `{% for item in data.tasks %}…{% endfor %}` with `index` = `loop.index0` |
| `data-od-if` / `data-od-unless` | `{% if … %}` / `{% if not … %}` |
| `<script id="od-mock-data">` | `seed.json`, loaded into the in-memory store at start |
| The page | `site/index.html` with route templates and seed removed and `<meta name="od-backend" content="http://127.0.0.1:<port>">` added; served by the same server |
| `od-prototype.json` | Copied unchanged; the React and Flutter conversions read it |

Scope that does not carry over automatically: SSE streams (`hx-ext="sse"`), file uploads, and anything the prototype faked in Alpine. Implement those as new handlers.
