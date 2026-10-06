import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { describeSidecarGeneration } from "../src/generation.js";
import { createJsonIpcServer } from "../src/json-ipc.js";
import { resolvePrivateIpcPath, type SidecarStamp } from "../src/stamp.js";

const stamp: SidecarStamp = { app: "daemon", channel: "prerelease", mode: "runtime", namespace: "describe-phase", source: "packaged" };

describe("describeSidecarGeneration phase", () => {
  const originalTmpdir = process.env.TMPDIR;
  let dir: string;
  let close: (() => Promise<void>) | null = null;

  beforeEach(() => {
    // Unix socket paths are limited to ~104 bytes; the platform temp dir is too long on macOS.
    dir = mkdtempSync(join(process.platform === "win32" ? tmpdir() : "/tmp", "odp-"));
    process.env.TMPDIR = dir;
  });
  afterEach(async () => {
    await close?.();
    close = null;
    if (originalTmpdir == null) delete process.env.TMPDIR;
    else process.env.TMPDIR = originalTmpdir;
    rmSync(dir, { force: true, recursive: true });
  });

  const serve = async (extra: Record<string, unknown>) => {
    const handle = await createJsonIpcServer({
      handler: () => ({ ready: false, resources: { pid: process.pid, port: 0 }, stamp, ...extra }),
      socketPath: resolvePrivateIpcPath(stamp),
    });
    close = () => handle.close();
  };

  it("passes the announced phase through, before the sidecar is ready", async () => {
    await serve({ phase: { name: "daemon-ready", seq: 2 } });
    const description = await describeSidecarGeneration(stamp);
    expect(description?.ready).toBe(false);
    expect(description?.phase).toEqual({ name: "daemon-ready", seq: 2 });
  });

  it("accepts a sidecar that predates phases", async () => {
    await serve({});
    const description = await describeSidecarGeneration(stamp);
    expect(description?.ready).toBe(false);
    expect(description?.phase).toBeUndefined();
  });

  it("rejects a malformed phase instead of passing it on", async () => {
    await serve({ phase: { name: "", seq: 1 } });
    await expect(describeSidecarGeneration(stamp)).rejects.toThrow(/invalid phase/);
  });
});
