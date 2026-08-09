import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Pins the assembled app to electron-builder's npm node_modules collector.
 *
 * INVARIANT: the assembled app must present itself as a self-contained npm
 * project, never as part of this repo's pnpm workspace.
 *
 * The assembled app is populated with npm (`runNpmInstall`), so its
 * node_modules is flat with no `.pnpm/` directory. But app-builder-lib 26
 * chooses its collector from the *workspace root*, not from the app:
 * `determinePackageManagerEnv` calls `findWorkspaceRoot`, which for pnpm runs
 * `pnpm --workspace-root exec pwd` with cwd = projectDir. Because tools-pack
 * assembles under `<repo>/.tmp/`, that walk finds the repo's
 * `pnpm-workspace.yaml` and re-detects the collector as pnpm from the repo
 * root, overriding whatever the app declares.
 *
 * The pnpm collector then finds no `.pnpm/` in the app, logs "no node modules
 * found in collection", falls through to the repo root, and collects only the
 * packages resolvable from the workspace store — silently dropping the app's
 * real dependency closure, including the native modules (node-pty,
 * better-sqlite3, blake3-wasm) and every `@open-design/*` tarball.
 * electron-builder still emits a complete-looking artifact; only
 * `assertNodePtyRuntime` catches it afterwards.
 *
 * Two markers are required, because each defeats a different stage:
 *
 * - `pnpm-workspace.yaml` makes `pnpm --workspace-root` resolve to the app
 *   itself, so `findWorkspaceRoot` stops before reaching the repo root and the
 *   pnpm re-detection never fires.
 * - `package-lock.json` makes the subsequent `detectPackageManagerByFile` in
 *   the app return npm. Without it, detection falls through to
 *   `detectPackageManagerByEnv`, which reads `npm_config_user_agent` /
 *   `npm_execpath` — both of which say pnpm, since tools-pack itself runs
 *   under `pnpm tools-pack`.
 *
 * Neither marker affects the app's runtime: the packaged app never installs
 * dependencies. Both are build-time only and are excluded from the shipped
 * bundle by the `!pnpm-workspace.yaml` / `!package-lock.json` entries in each
 * platform's electron-builder `files` patterns; keep those entries in sync
 * with the markers written here.
 */
export async function pinAssembledAppToNpmCollector(appRoot: string): Promise<void> {
  await writeFile(join(appRoot, "pnpm-workspace.yaml"), "packages: []\n", "utf8");
}

/**
 * The npm install flags the assembled app must use.
 *
 * `package-lock.json` is a required collector marker (see
 * `pinAssembledAppToNpmCollector`), so the assembly install must NOT pass
 * `--no-package-lock`.
 */
export const ASSEMBLED_APP_NPM_INSTALL_ARGS = ["install", "--omit=dev"] as const;
