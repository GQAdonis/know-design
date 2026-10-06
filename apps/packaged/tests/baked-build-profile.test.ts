import { describe, expect, it } from "vitest";

import { applyBakedBuildProfile } from "../src/build-profile.js";

describe("applyBakedBuildProfile", () => {
  it("applies a baked knowdesign profile when the launch environment says nothing", () => {
    const env: NodeJS.ProcessEnv = {};
    expect(applyBakedBuildProfile("knowdesign", env)).toBe("knowdesign");
    expect(env.OD_BUILD_PROFILE).toBe("knowdesign");
  });

  it("treats a blank launch value as unset", () => {
    const env: NodeJS.ProcessEnv = { OD_BUILD_PROFILE: "   " };
    expect(applyBakedBuildProfile("knowdesign", env)).toBe("knowdesign");
    expect(env.OD_BUILD_PROFILE).toBe("knowdesign");
  });

  it("lets an explicit launch environment value win, so tests can override a baked build", () => {
    const env: NodeJS.ProcessEnv = { OD_BUILD_PROFILE: "default" };
    expect(applyBakedBuildProfile("knowdesign", env)).toBe("default");
    expect(env.OD_BUILD_PROFILE).toBe("default");
  });

  it("normalises the baked value and ignores anything that is not knowdesign", () => {
    const padded: NodeJS.ProcessEnv = {};
    expect(applyBakedBuildProfile(" KnowDesign ", padded)).toBe("knowdesign");
    expect(padded.OD_BUILD_PROFILE).toBe("knowdesign");

    for (const baked of [undefined, "", "default", "other"]) {
      const env: NodeJS.ProcessEnv = {};
      expect(applyBakedBuildProfile(baked, env)).toBeNull();
      expect(env.OD_BUILD_PROFILE).toBeUndefined();
    }
  });

  it("never overwrites an existing knowdesign value", () => {
    const env: NodeJS.ProcessEnv = { OD_BUILD_PROFILE: "knowdesign" };
    expect(applyBakedBuildProfile("knowdesign", env)).toBe("knowdesign");
    expect(env.OD_BUILD_PROFILE).toBe("knowdesign");
  });
});
