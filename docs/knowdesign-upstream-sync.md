# Syncing KnowDesign with upstream Open Design

KnowDesign is a fork of `nexu-io/open-design` that must keep taking upstream changes cheaply. The design
that makes that possible (decisions D-007, D-014, D-018 in `.kbd-orchestrator`):

- **One brand descriptor** (`packages/release/src/brand.ts`) holds every identifier the OS or another install
  can observe. Open Design stays the default, so upstream tests keep passing untouched.
- **Locale files and brand-asserting tests are never edited.** The brand is applied at runtime
  (`apps/web/src/brand`) and at build time (`scripts/brand`), so the files upstream edits most often do not
  conflict.
- **Internal names stay upstream's** (`@open-design/*` packages, `OD_*` variables, TypeScript names).

## Remotes

```bash
git remote add upstream git@github.com:nexu-io/open-design.git   # once
git config rerere.enabled true                                    # once: replay recorded resolutions
```

Sync at least weekly: conflict count grows with distance from the last sync (the spike measured 0 conflicts at
about 9 days and 23 at about 16, all in locale and brand-asserting test files, which this design now avoids).

## The sync

1. `git fetch upstream && git switch main && git merge upstream/main`
2. On a conflict in a **locale file or a brand-asserting test**, take upstream's side
   (`git checkout --theirs <file>`): those files are intentionally identical to upstream. Any other conflict is
   real work; resolve it by hand and let `rerere` record it.
3. Re-apply the brand to new upstream prose, then check nothing was missed:
   ```bash
   pnpm exec tsx scripts/brand/cli.ts apply     # idempotent; a second run changes nothing
   pnpm exec tsx scripts/brand/cli.ts verify    # exits 1 and lists file:line for any stray old-brand text
   ```
   `verify` only looks at the files the codemod owns (see `scripts/brand/config.ts`); the must-not-rename list
   (package scope, upstream hosts, upstream repository slug in code) is deliberately excluded.
4. **Rebuild the workspace packages before type-checking.** Upstream merges add exports to packages that other
   packages consume from `dist`, and a stale `dist` fails typecheck for reasons unrelated to the merge:
   ```bash
   pnpm install
   pnpm -r --filter "./packages/*" build
   pnpm guard && pnpm typecheck
   ```
5. Run only the suites of what the merge touched, plus the brand checks:
   `pnpm --filter @open-design/release test`, `pnpm --filter @open-design/sidecar test`,
   `pnpm --filter @open-design/tools-pack test`, and the codemod test in `e2e/tests/scripts/brand-codemod.test.ts`.
6. If upstream added a **new observable identifier** (a new bundle name, URL scheme, data directory, socket
   prefix, CLI command), add it to the brand descriptor and its two-brand test
   (`packages/release/tests/brand.test.ts`, `tools/pack/tests/brand-identity.test.ts`) rather than renaming it
   in place. The two-brand tests fail if the same value is shared by both brands.

## What can still conflict

The files this fork edits that upstream also edits are the identity seams: `packages/release/src/index.ts`,
`packages/sidecar*`, `apps/packaged/src/{index,sidecars,config}.ts`, `apps/desktop/src/main/*` (brand strings),
`tools/pack/src/**` (identity), and the web brand helpers. Keep edits there small and additive, and mention each in
the sync PR so reviewers know where to look.

## Fallback

If a weekly sync produces more than about five non-mechanical conflicts, stop and re-evaluate regenerating the
fork branch from upstream with the brand layer re-applied (spike report, option 2).

## KnowDesign ipfs-kubo deploy provider (htmx-prototypes-and-ipfs-deploy, 2026-11-14)

Provider logic lives in new files (`apps/daemon/src/deploy/ipfs.ts`, `apps/web/src/components/IpfsDeployFields.tsx` + `.module.css`). Additive edits to upstream-owned files, each a branch or list entry tagged `KnowDesign`:

- `packages/contracts/src/api/projects.ts`: `'ipfs-kubo'` in `DeployProviderId`; `IpfsDeploymentInfo`; optional IPFS fields on `DeployConfigResponse` / `UpdateDeployConfigRequest`; `ImportDeployEnvResponse`; `DeploymentInfo.ipfs`; `DeployProjectFileRequest.ipns`; preflight code `prototype-manifest-mismatch`.
- `packages/contracts/src/analytics/events/result-events.ts`: `'ipfs_kubo'` in `TrackingDeployProvider`.
- `apps/daemon/src/deploy.ts`: import of the IPFS module; provider union; `readDeployConfig` overloads + branch; `writeDeployConfig`, `publicDeployConfigForProvider`, `isDeployProviderId` branches.
- `apps/daemon/src/deploy/cloudflare-pages-helpers.ts`: `publicDeployment` derives `ipfs` from provider metadata.
- `apps/daemon/src/routes/deploy.ts`: `POST /api/deploy/config/import-env`; IPFS branch in `POST /api/projects/:id/deploy` (`share-relative` assets, no hook script, IPFS metadata).
- `apps/daemon/src/server.ts`: IPFS entries in `deployDeps`.
- `apps/daemon/src/cli.ts`: IPFS flags; `od deploy config` subcommand.
- `apps/web/src/providers/registry.ts`: `IPFS_KUBO_PROVIDER_ID`; `importDeployEnv`.
- `apps/web/src/components/FileViewer.tsx`: option entry, provider-option key unions, tracking map, config-save skip for IPFS, settings branch in the deploy modal, share-menu icon, `IpfsDeploymentDetails` in the result block.
- `apps/web/src/i18n/types.ts` + 19 locales: 17 `fileViewer.ipfs*` keys appended after `fileViewer.cloudflarePagesProvider`.
- `apps/daemon/src/deploy.ts`: one-line `prototypeManifestWarnings` call in `prepareDeployPreflight` (logic in new `apps/daemon/src/deploy/prototype-manifest.ts`).
- `plugins/_official/scenarios/od-axum-export/` is a new KnowDesign scenario folder; `apps/daemon/tests/plugins-bundled-scenarios-roster.test.ts` registers it as a `tune-collab` sibling (one line).
