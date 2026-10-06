# EXECUTION: deploy-web-to-knowme-k8s › knowdesign-brand

- **Date**: 2026-10-06 · **Backend**: openspec · **Executor**: Claude Code (this session)
- **Rule carried from commerce-removal**: no gate until every planned change is done; one cumulative independent review at the end.

## Change 19 · `brand-seam-and-rename-codemod` — implemented (`33a231f377`)
- `packages/release/src/brand.ts`: the brand descriptor (app id, product name, slug, URL scheme, user-state dir, daemon port, MCP name, CLI bin, GitHub slug, image repo, release origin) for Open Design and KnowDesign. Open Design stays the default; KnowDesign follows `OD_BUILD_PROFILE`. `releaseChannelDescriptor`/`releaseInstallIdentity` take an optional brand.
- Profile baking: `tools-pack` writes `buildProfile` into `open-design-config.json` (materialization-time parameter, listed in `CACHE.md`); the packaged runtime applies it first thing in `readPackagedConfig`; an explicit launch value still wins.
- `scripts/brand/{lib,config,cli}.ts`: idempotent codemod and verifier, protected spans, word-edge matching, scoped rules, excluded locale/test paths. Real-tree dry run: 71 files / 225 strings in the conservative scope (nothing written).
- Checks: release 12, packaged 324 (2 test files cannot load because Electron's `path.txt` is missing from this checkout's `node_modules`; unrelated, environmental), tools-pack 344, e2e script tests 12, `pnpm guard`, repo `pnpm typecheck`.
- **Open item (named, not hidden):** the amendment "packaged launch with no env var" is verified at unit level only. It becomes a check in change 20's packaged e2e (build under the profile, launch with no `OD_BUILD_PROFILE`, assert the profile is on and the brand is KnowDesign).
