import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { PackagedConfig } from "../src/config.js";
import { PackagedPathAccessError } from "../src/errors.js";
import { resolveHeadlessNamespaceBaseRoot } from "../src/headless-root.js";
import { resolvePackagedNamespacePaths } from "../src/paths.js";
import { findPackagedDeeplinkArg, planPackagedPayloadDesktopDelegation } from "../src/payload-desktop-launch.js";
import { resolvePackagedWindowTitle } from "../src/window-title.js";

const OD = {};
const KD = { OD_BUILD_PROFILE: "knowdesign" };

afterEach(() => vi.unstubAllEnvs());

describe("packaged window title per brand", () => {
  const stable = { appVersion: "0.10.0", namespace: "release-stable-win" };
  const adHoc = { appVersion: null, namespace: "knowdesign" };

  it("Open Design values are unchanged", () => {
    expect(resolvePackagedWindowTitle(stable, OD)).toBe("Open Design");
    expect(resolvePackagedWindowTitle(adHoc, OD)).toBe("Open Design");
    expect(resolvePackagedWindowTitle({ appVersion: "0.10.0-prerelease.1", namespace: "x" }, OD)).toBe(
      "Open Design Prerelease",
    );
  });

  it("knowdesign titles carry no Open Design string and keep the channel suffix", () => {
    expect(resolvePackagedWindowTitle(stable, KD)).toBe("KnowDesign");
    expect(resolvePackagedWindowTitle(adHoc, KD)).toBe("KnowDesign");
    expect(resolvePackagedWindowTitle({ appVersion: "0.10.0-prerelease.1", namespace: "x" }, KD)).toBe(
      "KnowDesign Prerelease",
    );
    expect(resolvePackagedWindowTitle({ appVersion: "0.10.0-beta.1", namespace: "x" }, KD)).toBe("KnowDesign Beta");
  });
});

describe("headless data root per brand", () => {
  it("keeps <xdg>/open-design/namespaces for Open Design", () => {
    expect(resolveHeadlessNamespaceBaseRoot({ XDG_DATA_HOME: "/x" })).toBe(join("/x", "open-design", "namespaces"));
  });

  it("uses <xdg>/knowdesign/namespaces under the profile", () => {
    expect(resolveHeadlessNamespaceBaseRoot({ ...KD, XDG_DATA_HOME: "/x" })).toBe(
      join("/x", "knowdesign", "namespaces"),
    );
  });

  it("OD_DATA_DIR still wins for both brands", () => {
    expect(resolveHeadlessNamespaceBaseRoot({ ...KD, OD_DATA_DIR: "/data" })).toBe(join("/data", "namespaces"));
  });
});

describe("OD_DATA_DIR error text per brand", () => {
  const config = {
    namespaceBaseRoot: "/tmp/ns",
    namespace: "release",
  } as unknown as PackagedConfig;

  function failure(env: Record<string, string>): PackagedPathAccessError {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    try {
      resolvePackagedNamespacePaths(config, "release", { OD_DATA_DIR: "relative/dir" });
    } catch (error) {
      expect(error).toBeInstanceOf(PackagedPathAccessError);
      return error as PackagedPathAccessError;
    }
    throw new Error("expected PackagedPathAccessError");
  }

  it("Open Design text is unchanged", () => {
    vi.stubEnv("OD_BUILD_PROFILE", "");
    const error = failure({});
    expect(error.title).toBe("Open Design cannot start with this OD_DATA_DIR");
    expect(error.message).toContain("Open Design's packaged runtime requires OD_DATA_DIR to be an absolute path.");
    expect(error.message).toContain("OpenDesign");
  });

  it("knowdesign text never says Open Design", () => {
    const error = failure({ OD_BUILD_PROFILE: "knowdesign" });
    expect(error.title).toBe("KnowDesign cannot start with this OD_DATA_DIR");
    expect(error.message).toContain("KnowDesign's packaged runtime");
    expect(error.message).not.toMatch(/Open ?Design/);
  });

  it("the default data-folder error title is brand-derived", () => {
    expect(new PackagedPathAccessError("x").title).toBe("Open Design cannot access its data folder");
    vi.stubEnv("OD_BUILD_PROFILE", "knowdesign");
    expect(new PackagedPathAccessError("x").title).toBe("KnowDesign cannot access its data folder");
  });
});

describe("packaged deeplink argv per brand", () => {
  const od = "opendesign://workspace/open";
  const kd = "knowdesign://workspace/open";

  it("Open Design accepts only opendesign://", () => {
    expect(findPackagedDeeplinkArg(["a", od], OD)).toBe(od);
    expect(findPackagedDeeplinkArg(["a", kd], OD)).toBeNull();
  });

  it("a knowdesign process rejects an opendesign:// argv link", () => {
    expect(findPackagedDeeplinkArg(["a", kd], KD)).toBe(kd);
    expect(findPackagedDeeplinkArg(["a", od], KD)).toBeNull();
  });

  it("delegation forwards only the brand's own scheme", () => {
    const runtime = {
      source: "payload",
      payloadDesktopProcess: false,
      desktopExecutablePath: "/app/x",
      selection: { selected: false },
    } as never;
    const forwardedArgs = [od, kd, "--flag"];
    const kdPlan = planPackagedPayloadDesktopDelegation(runtime, { forwardedArgs, env: KD });
    expect(kdPlan?.args).toContain(kd);
    expect(kdPlan?.args).not.toContain(od);
    const odPlan = planPackagedPayloadDesktopDelegation(runtime, { forwardedArgs, env: OD });
    expect(odPlan?.args).toContain(od);
    expect(odPlan?.args).not.toContain(kd);
  });
});
