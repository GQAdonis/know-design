# Tasks: prototype-manifest

## 1. Implementation

- [x] 1.1 JSON Schema (routes, components, state, entities, tokens) and `validate-manifest.ts` enforcing route-set equality with the HTML `data-od-route` templates.
- [x] 1.2 Contracts preflight warning code `PROTOTYPE_MANIFEST_MISMATCH`; daemon preflight check; focused daemon test `deploy-prototype-manifest.test.ts`.
- [x] 1.3 Update the template's SKILL.md, conventions and example so every generation writes `od-prototype.json` with all five sections; ship the example's manifest; validate a real generation's output.
