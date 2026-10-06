import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A knowdesign build must claim and accept ONLY knowdesign://, so it can sit
// beside an installed Open Design that owns opendesign://.
const electron = vi.hoisted(() => ({
  on: vi.fn(),
  setAsDefaultProtocolClient: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    on: electron.on,
    setAsDefaultProtocolClient: electron.setAsDefaultProtocolClient,
    whenReady: async () => undefined,
  },
}));

const invite = (scheme: string) =>
  `${scheme}://workspace/invite/continue?workspace_id=w&member_id=m&invite_id=i&nonce=n`;

async function register(profile: string | undefined) {
  if (profile === undefined) vi.stubEnv("OD_BUILD_PROFILE", "");
  else vi.stubEnv("OD_BUILD_PROFILE", profile);
  vi.resetModules();
  const { registerInviteDeeplink } = await import("../../src/main/invite-deeplink.js");
  const resolveDaemonBaseUrl = vi.fn(async () => "http://127.0.0.1:1");
  const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response);
  registerInviteDeeplink({
    resolveDaemonBaseUrl,
    fetch: fetchImpl as unknown as typeof fetch,
  });
  const secondInstance = electron.on.mock.calls.find(([name]) => name === "second-instance")?.[1] as (
    event: unknown,
    argv: string[],
  ) => void;
  return { fetchImpl, secondInstance };
}

beforeEach(() => {
  electron.on.mockClear();
  electron.setAsDefaultProtocolClient.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("registerInviteDeeplink per brand", () => {
  it("Open Design registers opendesign", async () => {
    await register(undefined);
    expect(electron.setAsDefaultProtocolClient).toHaveBeenCalledWith("opendesign");
    expect(electron.setAsDefaultProtocolClient).not.toHaveBeenCalledWith("knowdesign");
  });

  it("knowdesign registers knowdesign and never opendesign", async () => {
    await register("knowdesign");
    expect(electron.setAsDefaultProtocolClient).toHaveBeenCalledWith("knowdesign");
    expect(electron.setAsDefaultProtocolClient).not.toHaveBeenCalledWith("opendesign");
  });

  it("a knowdesign process ignores an opendesign:// second-instance link", async () => {
    const { fetchImpl, secondInstance } = await register("knowdesign");
    secondInstance({}, ["app", invite("opendesign")]);
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("a knowdesign process handles its own knowdesign:// second-instance link", async () => {
    const { fetchImpl, secondInstance } = await register("knowdesign");
    secondInstance({}, ["app", invite("knowdesign")]);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
  });
});
