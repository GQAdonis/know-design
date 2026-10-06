import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  bootstrapSidecarProcess,
  isCurrentSidecarLauncher,
  readCurrentSidecarStamp,
  SidecarFactory,
} from "../../src/index.js";

// A sidecar whose runtime stays "starting" until the TEST creates a gate file. That makes startup length
// a property of the test's events, not of the machine: the test opens the gate when it has observed the
// phase it is waiting for.
const gatePath = process.env.OD_TEST_GATE;
const attemptPath = process.env.OD_TEST_LAUNCH_ATTEMPT;
if (gatePath == null || attemptPath == null) throw new Error("OD_TEST_GATE and OD_TEST_LAUNCH_ATTEMPT are required");
const stamp = readCurrentSidecarStamp();
const resources = {
  dataRoot: "/tmp/open-design-gated-launcher-data",
  ownerPid: null,
  port: 0,
  runtimeRoot: "/tmp/open-design-gated-launcher-runtime",
};

if (isCurrentSidecarLauncher()) {
  writeFileSync(attemptPath, String(Number(readFileSync(attemptPath, "utf8")) + 1));
  if (process.env.OD_TEST_LAUNCHER_ALWAYS_EXITS === "1") process.exit(0);
  if (await bootstrapSidecarProcess(stamp, resources, {
    args: ["--import", "tsx", fileURLToPath(import.meta.url)],
  })) process.exit(0);
}

const client = SidecarFactory.create({
  lifecycle: {
    async start(_resources, context) {
      context?.reportPhase("waiting-for-gate");
      while (!existsSync(gatePath)) await new Promise((resolve) => setTimeout(resolve, 20));
      context?.reportPhase("gate-open");
      return {};
    },
    status() { return { ready: true }; },
    async stop() {},
  },
});
await client.start();
await client.waitUntilStopped();
