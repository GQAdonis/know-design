# HTMX + Alpine prototype design template and craft rule

## Why

No template or rule steers generation toward working HTMX prototypes. A design template and craft rule reach both prompt paths without editing upstream prompt text.

## What Changes

Add `design-templates/htmx-alpine-prototype/` (SKILL.md, assets/template.html, references/conventions.md, example.html) and `craft/htmx-alpine-runtime.md`. Plan change 3; scenario TPL-1.

## Findings

- **OD Next staging (task 1, resolves the assessment UNKNOWN):** OD Next freezes only side files that the selected Skill's `SKILL.md` body names explicitly (`assets/…`, `references/…`, `scripts/…`, `examples/…`, plus `example.html`), capped at 32 files, 256 KB each, 1 MB total (`apps/daemon/src/strategies/od-next/frozen-skill-package.ts`, `explicitSideFileRoster`). Legacy runs copy the whole template folder into `.od-skills/<folder>/`. The template's `SKILL.md` therefore lists every vendored file by path: 23 files, about 183 KB, within all limits. No inline fallback is needed for OD Next; API/BYOK mode keeps the CDN fallback.
- **od-mock additions made while writing the example:** `data-od-when` / `data-od-when-not` route guards (needed for the validation-error state) and `data-od-item` (needed for edit-in-place). Both are covered by tests.
- **Browser check:** `example.html` served over HTTP in Chromium. List, validation, create with OOB count, toggle, inline edit, delete and the Alpine-only panel all worked; the network log showed only the page and its vendored scripts.
