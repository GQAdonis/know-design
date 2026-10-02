## 1. Workflow trigger surface

- [x] 1.1 In `.github/workflows/docker-image.yml`, replace the bare `workflow_dispatch:` key (line ~36) with a declaration carrying two inputs that mirror the existing `workflow_call` block exactly: `release_version` (`type: string`, `required: false`, `default: ""`) and `publish_latest` (`type: boolean`, `required: false`, `default: false`). Verify by diffing the two blocks — the input names, types, and defaults must match character-for-character, so `${{ inputs.release_version }}` and `${{ inputs.publish_latest }}` resolve identically under either event.
- [x] 1.2 Confirm **no other edit was needed**: verify `git diff` for this change touches only the `on:` block — the `Resolve publish mode` `env:` map, the publish predicate, the `Extract metadata` tag scheme, `build-args`, and the base images must be byte-identical to `main`. (Design D2: mirroring the names is what makes the `env:` block work unchanged.)
- [x] 1.3 Verify the boolean typing is correct by inspecting `Extract metadata`: the line `enable=${{ inputs.publish_latest == true }}` is a **boolean** comparison, so a `type: string` input would arrive as `'true'`, compare false, and silently skip the `:latest` tag while the shell test in `mode` still flipped `publish=true`. Confirm the declared type is `boolean`, not `string`. (Design D1.)

## 2. Local validation

- [x] 2.1 Run `pnpm guard` from the repo root and verify it exits 0. This change touches no TypeScript, so `pnpm typecheck` is unaffected, but `guard` is the repo-level gate per `AGENTS.md`.
- [x] 2.2 Verify the YAML parses as valid GitHub Actions syntax before pushing — e.g. `actionlint .github/workflows/docker-image.yml` if available, otherwise rely on task 3.2's PR smoke run as the authoritative check.

## 3. Pull request

- [ ] 3.1 Commit on a branch (not `main`) and open a PR. Per `AGENTS.md` the commit message must carry no `Co-authored-by` trailer.
- [ ] 3.2 Verify the PR triggers a **smoke** build: `docker-image.yml`'s `pull_request` trigger includes `.github/workflows/docker-image.yml` in its `paths`, so the PR itself runs the job with `publish=false` (amd64 only). Confirm the run is green — this proves the YAML parses and the job still builds without publishing anything.
- [ ] 3.3 Merge to `main` after the smoke run passes.

## 4. Publish

- [ ] 4.1 Dispatch the `Docker image` workflow on `main` with `release_version: 0.22.1` and `publish_latest: false`. Verify the `Resolve publish mode` step logs `publish=true` and `platforms=linux/amd64,linux/arm64`.
- [ ] 4.2 Verify `Build and push` completes and `Extract metadata` tagged the image `ghcr.io/GQAdonis/od:0.22.1` (and **not** `:latest`, since `publish_latest` was false).
- [ ] 4.3 **Expect the run to go red at `Verify public GHCR pull access`, and confirm that is the only failure.** That step runs `docker logout ghcr.io` then inspects each tag anonymously; a new GHCR package is private by default, so it exits 1 *after* the image has been pushed successfully. Verify the failure message is the package-visibility one and that every prior step is green. (Design Risks — recommendation (2): keep the package private and rely on the `imagePullSecret` from `provision-namespace-and-pull-secret`.)
- [ ] 4.4 Verify the image is genuinely pullable **when authenticated**: `docker pull ghcr.io/GQAdonis/od:0.22.1` from a machine logged in to GHCR. This is the real acceptance signal, distinct from the anonymous check in 4.3.

## 5. Hand-off

- [ ] 5.1 Record the manifest digest (`sha256:…`) from the `Build and push` step's log or via `docker buildx imagetools inspect ghcr.io/GQAdonis/od:0.22.1`, and write it into this change's completion notes so `deploy-daemon-workload` can pin the image by digest rather than by mutable tag.
- [ ] 5.2 Verify `provision-namespace-and-pull-secret` is still required by confirming the GHCR package's visibility is **private** (GitHub → Packages → `od` → Package settings). If a later decision flips it to public, that change's pull-secret work becomes unnecessary — note it there rather than silently dropping it.
