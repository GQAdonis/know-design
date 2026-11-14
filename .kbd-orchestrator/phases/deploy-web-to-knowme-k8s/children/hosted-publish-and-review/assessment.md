# ASSESSMENT: deploy-web-to-knowme-k8s › hosted-publish-and-review

- **Date**: 2026-10-17 · **Method**: read-only. Two independent code/cluster investigations, plus direct re-verification of the load-bearing claims (marked ✔). No code, builds, tests, or cluster mutations.
- **Goal**: our own backend on `know-me.tools`, hosted on the `know-me` cluster, replaces Open Design's hosted resource hub so an author can publish a design, reviewers (no Open Design account) can open it and comment, and the author sees those comments.

## 0. Correction to the working hypothesis

At child creation I assumed `OD_RESOURCE_HUB_URL` was a seam: point it at our API and publishing works with no fork. **That is wrong.**

- `publicResourceHubBaseUrl()` (`routes/collab-sync.ts:628`) only builds the *link string* shown to the author. ✔
- The actual publish is not HTTP from the daemon. `publish-public` and its revoke path shell out to the closed-source `vela` CLI through `runVelaResourceCommand` at `collab-sync.ts:1317, 1329, 1358, 1439`. ✔
- Under `OD_BUILD_PROFILE=knowdesign`, `runtimes/registry.ts:46` removes the `amr` agent def, and `runVelaCommand` then rejects with "AMR runtime definition is missing". ✔ **Publishing cannot work in the KnowDesign build today, with or without a hub.**
- The hub wire protocol lives inside the `vela` binary and is not in this repo. We cannot copy a spec; we must define our own.

Consequence: this is a **replace-the-transport** job (about 4 call sites plus a new HTTP client), not a configure-a-URL job. It is still small on the client; the substance is the new server and the reviewer experience.

## 1. What exists

| Capability | State | Evidence |
|---|---|---|
| Publish a file → public link | Vela CLI only; dead in knowdesign | `collab-sync.ts:1251-1330` |
| Revoke link | Vela CLI `snapshot-redact`; `od project revoke-public-link` parses `/api/v1/public/snapshots/<slug>/` from the URL | `collab-sync.ts:1358,1439`, `cli.ts:7195` |
| Publication record | **In-memory** `PublicFilePublicationStore`; lost on restart | `collab-sync.ts:1459` |
| Reviewer-facing page / comment UI | **None.** No share/review route in `apps/web/src/router.ts`; anonymous reviewers do not exist in the model | `comments.ts:405-440` |
| Comments | Local SQLite `preview_comments`; author id stamped server-side from a workspace member | `db.ts:291` |
| Comment relay to a cloud | **Exists, HTTP, env-selected.** `OD_COLLAB_CLOUD_URL` + `OD_COLLAB_CLOUD_TOKEN`; `POST/GET /teams/:teamId/projects/:projectId/comments` (seq cursor, ETag/304), `PUT/GET /teams/:teamId/members` | `integrations/collab-cloud.ts` ✔ |
| Relay eligibility | Only team workspaces with `visibility==='team'` (`isLocalTeamRelayCandidate`) | `comments.ts:303` |
| Deploy to Vercel/Cloudflare Pages | Separate path, user's own accounts, does not touch a hub | `routes/deploy.ts` |
| `od` CLI parity | Publish: **no `od` publish command**. Comments: **no `od` comment command**. Violates the dual-track rule in AGENTS.md | `cli.ts:7195`, `cli.ts:1195` |

The comment return path is the best news: a server that implements the four `collab-cloud` endpoints is pulled by the author's daemon with no client change.

## 2. Gaps to close

1. **No transport for publish** in the knowdesign build (§0).
2. **Workspace gates block a non-Vela deployment.** Each route needs a verified workspace context with workspace id, member id and `active` status, plus `permissions.canShareProjects`. Under knowdesign the context source returns nothing (`workspace-context-source.ts:103,148`), so the routes return 409 `WORKSPACE_IDENTITY_REQUIRED`. The web mirrors the predicate in `canPublishPublicFile`. These gates belong to the principal model that `identity-and-collaboration` has not built (0/10).
3. **No reviewer experience.** Nothing renders a published design to a stranger or lets them comment. This is new product surface, not a swap.
4. **Reviewer identity.** Comments need a member id; reviewers are not members. The guest minter (`sso-broker /guest`) is planned but unbuilt; the gate has no guest or share-link tokens.
5. **Comment return for personal projects.** The relay only covers team projects, so a solo author on desktop gets no comments back without a new path.
6. **Publication store is in-memory**, so links survive restarts only through manual `revoke-public-link`.
7. **CLI parity**: publish and comments are UI-only.
8. **Storage**: no object-store convention. The cluster's only S3-like store is Onyx's private MinIO; Quarry does not support `bytea`, so snapshot files cannot go in Postgres through Quarry.

## 3. What the platform gives us

- **Deploy pattern** (copy from `namespaces/knowdesign` in `know-me-cluster`): Argo Application per namespace, `manifests.yaml`, Deployment + Service + HTTPRoute (+ http→https redirect), PVC with the `linode-block-storage-retain` class. A new hostname needs a cert-manager `Certificate` and a listener pair in `namespaces/argocd-config` on the shared `argocd-gateway`. Linode's quota forbids new LoadBalancers, so every host is a listener on that gateway. Secrets are created out of band (no ESO/sealed-secrets).
- **Postgres via Quarry** (`/schema/v1/plan` → `planHash` → `/schema/v1/apply`, closed type grammar, additive only, no FKs/triggers/views). `FLINT_PROVISION_NAMESPACES=knowdesign` is already in the cluster manifest, but live prerequisites are unconfirmed. Alternative: a dedicated database and LOGIN role used directly via `pg`.
- **Realtime fabric**: channel-based Spine (`Publish`/`Subscribe` resumable), Connect/gRPC-web, JWT audience `frf-gateway`, issuer `https://gate.know-me.tools`, public host `rt.know-me.tools`. Useful for live comment push; not required for a first version (comments already poll with ETag).
- **Identity**: gate is the sole JWT issuer; the daemon trusts `X-Flint-*` headers only from the gate.
- **Nothing to reuse**: no existing publish/snapshot/comment service on the cluster or in the org repos (repo names searched; code not).

## 4. Overlap with `identity-and-collaboration` (0/10 pending)

Two of its changes overlap this child directly:

- `external-validator-invites-and-share-links` (Kratos external identity, Keto tuple, scoped expiring `/s/<token>` links).
- `collab-frf-comments-and-members` (implements the `CollabCloudClient` wire contract on FRF/Quarry).

Left alone, we would build two comment servers and two share-link schemes. **Decision needed (D3):** this child's hub owns the `collab-cloud` server and the reviewer link; the sibling keeps principals, roles, team workspaces, message center, and its two overlapping changes are re-scoped to wire into the hub. This re-scopes a sibling, so it needs your approval.

## 5. Risks

- **Authored HTML on our domain.** A published design is arbitrary HTML/JS. Served from a `know-me.tools` origin that shares cookies with other services, it is a stored-XSS and session-theft vector. Serve snapshots from an isolated host and with `Content-Security-Policy: sandbox` (no `allow-same-origin`); never share cookies with `gate`, `design`, or `rt`.
- **Reviewer-supplied content** (comment text, attachments) rendered inside the author's app: escape and size-limit.
- **Capability links.** Unguessable slugs (at least 128-bit), default expiry, one-click revoke, takedown path, rate limits on publish/comment, per-snapshot and per-author size caps.
- **Single replica + PVC** (Recreate) is the existing norm and implies downtime on rollout; acceptable for v1 but record it. Add the new PVC to a Velero schedule.
- **Dependency on unbuilt identity pieces.** Must not block on `/guest` or the principal model; use a hub-local interim (see plan D4).
- **Upstream merge surface.** New code should live in new files (new service, new client module), with the smallest possible edit to `collab-sync.ts`.

## 6. Not verified

- Live state of Quarry prerequisites (schema, `flint_provisioner` role, `provisioner-database-url` key) and which of the two local `flint-gate` clones matches production.
- Whether DNS for new hosts is managed in git (the zone is on Cloudflare); whether any automation bumps the knowdesign image tag in the cluster repo (inferred manual).
- Whether `vela` ever accepted a custom API URL (moot now, we are replacing it).
- What the original hub renders at its public snapshot URL (viewer vs raw file).
- `shared members` re-homing behavior for guest member ids in the relay receiver.
- Kratos `code` recovery behavior on v26.2.0 (only matters if reviewers get Kratos identities).

## 7. Recommendation

Proceed to plan with a **standalone hub service** that (a) stores and serves snapshots on an isolated origin, (b) implements the existing `collab-cloud` contract so comments return through the already-written client, (c) serves a small reviewer page with guest comments, and (d) a minimal daemon change that swaps four Vela calls for an HTTP client and adds CLI parity. Ship it behind interfaces for storage and identity so the unbuilt platform pieces plug in later.
