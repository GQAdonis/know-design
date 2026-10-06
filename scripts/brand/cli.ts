/**
 * Brand codemod entry point.
 *
 *   pnpm exec tsx scripts/brand/cli.ts apply [--dry-run]   rewrite old-brand text (idempotent)
 *   pnpm exec tsx scripts/brand/cli.ts verify              exit 1 if any old-brand text remains
 *
 * Logic lives in ./lib.ts and ./config.ts; this file only parses arguments, prints and sets the exit code.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_BRAND_CONFIG } from "./config.ts";
import { applyBrandToTree, verifyBrandTree } from "./lib.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [command, ...flags] = process.argv.slice(2);

if (command === "apply") {
  const dryRun = flags.includes("--dry-run");
  const { changed } = applyBrandToTree(repoRoot, DEFAULT_BRAND_CONFIG, { write: !dryRun });
  for (const file of changed) console.log(`${dryRun ? "would change" : "changed"}  ${file}`);
  console.log(`${changed.length} file(s) ${dryRun ? "would change" : "changed"}`);
} else if (command === "verify") {
  const violations = verifyBrandTree(repoRoot, DEFAULT_BRAND_CONFIG);
  for (const v of violations) console.error(`${v.file}:${v.line}:${v.column}  ${JSON.stringify(v.match)}  ${v.excerpt}`);
  console.log(`${violations.length} stray old-brand string(s)`);
  process.exitCode = violations.length === 0 ? 0 : 1;
} else {
  console.error("usage: tsx scripts/brand/cli.ts apply [--dry-run] | verify");
  process.exitCode = 2;
}
