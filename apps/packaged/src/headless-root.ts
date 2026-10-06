import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { resolveBrand } from "@open-design/release";

/**
 * Base directory of the headless runtime's per-namespace roots. `OD_DATA_DIR`
 * wins; otherwise the root is `<XDG data home>/<brand slug>/namespaces`, so a
 * KnowDesign headless install never shares a root with Open Design. The brand
 * is resolved at call time.
 */
export function resolveHeadlessNamespaceBaseRoot(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const odDataDir = env.OD_DATA_DIR;
  if (odDataDir != null && odDataDir.length > 0) {
    return join(resolve(odDataDir.replace(/^~/, homedir())), "namespaces");
  }
  const xdgDataHome = env.XDG_DATA_HOME;
  const dataBase =
    xdgDataHome != null && xdgDataHome.length > 0
      ? xdgDataHome
      : join(homedir(), ".local", "share");
  return join(dataBase, resolveBrand(env).slug, "namespaces");
}
