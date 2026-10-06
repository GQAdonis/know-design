/**
 * The brand descriptor: every identifier that the operating system, or another
 * install of a different brand on the same machine, can observe.
 *
 * Internal code identifiers (`@open-design/*` package names, `OD_*` environment
 * variable names, TypeScript names) are deliberately NOT here: they stay as
 * upstream spells them so weekly upstream merges stay cheap (decision D-007).
 *
 * Open Design stays the default so every upstream test that asserts its identity
 * keeps passing untouched. The knowdesign brand follows the existing
 * `OD_BUILD_PROFILE=knowdesign` switch, so there is exactly one switch.
 */

export type BrandId = "open-design" | "knowdesign";

export type BrandDescriptor = {
  /** Reverse-DNS application id: mac bundle id, Windows AUMID, Linux app id. */
  appId: string;
  /** The command a user types. */
  cliBin: string;
  /** Loopback port the daemon prefers when none is configured. */
  daemonDefaultPort: number;
  /** `owner/repo` of the source repository, used for links and update checks. */
  githubRepo: string;
  id: BrandId;
  /** Container image repository (no tag). */
  imageRepo: string;
  /** Name written into other agents' MCP configuration files. */
  mcpServerName: string;
  /** Display name, with a space where the brand has one. */
  productName: string;
  /** Origin of the release feed; empty when the brand ships none. */
  releaseOrigin: string;
  /** Short lowercase token for file names, desktop entries, IPC prefixes and data roots. */
  slug: string;
  /** OS-wide URL protocol the app claims (without `://`). */
  urlScheme: string;
  /** Per-user state directory under the home directory. */
  userStateDirName: string;
};

export const OPEN_DESIGN_BRAND: BrandDescriptor = Object.freeze({
  appId: "io.open-design.desktop",
  cliBin: "od",
  daemonDefaultPort: 7456,
  githubRepo: "nexu-io/open-design",
  id: "open-design",
  imageRepo: "ghcr.io/nexu-io/od",
  mcpServerName: "open-design",
  productName: "Open Design",
  releaseOrigin: "https://releases.open-design.ai",
  slug: "open-design",
  urlScheme: "opendesign",
  userStateDirName: ".open-design",
});

export const KNOWDESIGN_BRAND: BrandDescriptor = Object.freeze({
  appId: "ai.prometheusags.knowdesign",
  cliBin: "knowdesign",
  daemonDefaultPort: 7556,
  githubRepo: "GQAdonis/know-design",
  id: "knowdesign",
  imageRepo: "ghcr.io/gqadonis/knowdesign",
  mcpServerName: "knowdesign",
  productName: "KnowDesign",
  releaseOrigin: "",
  slug: "knowdesign",
  urlScheme: "knowdesign",
  userStateDirName: ".knowdesign",
});

export const BRANDS: Readonly<Record<BrandId, BrandDescriptor>> = Object.freeze({
  "open-design": OPEN_DESIGN_BRAND,
  knowdesign: KNOWDESIGN_BRAND,
});

export function brandById(id: string): BrandDescriptor {
  if (id === "open-design" || id === "knowdesign") return BRANDS[id];
  throw new Error(`unknown brand id: ${JSON.stringify(id)}`);
}

/** The brand a runtime or build presents: knowdesign under its profile, Open Design otherwise. */
export function resolveBrand(env: Readonly<Record<string, string | undefined>> = process.env): BrandDescriptor {
  return String(env.OD_BUILD_PROFILE ?? "").trim().toLowerCase() === "knowdesign"
    ? KNOWDESIGN_BRAND
    : OPEN_DESIGN_BRAND;
}
