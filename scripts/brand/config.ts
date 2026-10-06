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
    "nexu-io/open-design",
    "Open Design contributors",
    "Open Design Authors",
  ],
  rules: [
    { from: OPEN_DESIGN_BRAND.productName, to: KNOWDESIGN_BRAND.productName },
    // The no-space spelling also occurs in real identifiers, so it is applied only to the files
    // known to carry it as a window or page title.
    {
      files: ["apps/web/app/layout.tsx", "apps/desktop/src/main/runtime.ts"],
      from: "OpenDesign",
      to: KNOWDESIGN_BRAND.productName,
    },
  ],
};
