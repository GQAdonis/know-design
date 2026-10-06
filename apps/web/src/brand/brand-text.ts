import {
  KNOWDESIGN_BRAND,
  OPEN_DESIGN_BRAND,
  type BrandDescriptor,
  type BuildProfile,
} from '@open-design/contracts';
import { getWebBuildProfile } from '../collab/build-profile';

// Protected spans match first (leftmost-alternation) so the product-name token
// inside them is never rewritten: package scopes, first-party hosts, the upstream
// repo slug and the upstream copyright holder.
const PROTECTED_SPAN =
  String.raw`@open-design\/[\w.-]+|[\w.-]*open-design\.ai|nexu-io\/open-design|Open Design contributors`;
// Whole tokens only: the spaced and compact product names, not part of an identifier.
const PRODUCT_TOKEN = String.raw`(?<![A-Za-z0-9_])(?:Open Design|OpenDesign)(?![A-Za-z0-9_])`;
const BRAND_PATTERN = new RegExp(`(${PROTECTED_SPAN})|${PRODUCT_TOKEN}`, 'g');

export function brandForProfile(profile: BuildProfile): BrandDescriptor {
  return profile === 'knowdesign' ? KNOWDESIGN_BRAND : OPEN_DESIGN_BRAND;
}

/** The brand of the current web build profile, resolved at call time. */
export function getWebBrand(): BrandDescriptor {
  return brandForProfile(getWebBuildProfile());
}

/**
 * Replaces the upstream product name in a resolved string with the brand's
 * `productName`. Identity for the Open Design brand. Pure and idempotent.
 */
export function brandText(text: string, brand: BrandDescriptor): string {
  if (brand.id === OPEN_DESIGN_BRAND.id || !text) return text;
  return text.replace(BRAND_PATTERN, (match, protectedSpan: string | undefined) =>
    protectedSpan ? match : brand.productName,
  );
}

/** `brandText` against the live web profile, for code outside React. */
export function brandTextNow(text: string): string {
  return brandText(text, getWebBrand());
}

/** `https://github.com/<repo><suffix>` for the current brand. */
export function githubUrl(suffix = '', brand: BrandDescriptor = getWebBrand()): string {
  return `https://github.com/${brand.githubRepo}${suffix}`;
}
