# React and Flutter conversion specs from od-prototype.json

## Why

`convert-htmx-react` sends every `hx-*` attribute to a TODO sidecar, and the hybrid-mobile-architecture skills do not read HTMX at all. A manifest-driven mapping makes conversion mechanical.

## What Changes

Write `docs/knowdesign/htmx-conversion.md` mapping every manifest field to React and Flutter targets; open PRs in `Prometheus-AGS/prometheus-skills-mini` (`convert-htmx-react`) and `hybrid-mobile-architecture-src` to consume the manifest. Plan change 6; scenario CONV-1.

## Delivered

- `docs/knowdesign/htmx-conversion.md`: field-by-field mapping, pipeline order and known gaps.
- Prometheus-AGS/prometheus-skills-mini#86: `convert-htmx-react --manifest` writes typed TanStack Query hooks and names the hook for matching `hx-*` calls.
- Know-Me-Tools/hybrid-mobile-architecture-skill#28: `mini-app-module` documents seeding a manifest from `od-prototype.json` (documentation only).
