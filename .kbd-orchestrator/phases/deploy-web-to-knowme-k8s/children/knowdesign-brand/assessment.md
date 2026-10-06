# ASSESSMENT: deploy-web-to-knowme-k8s › knowdesign-brand

- **Date**: 2026-10-06 · **Inputs**: umbrella assessment/analysis/plan, `spike-report.md` (GO, decisions D-001…D-017), the commerce-removal reflection and its Next Phase Seed, a read-only clash inventory of the tree (file:line literals), operator instruction 2026-10-06.
- **Operator intent**: rename everything so a KnowDesign build can never clash with an installed, running original Open Design; include renaming the GitHub repository (`knowdesign`); keep the local checkout directory.

## What exists today
- The only rebrand scaffolding is `OD_BUILD_PROFILE=knowdesign` (`apps/{desktop,packaged}/src/**/build-profile.ts`), which silences upstream network behaviour. **No OS-visible identity has changed**: a KnowDesign build today claims the original's bundle ID, URL scheme, data directory, sockets and CLI name.
- Identity is spread over ~15 independent `Open Design`/`open-design` literals: `packages/release/src/index.ts` (appId, productName, channels), `packages/sidecar-proto/src/index.ts` (IPC, registry, `OPEN_DESIGN_PRODUCT_NAME`), and per-platform builders in `tools/pack/src/{mac,win,linux}` that **bypass** `packages/release` for Windows/Linux appId and each carry their own `PRODUCT_NAME`.
- `OD_BUILD_PROFILE` is read from the process environment at launch and is not baked into the packaged config, so a Finder launch runs the stock profile (commerce-removal Delta 1).

## Clash surface (what the OS or a second install can observe) — ranked
1. `opendesign://` OS-wide handler (mac Info.plist `CFBundleURLTypes`, Windows `Software\Classes\opendesign`, runtime `setAsDefaultProtocolClient`); literal duplicated in four places.
2. appId `io.open-design.desktop` (mac bundle ID, Windows AUMID, Linux appId); Win/Linux hard-code it.
3. productName `Open Design` → Electron userData (`~/Library/Application Support/Open Design`, `%APPDATA%\Open Design`), installation id, launcher state, logs, and the single-instance lock (derived from userData).
4. Install locations, bundle/exe names, shortcuts, DMG/zip/installer/AppImage names.
5. Windows uninstall and App Paths registry keys (`Uninstall\Open Design-<ns>`).
6. Sidecar IPC: `od-sidecar-<uid>/<digest>.sock`, `\\.\pipe\open-design-sidecar-*`, `--od-stamp-*` argv, default namespaces identical to the original's.
7. Fixed daemon port 7456 and `OD_DATA_DIR` defaults.
8. `~/.open-design/` (Vercel/Cloudflare tokens, `agents.local.json`) and `.open-design/project.json` written into user project folders.
9. MCP server name `open-design` (written into Claude/Codex/VS Code configs) and the `od` bin (also the POSIX `od`).
10. Update feed `releases.open-design.ai`, GitHub slug `nexu-io/open-design` (~25 runtime literals incl. UI links), `ghcr.io/nexu-io/od` in compose/helm. Linux extras: `open-design-<ns>.desktop`, icons, AppImage name.

## Constraints that bound the design
- **D-007 / spike**: user- and operator-visible and OS-observable surfaces are renamed; internal code identifiers (`@open-design/*`, `OD_*` env names, TypeScript names) stay aliased, because renaming them turns every weekly upstream merge into a mass conflict. Locale files and brand-asserting tests stay byte-identical to upstream; the brand is applied at build/runtime from the brand config.
- `AGENTS.md`: tests live in `tests/`; no new `.js/.mjs/.cjs`; contracts stay pure TypeScript; i18n keys in all 19 locales; **GitHub repo rename is outward-facing and breaks clone URLs — only on explicit confirmation**.
- Windows NSIS paths are length-sensitive: keep the product slug short.

## Risks
- **Upstream merge cost** of editing ~15 identity literals and ~25 slug literals. Mitigation: one descriptor, a codemod that is idempotent, and rerere; measured by the change-22 rehearsal.
- **A rename can orphan data**: existing KnowDesign-profile installs (none released) and the user's own `knowdesign-e2e` namespace would not migrate; acceptable pre-release, record it.
- **Repo rename** changes the `origin` URL and every doc link; GitHub redirects old URLs but Actions, Pages and the container registry namespace need checking. The `upstream` remote (nexu-io) is unaffected.
- **Profile baking** changes behaviour of every packaged build; it must be test-launched with no environment.

## Open points carried from commerce-removal
Third-party egress on a fresh install (operator decision pending, not in this phase's scope); D-015 ratified as D-017.
