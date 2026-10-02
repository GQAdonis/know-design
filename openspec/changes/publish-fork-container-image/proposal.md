# Publish the fork's container image

## Why

Nothing in this phase can deploy without a container image built from **this fork**. Upstream publishes `ghcr.io/nexu-io/od`, but that image does not contain this fork's commits — including every product change this phase produces (Postgres backend, Kratos-gated auth). The fork has never published its own image: `ghcr.io/GQAdonis/od` does not exist.

The workflow to do it is already present and **active** on the fork (`Docker image`, id `295834828`), and its image name is owner-templated — `docker-image.yml:97` reads `ghcr.io/${{ github.repository_owner }}/od`, which resolves to `ghcr.io/GQAdonis/od` here with no edit. What is missing is a way to *trigger* a publish.

## What Changes

Publish `ghcr.io/GQAdonis/od` at version `0.22.1` (the current `package.json` version), and record the manifest digest for `provision-namespace-and-pull-secret` and `deploy-daemon-workload` to consume.

**A planning assumption was falsified while drafting this, and it changes the shape of the change.** The phase plan said: *"Take the no-edit path: cut a `v*.*.*` tag on the fork and let the existing trigger publish. No repo change is required."* That is not true in practice.

Evidence:

| Fact | Value |
|---|---|
| `docker-image.yml:27` push trigger | `tags: ['v*.*.*']` |
| Bare `vX.Y.Z` tags on origin (fork) | **0** |
| Bare `vX.Y.Z` tags on upstream | **0** |
| Actual tag convention, both repos | `open-design-vN.N.N` (11 on fork, 35 upstream) |
| Does `open-design-v0.10.0` match `v*.*.*`? | **No** — the glob requires a leading `v` |
| How upstream actually publishes | `release-stable.yml:1117` → `workflow_call` with `release_version` |
| `workflow_dispatch:` inputs | **none** — bare key |

The publish gate (`Resolve publish mode`) sets `publish=true` when `event_name == push` **or** `release_version` is non-empty **or** `publish_latest == true`. `release_version` and `publish_latest` are declared **only** under `workflow_call`. So on this fork there are exactly two routes to a publish, and both have a cost:

- **Route A — cut a `v0.22.1` tag.** Requires no repo change, but introduces a tag shape that exists nowhere in this repository's 46-tag history, purely to satisfy a trigger that has apparently never fired here. It also permanently diverges the fork's tag namespace from upstream's, which matters because this fork rebases on upstream.
- **Route B — add `workflow_dispatch` inputs** (`release_version`, `publish_latest`) and wire them into the existing `steps.mode` env. A ~6-line workflow edit that makes publishing an explicit, repeatable operator action, consistent with how `release-stable.yml` already drives this workflow.

**Route C — invoke `release-stable.yml`** was rejected: it drags in the entire stable-release pipeline (signing, notarization, multi-platform packaging) to obtain one Linux container image.

### Decision: Route B (operator, 2026-09-14)

Route B was selected. It adds a supported trigger to a workflow already designed for reusable invocation, rather than manufacturing a tag convention to satisfy a glob that has never matched anything in this repository.

A desktop-preservation concern was raised and **checked, then withdrawn**: `docker-image.yml` contains zero references to `desktop`, `packaged`, `electron`, `tools-pack`, `dmg`, or `nsis`; the desktop surface is built by six separate workflows, none of which call it or are called by it; and `release-stable.yml` (the desktop pipeline) is `workflow_dispatch`-only, never tag-triggered. Both routes preserve desktop equally, so that was not a differentiator.

For the record, one point in favour of Route A was **overstated** when the routes were first presented: `docker-image.yml` is the *only* workflow in the repo with a `tags:` trigger, so a tag push would have fired exactly one workflow. Route A carried no blast radius. It was rejected on tag-namespace divergence alone, which matters because this fork rebases on upstream.

**Consequence for the phase plan**: this contradicts `plan.md`'s "no workflow edit" framing and its acceptance criterion that `git diff` touch no file under `.github/workflows/`. That criterion rested on the falsified assumption and has been amended in `plan.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

This change publishes a build artifact. It introduces no user-facing behavior, no API, and no requirement that a spec could describe — under Route B it edits one CI workflow's trigger surface; under Route A it edits nothing at all. Per the artifact instructions ("specs describe behavior, so if behavior does not change, no spec should change either — do not invent a requirement just to satisfy validation"), this change sets **`skip_specs: true`** in `.openspec.yaml` rather than manufacture a capability.

## Impact

- **`.github/workflows/docker-image.yml`** — under Route B only: add two `workflow_dispatch` inputs and pass them into the `Resolve publish mode` step's `env`. No change to the publish logic itself.
- **`ghcr.io/GQAdonis/od`** — new container package. It will default to **private**, unlike upstream's public `ghcr.io/nexu-io/od`. This is what makes `provision-namespace-and-pull-secret` (an `imagePullSecret`) necessary; an alternative is flipping package visibility to public, which GitHub treats as a one-way change for container packages.
- **Downstream changes** — `deploy-daemon-workload` consumes the published digest. Nothing else in the phase depends on this change.
- **Git tag namespace** — under Route A only: introduces a `vX.Y.Z` tag alongside the established `open-design-vX.Y.Z` convention.
- **No application source is touched.** `apps/`, `packages/`, and `tools/` are untouched under either route.
