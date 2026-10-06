import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, test } from "vitest";

import {
  applyBrandToText,
  applyBrandToTree,
  findStrayBrandStrings,
  validateBrandConfig,
  verifyBrandTree,
  type BrandConfig,
} from "../../../scripts/brand/lib.ts";
import { DEFAULT_BRAND_CONFIG } from "../../../scripts/brand/config.ts";

const config: BrandConfig = {
  exclude: ["apps/web/src/i18n/locales/**", "**/tests/**"],
  include: ["**/*.md", "**/*.ts", "**/*.tsx"],
  protect: [
    "@open-design/[a-z-]+",
    "[a-z0-9.-]*open-design\\.ai",
    "nexu-io/open-design",
    "Open Design contributors",
  ],
  rules: [
    { from: "Open Design", to: "KnowDesign" },
    { files: ["apps/web/app/layout.tsx"], from: "OpenDesign", to: "KnowDesign" },
  ],
};

const scratch: string[] = [];
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "brand-codemod-"));
  scratch.push(root);
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text, "utf8");
  }
  return root;
}
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { force: true, recursive: true });
});

describe("applyBrandToText", () => {
  test("replaces the display name, including channel variants", () => {
    assert.equal(applyBrandToText("Open Design and Open Design Prerelease", "README.md", config), "KnowDesign and KnowDesign Prerelease");
  });

  test("is idempotent: a second pass changes nothing", () => {
    const once = applyBrandToText("Welcome to Open Design. Open Design!", "README.md", config);
    assert.equal(applyBrandToText(once, "README.md", config), once);
  });

  test("never touches protected spans", () => {
    const source = [
      "import x from '@open-design/web';",
      "fetch('https://releases.open-design.ai/stable');",
      "see https://github.com/nexu-io/open-design",
      "Copyright Open Design contributors",
      "Open Design is a product",
    ].join("\n");
    assert.equal(
      applyBrandToText(source, "docs/a.md", config),
      [
        "import x from '@open-design/web';",
        "fetch('https://releases.open-design.ai/stable');",
        "see https://github.com/nexu-io/open-design",
        "Copyright Open Design contributors",
        "KnowDesign is a product",
      ].join("\n"),
    );
  });

  test("applies a scoped rule only to its own files and never inside identifiers", () => {
    const code = 'const title = "OpenDesign"; type OpenDesignPublicMetadata = {}; // Open Design';
    assert.equal(
      applyBrandToText(code, "apps/web/app/layout.tsx", config),
      'const title = "KnowDesign"; type OpenDesignPublicMetadata = {}; // KnowDesign',
    );
    assert.equal(applyBrandToText(code, "apps/web/src/other.tsx", config), 'const title = "OpenDesign"; type OpenDesignPublicMetadata = {}; // KnowDesign');
  });
});

describe("findStrayBrandStrings", () => {
  test("reports unprotected old-brand text with its position, and nothing once applied", () => {
    const text = "line one\nsee Open Design here\n@open-design/web";
    const stray = findStrayBrandStrings(text, "docs/a.md", config);
    assert.equal(stray.length, 1);
    assert.deepEqual({ column: stray[0]!.column, line: stray[0]!.line, match: stray[0]!.match }, { column: 5, line: 2, match: "Open Design" });
    assert.deepEqual(findStrayBrandStrings(applyBrandToText(text, "docs/a.md", config), "docs/a.md", config), []);
  });
});

describe("default configuration", () => {
  const docs = "README.md";
  const code = "apps/daemon/src/plugins/marketplaces.ts";

  test("rebrands repository links and image names in prose only", () => {
    const text = "see https://github.com/nexu-io/open-design and ghcr.io/nexu-io/od:latest";
    assert.equal(
      applyBrandToText(text, docs, DEFAULT_BRAND_CONFIG),
      "see https://github.com/GQAdonis/knowdesign and ghcr.io/gqadonis/knowdesign:latest",
    );
    // In code the upstream slug is data (update/metadata sources), never branding.
    assert.equal(applyBrandToText(text, code, DEFAULT_BRAND_CONFIG), text);
  });

  test("still protects package scopes and upstream hosts", () => {
    const text = "@open-design/web talks to releases.open-design.ai";
    assert.equal(applyBrandToText(text, docs, DEFAULT_BRAND_CONFIG), text);
  });
});

describe("validateBrandConfig", () => {
  test("rejects a rule whose replacement still contains its source, which would break idempotence", () => {
    assert.throws(
      () => validateBrandConfig({ ...config, rules: [{ from: "Open Design", to: "Open Design Plus" }] }),
      /idempotent/i,
    );
  });

  test("rejects empty rule sources", () => {
    assert.throws(() => validateBrandConfig({ ...config, rules: [{ from: "", to: "x" }] }), /empty/i);
  });

  test("the shipped default config is valid", () => {
    validateBrandConfig(DEFAULT_BRAND_CONFIG);
  });
});

describe("applyBrandToTree / verifyBrandTree", () => {
  const files = {
    "README.md": "Open Design readme\n",
    "apps/web/src/i18n/locales/en.ts": "export const en = { app: 'Open Design' };\n",
    "apps/web/tests/title.test.ts": "expect(title).toBe('Open Design');\n",
    "packages/a/src/x.ts": "export const label = 'Open Design';\nimport '@open-design/web';\n",
  };

  test("renames allowed files, and leaves excluded files byte-identical", () => {
    const root = tree(files);
    const { changed } = applyBrandToTree(root, config);
    assert.deepEqual([...changed].sort(), ["README.md", "packages/a/src/x.ts"]);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), "KnowDesign readme\n");
    assert.equal(readFileSync(join(root, "packages/a/src/x.ts"), "utf8"), "export const label = 'KnowDesign';\nimport '@open-design/web';\n");
    assert.equal(readFileSync(join(root, "apps/web/src/i18n/locales/en.ts"), "utf8"), files["apps/web/src/i18n/locales/en.ts"]);
    assert.equal(readFileSync(join(root, "apps/web/tests/title.test.ts"), "utf8"), files["apps/web/tests/title.test.ts"]);
  });

  test("a second run over the tree produces no further change", () => {
    const root = tree(files);
    applyBrandToTree(root, config);
    assert.deepEqual(applyBrandToTree(root, config).changed, []);
  });

  test("verify fails on a seeded stray and passes once applied; excluded files are never reported", () => {
    const root = tree(files);
    const before = verifyBrandTree(root, config);
    assert.deepEqual(before.map((violation) => violation.file).sort(), ["README.md", "packages/a/src/x.ts"]);
    applyBrandToTree(root, config);
    assert.deepEqual(verifyBrandTree(root, config), []);
    writeFileSync(join(root, "docs.md"), "A stray Open Design string\n", "utf8");
    assert.deepEqual(verifyBrandTree(root, config).map((violation) => violation.file), ["docs.md"]);
  });

  test("dry run reports what would change without writing", () => {
    const root = tree(files);
    const { changed } = applyBrandToTree(root, config, { write: false });
    assert.equal(changed.length, 2);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), "Open Design readme\n");
  });
});
