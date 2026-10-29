# What an Open Design compliant server has to serve

Upstream Open Design has no separate server. The daemon (`apps/daemon`, port 7456 in the Docker image) is the server, and the web client (`apps/web`) talks only to its `/api/*` routes. Vela is the upstream hosted cloud for accounts, teams, billing and publishing. A KnowDesign server that replaces the backend has to answer the same `/api/*` contract. In KnowDesign, Kratos/flint-gate takes over sign-in from Vela, and the review hub (`review.know-me.tools`, `packages/contracts/src/api/hub.ts`) takes over publishing.

The route lists below come from `app.<method>('/api/…')` registrations in this fork's `apps/daemon/src`, and type names from `packages/contracts/src/api`. The daemon registers about 400 routes. This page groups the ones the web client, the admin console and the review flow need.

**Status:**
- **Kept:** the KnowDesign server serves it as upstream does.
- **Replaced:** served by a KnowDesign service instead.
- **Removed:** dropped in KnowDesign.
- **Local only:** only makes sense for a desktop daemon.

## Server and runs

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Health, version | `GET /api/health`, `GET /api/ready`, `GET /api/version`, `GET /api/daemon/status` | Admin › Status & health | Kept |
| Database | `GET /api/daemon/db`, `POST /api/daemon/db/verify`, `POST /api/daemon/db/vacuum` | Admin › Status & health | Kept (Postgres in cloud) |
| Shutdown | `POST /api/daemon/shutdown` | Admin › Status & health (danger zone) | Kept, admin only |
| Runs | `GET /api/runs`, `GET /api/runs/active-count`, `POST /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/events`, `GET /api/runs/:id/agui`, `POST /api/runs/:id/cancel`, `POST /api/runs/:id/steer`, `POST /api/runs/:runId/replay`, `GET /api/runs/:id/result-package` | Admin › Runs, Projects › Runs | Kept. In the cloud, the agent behind a run is UAR (`POST /api/uar/ag-ui/agents/{id}`), not a CLI |
| Generative UI | `GET /api/runs/:runId/genui`, `POST /api/runs/:runId/genui/:surfaceId/respond` | Studio approval cards | Kept |
| Conformance | read-only `GET`s across the areas below | Admin › Server conformance | Prototype tool |

## Projects (the client)

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` | Projects | Kept |
| Files | `GET /api/projects/:id/files`, `GET /api/projects/:id/files/:name/preview`, `POST /api/projects/:id/files/rename`, `DELETE /api/projects/:id/files/:name` | Projects › Files | Kept |
| Export | `POST /api/projects/:id/export`, `/export/html`, `/export/pdf`, `/export/pptx`, `/export/image`, `GET /api/projects/:id/export/manifest` | Projects › Share and deploy | Kept |
| Deploy | `POST /api/projects/:id/deploy/preflight`, `POST /api/projects/:id/deploy`, `GET /api/projects/:id/deployments`, `GET/PUT /api/deploy/config`, `GET /api/deploy/cloudflare-pages/zones` | Projects › Share and deploy, Admin › Deploy targets | Kept |
| Preview comments | `PreviewComment*` types in `comments.ts` | Review room, Projects › Comments | Kept; review comments come from the hub |
| Publishing | Vela resource commands (upstream) | Pipeline, Review room | Replaced by the hub Author API (`HubCreatePublicationRequest`, `HubPublication`, `HubSetExpiryRequest`) |
| Collaboration | `CollabPresence*`, `CollabSyncStatusResponse`, `CollabProjectBootstrapResponse`, `CollabPullResponse` in `collab.ts` | Studio watch view, Inbox | Kept; collab-cloud contract served by the hub |

## People and workspaces

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Workspace context | `GET /api/workspace/context`, `PUT /api/workspace/active`, `GET /api/workspace/events` | Rail status, Projects workspace filter | Kept |
| Members | `GET /api/workspace/members`, `GET /api/workspace/directory` | Admin › Members & invites | Kept. Roles are `owner`, `admin`, `member` (`CollabMemberRole`) |
| Invites | `POST /api/workspace/invite`, `POST /api/workspace/invite/continue`, `WorkspaceInvite*` types | Admin › Members & invites | Kept; invite roles `admin` or `member` |
| Team projects | `GET /api/workspace/projects/team`, `GET /api/workspaces/:id/projects`, `POST …/projects/:projectId/move`, `POST …/projects/batch-move`, `POST …/projects/batch-delete` | Admin › Team projects | Kept |
| Shared resources | `GET /api/workspace/resources/:kind/:id/state`, `POST …/copy-check` | not built | Kept, no UI yet |
| Billing | `GET /api/workspace/billing`, `/billing/catalog`, `/billing/preflight`, `POST /billing/checkout` | not built | Removed (commerce-removal phase) |
| Vela account | `POST /api/integrations/vela/login`, `/logout`, `GET /api/integrations/vela/status`, `/wallet` | not built | Replaced by Kratos/flint-gate |

## Agents and models

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Agents | `GET /api/agents`, `POST /api/agents/:agentId/oauth-launch`, `POST /api/agents/:agentId/companion/install` | Admin › Agents | Kept. Agent IDs include `claude`, `codex`, `cursor-agent`, `byok-opencode` and others; cloud servers add the UAR runtime |
| App config and providers | `GET/PUT /api/app-config`, `/api/provider`, `/api/proxy/*` | Admin › Model providers | Kept; keys write-only |
| Agent runtime | UAR AG-UI (`docs/AGUI_V1.md` in universal-agent-runtime) | Admin › Agent runtime, Studio | KnowDesign addition |

## Extensions

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Plugins | `GET /api/plugins`, `POST /api/plugins/install`, `/upload-zip`, `/upload-folder`, `POST /api/plugins/:id/{trust,upgrade,uninstall,doctor,apply}`, `GET /api/plugins/stats`, `/events` | Admin › Plugins | Kept |
| Registries | `GET/POST /api/marketplaces`, `POST /api/marketplaces/:id/{refresh,trust}`, `DELETE /api/marketplaces/:id` | Admin › Registries | Kept; see `docs/self-hosting-a-registry.md` |
| Skills | `GET /api/skills`, `POST /api/skills/{install,import}`, `PUT/DELETE /api/skills/:id` | Admin › Skills & design systems | Kept |
| Design systems | `GET /api/design-systems`, `GET /api/design-systems/:id` | Admin › Skills & design systems | Kept |
| Brands | `GET/POST /api/brands`, `POST /api/brands/:id/{extract-from-html,finalize,cancel-extraction}` | Admin › Skills & design systems | Kept |

## Integrations

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| MCP servers | `GET/PUT /api/mcp/servers`, `POST /api/mcp/oauth/{start,disconnect}`, `GET /api/mcp/oauth/status` | Admin › MCP servers | Kept |
| MCP install into agents | `GET /api/mcp/install-info`, `POST/DELETE /api/mcp/install/codex` | not built | Local only |
| Connectors | `GET /api/connectors`, `/status`, `/discovery`, `POST /api/connectors/:id/connect`, `DELETE /api/connectors/:id/connection`, `GET/PUT /api/connectors/composio/config` | Admin › Connectors | Kept |

## Data

| Area | Key routes | Prototype screen | Status |
|---|---|---|---|
| Memory | `GET/POST /api/memory`, `PATCH /api/memory/config`, `GET /api/memory/extractions`, `DELETE /api/memory/extractions/:id`, `GET /api/memory/tree` | Admin › Memory | Kept |
| Library | `GET /api/library/assets`, `POST /api/library/ingest` | Admin › Asset library | Kept |
| Routines and automations | `/api/routines`, `/api/automation-templates`, `/api/automation-proposals` | Admin › Routines | Kept |
| Analytics | `GET /api/analytics/config` | not built | Kept; telemetry gating deferred |

## Proposed KnowDesign routes

None of these exist yet in the daemon or the hub. They're the contract the prototype screens assume, so they can be reviewed and written into the hub's OpenAPI file (`docs/contract/openapi.yaml` in `Know-Me-Tools/know-design-hub`) before any of them is built. "Proposed" here means designed, not agreed.

### Project access (daemon)

Upstream Open Design shares every project with the whole workspace. These routes add per-project access on top of that. They belong on the daemon because projects live there.

| Route | Body / result | Prototype screen | Notes |
|---|---|---|---|
| `GET /api/projects/:id/access` | `{ link: boolean, people: [{ id, role }], invites: [{ email, role, at }] }` | Projects › Access | `role` is `owner`, `edit` or `view` |
| `PUT /api/projects/:id/access/link` | `{ link: boolean }` | Access › "Everyone in the workspace can view" | `false` limits the project to the people listed |
| `PUT /api/projects/:id/access/people/:memberId` | `{ role: "edit" \| "view" }` | Access › role select | Owner can't be changed here |
| `DELETE /api/projects/:id/access/people/:memberId` | `204` | Access › Remove | Confirm in the UI first |
| `POST /api/projects/:id/access/invites` | `{ email, role }` → `201` | Access › Invite | A workspace member is added directly; anyone else gets an invite |
| `DELETE /api/projects/:id/access/invites/:email` | `204` | Access › Revoke | |
| `POST /api/projects/:id/access/requests` | `{ message? }` → `202` | No-access page › Request access | Notifies the owner |

Enforcement: every existing `/api/projects/:id/*` route has to check this before answering. That needs request-scoped identity, which the daemon doesn't have yet. The deployment phase delivers edge sign-in only, with no owner column on any table. So per-project access depends on the per-user data-isolation work that phase leaves out.

### Project lifecycle (daemon)

Rename and settings use the existing `PATCH /api/projects/:id`. These fields are new or need confirming:

| Route | Body / result | Prototype screen | Notes |
|---|---|---|---|
| `PATCH /api/projects/:id` | `{ name?, description?, designSystem?, agent?, model? }` | Projects › Settings, Rename | Existing route; `description`, `agent`, `model` are new fields |
| `PATCH /api/projects/:id` | `{ archived: boolean }` | Archive, Restore | New field; archived projects are read-only and hidden from `GET /api/projects` unless `?archived=1` |
| `POST /api/projects/:id/duplicate` | `{ name? }` → `201 { id }` | Actions menu › Duplicate | New route; copies files, not runs or comments |
| `DELETE /api/projects/:id` | `204` | Delete | Existing route; the UI requires typing the name first |

### Releases and customer links (hub)

These extend the hub Author API in `packages/contracts/src/api/hub.ts`. A release is a customer-facing link to one published version. It's separate from the review link (`HubPublication.reviewUrl`). The draft contract for this section and the customer view below is in `hub-releases.openapi.yaml`.

| Route | Body / result | Prototype screen | Notes |
|---|---|---|---|
| `POST /v1/publications/:id/releases` | `{ customerId, expiresInDays, passcode?, watermark, commentsEnabled, notes }` → `201 HubRelease` | Release form, Release again | Only when the publication's approval gate has passed; else `409 gate_not_passed` |
| `GET /v1/releases?state=live\|expired\|revoked` | `{ releases: HubRelease[] }` | Releases list | Grouped by customer in the UI |
| `GET /v1/releases/:id` | `HubRelease` + `events[]` | Release detail | Events: `view`, `comment` |
| `PATCH /v1/releases/:id` | `{ expiresAt }` | Release detail › Extend | Capped at `HubLimits.maxExpiryDays` from now |
| `DELETE /v1/releases/:id` | `204` | Release detail › Revoke | Link answers `410` from then on |

Proposed `HubRelease`:

```ts
interface HubRelease {
  releaseId: string;
  publicationId: string;
  version: number;
  customer: { id: string; name: string; workspace: string };
  slug: string;              // capability slug, ≥128 bits
  customerUrl: string;       // https://review.know-me.tools/c/<slug>
  state: 'live' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  passcodeRequired: boolean; // the passcode itself is never returned
  watermark: boolean;
  commentsEnabled: boolean;
  notes: string;
}
```

### Customer view (hub, public)

Served on `review.know-me.tools`, with the design itself in a sandboxed frame from `snap.know-me.tools`, the same way review links work.

| Route | Body / result | Prototype screen | Notes |
|---|---|---|---|
| `GET /c/:slug` | Customer page, or `410` (expired or revoked), or `404` | Customer · open, expired, revoked | `410` says which, so the page can explain it |
| `POST /c/:slug/unlock` | `{ passcode }` → `204` + signed view cookie | Customer · passcode | `429` after 5 wrong tries per minute; each unlock logs a `view` event |
| `POST /c/:slug/comments` | `{ name, text }` → `201` | Customer · comments | Only when `commentsEnabled`; same length and rate limits as guest comments; lands in the author's Inbox |

## Local only (no cloud UI)

These assume the server and the user share a machine: `/api/dialog`, `/api/editors`, `/api/dir-exists`, `/api/recent-dirs`, `/api/project-locations`, `/api/codex-pets`, `/api/xai/*` (local OAuth helper). A cloud server should return 404 for them, and the web client should hide the features that use them.

## What the prototype shows and what it doesn't

- **Real requests:** Admin › Server conformance sends read-only `GET`s to the URL you enter. Admin › Agent runtime → Test connection calls UAR `/health`.
- **Simulated:** everything else changes in-browser state only and resets on reload.
- **CORS:** a browser can only reach these routes if the server allows the page's origin and the `Authorization` header (CORS). Otherwise conformance shows every area as unreachable.
