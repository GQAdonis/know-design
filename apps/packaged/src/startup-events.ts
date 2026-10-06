import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

import { formatStartupEvent } from "@open-design/launcher-proto";

/**
 * Appends the phases this process passes during startup to `startup-events.jsonl`.
 *
 * Observation only. A failure to write is swallowed on purpose: a diagnostic aid must never be able to
 * turn a working launch into a failed one. The file is truncated when the recorder is created, so it
 * always describes the current launch and a reader never mixes it with a previous one.
 */
export type StartupEventRecorder = {
  phases(): readonly string[];
  record(phase: string): void;
};

export function createStartupEventRecorder(options: {
  filePath: string;
  now?: () => number;
  pid?: number;
}): StartupEventRecorder {
  const now = options.now ?? (() => Math.round(process.uptime() * 1000));
  const pid = options.pid ?? process.pid;
  const phases: string[] = [];
  let writable = true;
  try {
    mkdirSync(dirname(options.filePath), { recursive: true });
    writeFileSync(options.filePath, "");
  } catch {
    writable = false;
  }
  return {
    phases: () => phases,
    record(phase) {
      if (phases[phases.length - 1] === phase) return;
      phases.push(phase);
      if (!writable) return;
      try {
        appendFileSync(options.filePath, formatStartupEvent({ atMs: now(), phase, pid, seq: phases.length }));
      } catch {
        writable = false;
      }
    },
  };
}
