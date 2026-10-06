import { describe, expect, it } from "vitest";

import {
  BRANDS,
  OPEN_DESIGN_BRAND,
  KNOWDESIGN_BRAND,
  brandById,
  releaseChannelDescriptor,
  releaseInstallIdentity,
  resolveBrand,
} from "../src/index.js";

describe("brand descriptor", () => {
  it("keeps the shipped Open Design identity byte-for-byte as the default", () => {
    expect(OPEN_DESIGN_BRAND).toMatchObject({
      appId: "io.open-design.desktop",
      cliBin: "od",
      daemonDefaultPort: 7456,
      id: "open-design",
      mcpServerName: "open-design",
      productName: "Open Design",
      slug: "open-design",
      urlScheme: "opendesign",
      userStateDirName: ".open-design",
    });
    expect(releaseChannelDescriptor("stable").appId).toBe("io.open-design.desktop");
    expect(releaseChannelDescriptor("stable").productName).toBe("Open Design");
    expect(releaseChannelDescriptor("prerelease").productName).toBe("Open Design Prerelease");
    expect(releaseInstallIdentity("beta").appId).toBe("io.open-design.desktop.beta");
  });

  it("shares no OS-observable identifier between the two brands", () => {
    const observable = [
      "appId",
      "cliBin",
      "daemonDefaultPort",
      "mcpServerName",
      "productName",
      "slug",
      "urlScheme",
      "userStateDirName",
    ] as const;
    for (const key of observable) {
      expect(KNOWDESIGN_BRAND[key], key).not.toBe(OPEN_DESIGN_BRAND[key]);
    }
    // A knowdesign build must also never be a prefix/alias of the original's identity.
    expect(KNOWDESIGN_BRAND.appId.startsWith(OPEN_DESIGN_BRAND.appId)).toBe(false);
    expect(KNOWDESIGN_BRAND.productName.includes("Open Design")).toBe(false);
    expect(KNOWDESIGN_BRAND.slug.includes("open-design")).toBe(false);
  });

  it("keeps every identifier within the platform limits it ends up in", () => {
    for (const brand of [BRANDS["open-design"], BRANDS.knowdesign]) {
      expect(brand.appId).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/);
      expect(brand.slug).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(brand.urlScheme).toMatch(/^[a-z][a-z0-9+.-]*$/);
      expect(brand.userStateDirName.startsWith(".")).toBe(true);
      // Windows NSIS install paths are length-sensitive: keep the slug short.
      expect(brand.slug.length).toBeLessThanOrEqual(16);
      expect(brand.daemonDefaultPort).toBeGreaterThan(1024);
      expect(brand.daemonDefaultPort).toBeLessThan(65536);
    }
  });

  it("resolves the brand from the build profile, defaulting to Open Design", () => {
    expect(resolveBrand({})).toBe(OPEN_DESIGN_BRAND);
    expect(resolveBrand({ OD_BUILD_PROFILE: "" })).toBe(OPEN_DESIGN_BRAND);
    expect(resolveBrand({ OD_BUILD_PROFILE: "something-else" })).toBe(OPEN_DESIGN_BRAND);
    expect(resolveBrand({ OD_BUILD_PROFILE: "knowdesign" })).toBe(KNOWDESIGN_BRAND);
    expect(resolveBrand({ OD_BUILD_PROFILE: " KnowDesign " })).toBe(KNOWDESIGN_BRAND);
  });

  it("looks a brand up by id and rejects unknown ids", () => {
    expect(brandById("knowdesign")).toBe(KNOWDESIGN_BRAND);
    expect(brandById("open-design")).toBe(OPEN_DESIGN_BRAND);
    expect(() => brandById("nope")).toThrow(/unknown brand/i);
  });

  it("derives channel identity from the chosen brand without touching the default", () => {
    const stable = releaseChannelDescriptor("stable", KNOWDESIGN_BRAND);
    expect(stable.appId).toBe(KNOWDESIGN_BRAND.appId);
    expect(stable.productName).toBe("KnowDesign");
    expect(releaseChannelDescriptor("prerelease", KNOWDESIGN_BRAND).productName).toBe("KnowDesign Prerelease");
    expect(releaseChannelDescriptor("beta", KNOWDESIGN_BRAND).appId).toBe(`${KNOWDESIGN_BRAND.appId}.beta`);
    expect(releaseInstallIdentity("beta", KNOWDESIGN_BRAND).productName).toBe("KnowDesign Beta");
  });
});
