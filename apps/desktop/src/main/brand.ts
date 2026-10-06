import { resolveBrand } from "@open-design/release";

type BrandEnv = Readonly<Record<string, string | undefined>>;

/**
 * Brand-derived display strings for the desktop shell. Every function resolves
 * the brand at call time: the packaged app applies its baked build profile into
 * `process.env` after some modules have already loaded.
 */

/** Display name with the brand's own spacing: `Open Design` / `KnowDesign`. */
export function brandProductName(env: BrandEnv = process.env): string {
  return resolveBrand(env).productName;
}

/**
 * The unspaced form the desktop shell has always used in window titles and
 * in-app copy: `OpenDesign` / `KnowDesign`.
 */
export function brandCompactName(env: BrandEnv = process.env): string {
  return brandProductName(env).replace(/\s+/g, "");
}

/** `https://github.com/<owner>/<repo>/issues/new` for the running brand. */
export function brandIssuesUrl(env: BrandEnv = process.env): string {
  return `https://github.com/${resolveBrand(env).githubRepo}/issues/new`;
}

/** `https://github.com/<owner>/<repo>` for the running brand. */
export function brandRepoUrl(env: BrandEnv = process.env): string {
  return `https://github.com/${resolveBrand(env).githubRepo}`;
}
