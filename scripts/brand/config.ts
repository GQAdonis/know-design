/**
 * The default brand codemod configuration: Open Design -> KnowDesign.
 *
 * Names come from the brand descriptor, so the codemod can never drift from the
 * identity the build actually uses. The selection is deliberately conservative:
 * user-facing prose and UI source, never locale files or the tests that assert
 * brand strings (they stay byte-identical to upstream and the brand is applied at
 * build/runtime instead; decision D-014(a)), never licence text, never generated output.
 */

import { KNOWDESIGN_BRAND, OPEN_DESIGN_BRAND } from "../../packages/release/src/brand.ts";
import type { BrandConfig } from "./lib.ts";

/** Prose files where clickable repository links and image names are rebranded. */
export const DOC_FILES = ["README.md", "QUICKSTART.md", "CONTRIBUTING.md", "docs/**/*.md"] as const;

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  exclude: [
    "apps/web/src/i18n/locales/**",
    "docs/i18n/**",
    "**/tests/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/LICENSE*",
    "**/NOTICE*",
    "**/CHANGELOG*",
  ],
  include: [
    "README.md",
    "QUICKSTART.md",
    "CONTRIBUTING.md",
    "docs/**/*.md",
    "apps/web/app/**/*.ts",
    "apps/web/app/**/*.tsx",
    "apps/web/src/**/*.ts",
    "apps/web/src/**/*.tsx",
    "apps/desktop/src/**/*.ts",
    "apps/packaged/src/**/*.ts",
    "apps/daemon/src/**/*.ts",
    "tools/pack/src/**/*.ts",
  ],
  // The must-not-rename list. Internal identifiers stay as upstream spells them (D-007);
  // upstream hosts and the upstream repository slug are data, not branding.
  protect: [
    "@open-design/[a-z0-9-]+",
    "[a-z0-9.-]*open-design\\.ai",
    "Open Design contributors",
    "Open Design Authors",
  ],
  rules: [
    { from: OPEN_DESIGN_BRAND.productName, to: KNOWDESIGN_BRAND.productName },
    // Links and image names in prose follow the fork. In code the upstream slug is DATA (update and
    // metadata sources, switched off by the knowdesign profile), so these rules never apply there.
    { files: DOC_FILES, from: OPEN_DESIGN_BRAND.githubRepo, to: KNOWDESIGN_BRAND.githubRepo },
    { files: DOC_FILES, from: OPEN_DESIGN_BRAND.imageRepo, to: KNOWDESIGN_BRAND.imageRepo },
    // The no-space spelling also occurs in real identifiers, so it is applied only to the files
    // known to carry it as a window or page title.
    {
      files: ["apps/web/app/layout.tsx", "apps/desktop/src/main/runtime.ts"],
      from: "OpenDesign",
      to: KNOWDESIGN_BRAND.productName,
    },
  ],
};
