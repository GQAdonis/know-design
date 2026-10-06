/**
 * Brand codemod entry point.
 *
 *   pnpm exec tsx scripts/brand/cli.ts apply [--dry-run] [--only <glob,glob>]   rewrite old-brand text (idempotent)
 *   pnpm exec tsx scripts/brand/cli.ts verify [--only <glob,glob>]               exit 1 if any old-brand text remains
 *
 * Logic lives in ./lib.ts and ./config.ts; this file only parses arguments, prints and sets the exit code.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_BRAND_CONFIG } from "./config.ts";
import { applyBrandToTree, verifyBrandTree } from "./lib.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [command, ...flags] = process.argv.slice(2);

// --only <glob,glob>: restrict a run to some of the configured files (the config's excludes still apply).
const onlyAt = flags.indexOf("--only");
const only = onlyAt >= 0 ? (flags[onlyAt + 1] ?? "").split(",").filter(Boolean) : [];
const config =
  only.length === 0
    ? DEFAULT_BRAND_CONFIG
    : { ...DEFAULT_BRAND_CONFIG, include: DEFAULT_BRAND_CONFIG.include.filter((glob) => only.includes(glob)) };

if (command === "apply") {
  const dryRun = flags.includes("--dry-run");
  const { changed } = applyBrandToTree(repoRoot, config, { write: !dryRun });
  for (const file of changed) console.log(`${dryRun ? "would change" : "changed"}  ${file}`);
  console.log(`${changed.length} file(s) ${dryRun ? "would change" : "changed"}`);
} else if (command === "verify") {
  const violations = verifyBrandTree(repoRoot, config);
  for (const v of violations) console.error(`${v.file}:${v.line}:${v.column}  ${JSON.stringify(v.match)}  ${v.excerpt}`);
  console.log(`${violations.length} stray old-brand string(s)`);
  process.exitCode = violations.length === 0 ? 0 : 1;
} else {
  console.error("usage: tsx scripts/brand/cli.ts apply [--dry-run] | verify");
  process.exitCode = 2;
}
