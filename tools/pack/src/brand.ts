import {
  releaseChannelFromNamespace,
  releaseChannelFromVersion,
  resolveBrand,
  type BrandDescriptor,
  type ReleaseChannel,
} from "@open-design/release";
import { SIDECAR_DEFAULTS } from "@open-design/sidecar-proto";

/**
 * Everything tools-pack names that the OS, or another install, can observe comes
 * from one brand descriptor (packages/release/src/brand.ts). This module is the
 * tools-pack side of that rule: it resolves the descriptor from a config and
 * derives the few shapes that are not plain descriptor fields.
 *
 * Open Design stays the default so every identifier it produces is unchanged.
 */

/** The slice of ToolPackConfig that decides the brand. Tolerates configs built without `brand`. */
export type BrandedConfig = {
  brand?: BrandDescriptor;
  buildProfile?: "knowdesign";
};

export function brandOf(config?: BrandedConfig): BrandDescriptor {
  if (config?.brand != null) return config.brand;
  return resolveBrand({ OD_BUILD_PROFILE: config?.buildProfile });
}

/** Windows executable (and Electron `executableName`) for the stable-style identity. */
export function brandExecutableFileName(brand: BrandDescriptor): string {
  return `${brand.productName}.exe`;
}

/** The `name` electron-builder bakes into package.json; Electron derives its userData directory from it. */
export function brandPackagedAppName(brand: BrandDescriptor): string {
  return `${brand.slug}-packaged-app`;
}

/** Update feed placeholder host path; never contacted (`--publish never`), but kept per brand. */
export function brandUpdatePlaceholderUrl(brand: BrandDescriptor): string {
  return `https://updates.invalid/${brand.slug}`;
}

/** The default tools-pack namespace for a brand that is not the original. */
export function brandNamespacePrefix(brand: BrandDescriptor): string | null {
  return brand.id === "open-design" ? null : brand.slug;
}

/**
 * A non-original brand always runs in a namespace of its own: namespaces feed the
 * sidecar stamp, socket and pipe names, process scans and data roots, so sharing
 * `default` or `release-*` with an installed Open Design would let the two apps
 * see (and stop) each other. The original brand's namespace is returned as given.
 */
export function brandScopedNamespace(brand: BrandDescriptor, namespace: string): string {
  const prefix = brandNamespacePrefix(brand);
  if (prefix == null) return namespace;
  if (namespace === prefix || namespace.startsWith(`${prefix}-`)) return namespace;
  return `${prefix}-${namespace}`;
}

/**
 * The channel a config packages for. The version wins; otherwise the namespace
 * decides, after removing the brand prefix a non-original brand adds to it.
 */
export function releaseChannelForConfig(
  config: BrandedConfig & { appVersion?: string; namespace: string },
): ReleaseChannel | null {
  const fromVersion = releaseChannelFromVersion(config.appVersion);
  if (fromVersion != null) return fromVersion;
  const prefix = brandNamespacePrefix(brandOf(config));
  if (prefix == null) return releaseChannelFromNamespace(config.namespace, SIDECAR_DEFAULTS.namespace);
  if (config.namespace === prefix) return "stable";
  if (!config.namespace.startsWith(`${prefix}-`)) return null;
  return releaseChannelFromNamespace(config.namespace.slice(prefix.length + 1), SIDECAR_DEFAULTS.namespace);
}

/**
 * Cache-key determinant for nodes whose content carries the brand's names (the
 * unpacked app's executable, package.json name and product name). Empty for the
 * original brand so its existing cache keys do not move.
 */
export function brandCacheKeyInput(brand: BrandDescriptor): { brand?: string } {
  return brand.id === "open-design" ? {} : { brand: brand.id };
}
