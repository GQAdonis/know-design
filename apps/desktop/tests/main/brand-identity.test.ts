import { SIDECAR_SOURCES } from "@open-design/sidecar-proto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  brandCompactName,
  brandIssuesUrl,
  brandProductName,
  brandRepoUrl,
} from "../../src/main/brand.js";
import {
  continueInviteFromUrl,
  findDeeplinkArg,
  inviteDeeplinkScheme,
  isWorkspaceOpenDeeplink,
} from "../../src/main/invite-deeplink-core.js";
import { defaultMetadataUrl, resolveDesktopUpdaterConfig } from "../../src/main/updater/config.js";

const OD = {};
const KD = { OD_BUILD_PROFILE: "knowdesign" };

const invite = (scheme: string) =>
  `${scheme}://workspace/invite/continue?workspace_id=w&member_id=m&invite_id=i&nonce=n`;

describe("brand display strings", () => {
  it("keeps today's Open Design literals with no profile", () => {
    expect(brandProductName(OD)).toBe("Open Design");
    expect(brandCompactName(OD)).toBe("OpenDesign");
    expect(brandIssuesUrl(OD)).toBe("https://github.com/nexu-io/open-design/issues/new");
    expect(brandRepoUrl(OD)).toBe("https://github.com/nexu-io/open-design");
  });

  it("uses KnowDesign values under the profile, none equal to Open Design's", () => {
    expect(brandProductName(KD)).toBe("KnowDesign");
    expect(brandCompactName(KD)).toBe("KnowDesign");
    expect(brandIssuesUrl(KD)).toBe("https://github.com/GQAdonis/know-design/issues/new");
    expect(brandRepoUrl(KD)).toBe("https://github.com/GQAdonis/know-design");
    for (const fn of [brandProductName, brandCompactName, brandIssuesUrl, brandRepoUrl]) {
      expect(fn(KD)).not.toBe(fn(OD));
    }
  });
});

describe("deeplink scheme per brand", () => {
  it("resolves the scheme at call time", () => {
    expect(inviteDeeplinkScheme(OD)).toBe("opendesign");
    expect(inviteDeeplinkScheme(KD)).toBe("knowdesign");
  });

  it("an Open Design process finds only opendesign:// in argv", () => {
    expect(findDeeplinkArg(["app", invite("opendesign")], OD)).toBe(invite("opendesign"));
    expect(findDeeplinkArg(["app", invite("knowdesign")], OD)).toBeNull();
  });

  it("a knowdesign process finds knowdesign:// and rejects an opendesign:// argv link", () => {
    expect(findDeeplinkArg(["app", invite("knowdesign")], KD)).toBe(invite("knowdesign"));
    expect(findDeeplinkArg(["app", invite("opendesign")], KD)).toBeNull();
  });

  it("a knowdesign process refuses to handle an opendesign:// invite or focus link", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const focus = vi.fn();
    const resolveDaemonBaseUrl = vi.fn(async () => "http://127.0.0.1:1");
    const out = await continueInviteFromUrl(
      invite("opendesign"),
      { resolveDaemonBaseUrl, fetch: fetchImpl, focus },
      KD,
    );
    expect(out).toEqual({ ok: false, reason: "not_an_invite_deeplink" });
    expect(resolveDaemonBaseUrl).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isWorkspaceOpenDeeplink("opendesign://workspace/open", KD)).toBe(false);
    expect(isWorkspaceOpenDeeplink("knowdesign://workspace/open", KD)).toBe(true);
    expect(isWorkspaceOpenDeeplink("knowdesign://workspace/open", OD)).toBe(false);
  });

  it("a knowdesign process accepts its own invite link", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response);
    const out = await continueInviteFromUrl(
      invite("knowdesign"),
      { resolveDaemonBaseUrl: async () => "http://127.0.0.1:1", fetch: fetchImpl as unknown as typeof fetch },
      KD,
    );
    expect(out.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("updater default feed per brand", () => {
  it("keeps the Open Design release origin", () => {
    expect(defaultMetadataUrl("stable", OD)).toBe("https://releases.open-design.ai/stable/latest/metadata.json");
  });

  it("knowdesign has no feed: the empty string, never a malformed URL", () => {
    expect(defaultMetadataUrl("stable", KD)).toBe("");
    const config = resolveDesktopUpdaterConfig({
      env: KD,
      platform: "darwin",
      source: SIDECAR_SOURCES.PACKAGED,
    });
    expect(config.metadataUrl).toBe("");
    expect(config.enabled).toBe(false);
  });

  it("an explicit feed still wins under knowdesign", () => {
    const config = resolveDesktopUpdaterConfig({
      env: { ...KD, OD_UPDATE_METADATA_URL: "https://updates.example.test/m.json" },
      platform: "darwin",
      source: SIDECAR_SOURCES.PACKAGED,
    });
    expect(config.metadataUrl).toBe("https://updates.example.test/m.json");
    expect(config.enabled).toBe(true);
  });
});

describe("process-env resolution at call time", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("follows OD_BUILD_PROFILE set after import", () => {
    expect(brandProductName()).toBe("Open Design");
    vi.stubEnv("OD_BUILD_PROFILE", "knowdesign");
    expect(brandProductName()).toBe("KnowDesign");
    expect(inviteDeeplinkScheme()).toBe("knowdesign");
  });
});
