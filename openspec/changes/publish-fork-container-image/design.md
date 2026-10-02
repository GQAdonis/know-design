## Context

See `proposal.md` — Why. The operator selected **Route B** on 2026-09-14.

The constraints that shape this design are all in the existing `.github/workflows/docker-image.yml` (153 lines), and each is verified against the literal file rather than inferred:

- **The publish gate already supports what we need.** `Resolve publish mode` (`id: mode`) sets `publish=true` when `EVENT_NAME == push` **or** `RELEASE_VERSION` is non-empty **or** `PUBLISH_LATEST == 'true'`. Its `env:` block already reads `${{ inputs.release_version }}` and `${{ inputs.publish_latest }}`. Those expressions evaluate to empty strings under `workflow_dispatch` today only because the inputs are not *declared* for that event. Declaring them makes the existing logic work unchanged.
- **The job already has the right permissions**: `packages: write`, `contents: read`, `id-token: write`.
- **The image name needs no edit**: `images: ghcr.io/${{ github.repository_owner }}/od` resolves to `ghcr.io/GQAdonis/od` on this fork.
- **`checkout` uses `${{ inputs.ref || github.sha }}`** — under `workflow_dispatch`, `inputs.ref` is undefined, so it falls through to `github.sha`, which is the ref the operator selected in the UI. Correct without modification.

## Goals / Non-Goals

**Goals:**

- Make a GHCR publish reachable as an explicit, repeatable operator action on this fork, using the workflow's existing publish logic.
- Keep the diff minimal and confined to the `on:` block plus the `mode` step's `env`, so upstream rebases stay clean.
- Produce `ghcr.io/GQAdonis/od:0.22.1` and record its manifest digest for `deploy-daemon-workload`.

**Non-Goals:**

- **Do not add a `ref` input to `workflow_dispatch`.** The dispatch UI already selects the ref and `github.sha` resolves it. Adding one creates two competing sources of truth for what gets built.
- **Do not alter the publish predicate, the tag scheme, the build args, or the base images.** This change adds a trigger surface; it changes no build behavior.
- **Do not change the `push:` tag trigger.** `tags: ['v*.*.*']` stays, unused, so an upstream rebase does not conflict.

## Decisions

### D1 — Declare `publish_latest` as `type: boolean`, not `type: string`

`Extract metadata` contains:

```yaml
type=raw,value=latest,enable=${{ inputs.publish_latest == true }}
```

This is a **boolean** comparison. In GitHub expressions, the string `'true'` is **not** `== true`. If `publish_latest` were declared `type: string` on the dispatch, the input would arrive as `'true'`, the comparison would evaluate false, and `:latest` would **silently never be tagged** — while the run stayed green and the `mode` step's separate `[ "$PUBLISH_LATEST" = "true" ]` shell test (a string comparison, which *would* pass) still flipped `publish=true`. The two would disagree.

This is precisely the silent-failure class `AGENTS.md` documents at length for `${{ inputs.<flag> || true }}` in the release-channel section. Declaring `type: boolean` keeps both comparisons correct.

`release_version` is declared `type: string`, matching `enable=${{ inputs.release_version != '' }}` — a string comparison.

*Alternative considered:* declare both as strings and rewrite the `enable=` expression to `== 'true'`. Rejected — it edits publish logic to accommodate the trigger, widening the diff and diverging from the `workflow_call` contract that `release-stable.yml` depends on.

### D2 — Mirror the `workflow_call` input names and defaults exactly

Same names (`release_version`, `publish_latest`), same types, same defaults (`''` and `false`). The `mode` step's `env:` block then needs **no change at all** — `${{ inputs.release_version }}` resolves for either event. The diff reduces to the `on:` block alone.

*Alternative considered:* distinct dispatch-only names (e.g. `version`) with added `env:` lines. Rejected — more lines, and a second vocabulary for the same concept.

### D3 — Publish `0.22.1`, matching `package.json`

Root, `apps/daemon`, and `apps/web` all report `0.22.1`. Using the real version keeps the image tag meaningful. Note upstream's GHCR already has `0.22.1` and `0.22.2` — these are *different packages* (`nexu-io/od` vs `GQAdonis/od`), so there is no collision, but the digests will differ because this fork carries extra commits.

## Risks / Trade-offs

**[The first publish will fail the run, after successfully pushing the image] → Decide package visibility before dispatching.**

This is the significant risk and it is not hypothetical. `Verify public GHCR pull access` runs on every publish:

```bash
docker logout ghcr.io >/dev/null 2>&1 || true
...
if ! docker buildx imagetools inspect "$image" >/dev/null; then
  ... exit 1
```

It logs out and inspects each published tag **anonymously**. A newly created GHCR package is **private by default**, so the inspect fails and the step exits 1. Outcome: `ghcr.io/GQAdonis/od:0.22.1` is pushed and usable, but the workflow run is **red**, with the step's own message telling you to flip visibility to Public.

Three responses, and this must be chosen deliberately because it changes change 2:

1. **Publish, let the run go red, then flip the package to Public and re-dispatch.** The image is valid either way. GitHub treats container visibility as effectively one-way, so this is a deliberate decision about whether this fork's image should be world-pullable.
2. **Keep it private, accept the red run**, and rely on the `imagePullSecret` from `provision-namespace-and-pull-secret`. The verify step becomes permanent noise on every publish.
3. **Make the verify step conditional** on the package being intended-public. This edits publish logic — out of scope per Non-Goals, and it would drift from upstream.

**Recommendation: (2) for now.** The phase already plans an `imagePullSecret`, a private image is the safer default for a personal fork, and a red run on a known, documented step is honest. Revisit if the image should be public.

**[Upstream rebase conflicts in `docker-image.yml`] → Confine the diff to the `on:` block.** Upstream may later add its own `workflow_dispatch` inputs. Keeping the change to declarations only, with no logic edits, keeps any conflict small and obvious.

**[Operator dispatches with no inputs] → Degrades safely.** Empty `release_version` and `publish_latest: false` resolve to `publish=false`, giving a smoke-only amd64 build — the current standalone-dispatch behavior, unchanged.

## Migration Plan

1. Add the two inputs to `workflow_dispatch` in `docker-image.yml`.
2. `pnpm guard` (the repo-level gate; this touches no TypeScript, so no `typecheck` impact).
3. Commit on a branch, open a PR. Note the `pull_request` trigger includes `.github/workflows/docker-image.yml` in its `paths`, so the PR itself runs a **smoke** build (`publish=false`) — free validation that the YAML parses and the job still builds.
4. Merge, then dispatch `Docker image` on `main` with `release_version: 0.22.1`, `publish_latest: false`.
5. Record the manifest digest from the run log for `deploy-daemon-workload`.

**Rollback:** revert the commit. The inputs are additive and nothing else references them; reverting restores the prior trigger surface with no residue. A published image is not rolled back by this — delete the GHCR package version if it must be withdrawn.

## Open Questions

None that block implementation. The package-visibility choice under Risks is a decision, not an unknown, and it is answered above with a recommendation; it can be revisited without changing this design, the specs (none), or the task breakdown.
