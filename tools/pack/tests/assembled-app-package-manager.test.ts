import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ASSEMBLED_APP_NPM_INSTALL_ARGS,
  pinAssembledAppToNpmCollector,
} from "../src/assembled-app-package-manager.js";

const created: string[] = [];

async function makeAppRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "od-assembled-app-"));
  created.push(root);
  return root;
}

afterEach(async () => {
  while (created.length > 0) {
    const root = created.pop();
    if (root != null) await rm(root, { force: true, recursive: true });
  }
});

describe("pinAssembledAppToNpmCollector", () => {
  it("writes a self-terminating pnpm workspace manifest so pnpm --workspace-root stops at the app", async () => {
    const appRoot = await makeAppRoot();

    await pinAssembledAppToNpmCollector(appRoot);

    // An empty `packages` list makes the assembled app its own workspace root.
    // electron-builder's findWorkspaceRoot then resolves here instead of
    // walking up into this repo and re-detecting the collector as pnpm.
    const manifest = await readFile(join(appRoot, "pnpm-workspace.yaml"), "utf8");
    expect(manifest).toBe("packages: []\n");
  });
});

describe("ASSEMBLED_APP_NPM_INSTALL_ARGS", () => {
  it("keeps the generated package-lock.json, which is the npm collector marker", () => {
    // detectPackageManagerByFile returns npm when package-lock.json exists.
    // Suppressing the lockfile pushes detection to the environment, which
    // reports pnpm because tools-pack itself runs under `pnpm tools-pack`.
    expect(ASSEMBLED_APP_NPM_INSTALL_ARGS).not.toContain("--no-package-lock");
  });

  it("still installs production dependencies only", () => {
    expect(ASSEMBLED_APP_NPM_INSTALL_ARGS).toContain("--omit=dev");
  });
});
