# Converting htmx + Alpine prototypes to Axum, React and Flutter

KnowDesign prototypes made with the `htmx-alpine-prototype` template ship an `od-prototype.json` manifest next to the page (schema: `design-templates/htmx-alpine-prototype/references/od-prototype.schema.json`). The manifest, not the HTML, is the conversion contract. Every field below maps to one target construct, so conversion is mechanical. Anything the mapping cannot express is listed as a gap, not dropped silently.

## Pipeline

```
prototype (index.html + od-prototype.json, validated)
  ├─▶ Axum fragment server   plugins/_official/scenarios/od-axum-export   (same page, real handlers)
  │      └─▶ JSON API         same routes, JSON responses, for app clients
  ├─▶ React 19 app           convert-htmx-react + scaffold-react-vite      (calls the JSON API)
  └─▶ Flutter app            hybrid-mobile-architecture mini-app-module + scaffold-flutter-a2ui
```

Order matters. Export to Axum first: it gives every route a real handler and keeps the HTML client working. A JSON variant of the same handlers then serves React and Flutter, which reuse the manifest's route and entity names.

## Field mapping

### `routes[]`

| Manifest | Axum | React (TanStack Query) | Flutter |
|---|---|---|---|
| `method`+`path`, `kind: list` | `GET` handler, fragment + JSON variant | `useQuery({ queryKey: [entity] })` | `Repository.list()` |
| `kind: detail` | `GET /{id}` | `useQuery({ queryKey: [entity, id] })` | `Repository.get(id)` |
| `kind: create` | `POST` handler; `fields` → request struct | `useMutation` + invalidate `[entity]` | `Repository.create(input)` |
| `kind: update` | `PUT/PATCH /{id}` | `useMutation` + invalidate `[entity]`, `[entity, id]` | `Repository.update(id, input)` |
| `kind: delete` | `DELETE /{id}` | `useMutation` + optimistic removal | `Repository.delete(id)` |
| `kind: toggle` | `POST /{id}/toggle` | `useMutation` + optimistic flip | `Repository.toggle(id)` |
| `kind: form` | (HTML only: an editing fragment) | Component local edit state | Widget edit mode |
| `responses[].status: 422` + `when` | Validation in the handler | Field errors from the mutation error | Form validator |
| `responses[].triggers` (`HX-Trigger`) | Response header | Callback on mutation success | Event on the module bus (`mini-app-module` event contract) |
| `responses[].oob` | Extra fragments in the response | Derived from the same query cache | Derived from repository state |
| `params`, `fields` | `Path`, `Form`/`Json` extractors | Hook arguments / mutation variables | Method parameters |

### `components[]`

| Manifest | React | Flutter |
|---|---|---|
| `name` | `<Name>.tsx` component | `Name` widget |
| `entity` + `repeats: true` | Row component mapped over the list query | `ListView.builder` item widget |
| `routes` | The hooks the component calls | The repository calls its view model makes |
| `listens` | `onSuccess` handlers / event subscriptions | Bus subscriptions |

### `state[]` (Alpine `x-data`)

| Manifest | React | Flutter |
|---|---|---|
| `{ component, fields: { open: "boolean" } }` | `useState<boolean>(false)` in that component; a Zustand slice only if shared | `StatefulWidget` field, or a `ValueNotifier` when shared |

### `entities[]`

| Manifest field type | TypeScript | Rust (serde) | Dart |
|---|---|---|---|
| `string`, `text`, `url`, `email` | `string` | `String` | `String` |
| `number` | `number` | `f64` (or `i64` when integral) | `num` |
| `boolean` | `boolean` | `bool` | `bool` |
| `date`, `datetime` | `string` (ISO 8601) | `chrono::NaiveDate` / `DateTime<Utc>` | `DateTime` |
| `id` | `string` | `String` | `String` |

Entity names become the `mini-app-module` manifest's entity types and the React query keys.

### `tokens`

`roles` use the hybrid-design-tokens role names (`canvas`, `chrome`, `surface`, `raised`, `hover`, `text`, `muted`, `accent`, `destructive`, `focus`, `space-*`, `radius`, `duration-*`, `ease-*`). Copy their values from `tokens.source` into `tokens.toml`. Then `gen-design-tokens.mjs` emits the shadcn/Tailwind variables (React) and `tokens.dart` (Flutter) from that one source.

## Skill changes

- **convert-htmx-react** (source: `Prometheus-AGS/prometheus-skills-mini`, `skills/convert-htmx-react`): accept `--manifest od-prototype.json`. With it, every `hx-*` attribute whose `METHOD path` is a manifest route becomes a call to a generated hook (`use<Entity>List`, `useCreate<Entity>`, …) instead of an entry in the ambiguous-sidecar file. Components are split by `data-od-component`, and `state[]` produces `useState` declarations.
- **hybrid-mobile-architecture** (source: `hybrid-mobile-architecture-src`, `skills/mini-app-module`): accept an `od-prototype.json` as the seed for a mini-app manifest. Routes become the module's route and repository contract, entities its entity types, triggers its event contracts. Tokens go to `hybrid-design-tokens`.

## Known gaps

- `responses[].oob` describes which regions change, not how the client should derive them. React and Flutter derive them from cache or state, which needs a human check.
- SSE (`hx-ext="sse"`) and file uploads are not described by the manifest yet.
- Authentication and authorization are out of the prototype's scope. `mini-app-module` requires verified identity and policy for server mutations, so they must be added at conversion time.
- The JSON variant of the Axum handlers is not generated yet. The exported server returns fragments only.
