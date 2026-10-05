import { SIDECAR_SOURCES } from "@open-design/sidecar-proto";
import { describe, expect, it } from "vitest";

import { resolveDesktopUpdaterConfig } from "../../../src/main/updater/config.js";

const base = {
  launcherLaunchPath: "/Applications/KnowDesign.app",
  platform: "darwin" as const,
  source: SIDECAR_SOURCES.PACKAGED,
};

describe("desktop updater under the knowdesign build profile", () => {
  it("is off by default (and never auto-checks) because the stock feed is upstream", () => {
    const config = resolveDesktopUpdaterConfig({ ...base, env: { OD_BUILD_PROFILE: "knowdesign" } });
    expect(config.enabled).toBe(false);
    expect(config.autoCheck).toBe(false);
  });

  it("stays off even when explicitly enabled without a KnowDesign feed", () => {
    const config = resolveDesktopUpdaterConfig({
      ...base,
      env: { OD_BUILD_PROFILE: "knowdesign", OD_UPDATE_ENABLED: "1" },
    });
    expect(config.enabled).toBe(false);
  });

  it("turns on only against a configured feed", () => {
    const config = resolveDesktopUpdaterConfig({
      ...base,
      env: {
        OD_BUILD_PROFILE: "knowdesign",
        OD_UPDATE_METADATA_URL: "https://updates.example.test/stable/latest/metadata.json",
      },
    });
    expect(config.enabled).toBe(true);
  });

  it("is unchanged with the profile off: packaged builds keep the updater on", () => {
    expect(resolveDesktopUpdaterConfig({ ...base, env: {} }).enabled).toBe(true);
    expect(resolveDesktopUpdaterConfig({ ...base, env: { OD_BUILD_PROFILE: "default" } }).enabled).toBe(true);
  });
});
