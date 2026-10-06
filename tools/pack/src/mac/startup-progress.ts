import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { STARTUP_EVENTS_FILE_NAME, parseStartupEvents, type StartupEvent } from "@open-design/launcher-proto";

/**
 * Reporting for a launch that is still starting. Everything here is observation: it tells a person
 * (or a failure message) where startup is, and it never decides whether the launch succeeded.
 */

export type StartProgressReporter = (line: string) => void;

export function startupEventsPath(desktopLogPath: string): string {
  return join(dirname(desktopLogPath), STARTUP_EVENTS_FILE_NAME);
}

async function readStartupEvents(desktopLogPath: string): Promise<StartupEvent[]> {
  try {
    return parseStartupEvents(await readFile(startupEventsPath(desktopLogPath), "utf8"));
  } catch {
    return [];
  }
}

/** "process-started -> daemon-ready", or null when the app never wrote a phase. */
export async function summarizeStartupPhases(desktopLogPath: string): Promise<string | null> {
  const events = await readStartupEvents(desktopLogPath);
  return events.length === 0 ? null : events.map((event) => event.phase).join(" -> ");
}

/**
 * Reports each phase once, in order: those the sidecar announces over IPC (`startup phase: ...`) and
 * those the app appended to its event file (`startup event: ...`). Calling `observe` more often than
 * anything changes is free; repeats are not new events.
 */
export function createStartupProgressWatcher(desktopLogPath: string, report: StartProgressReporter) {
  let lastIpcPhase: string | null = null;
  let reportedFileEvents = 0;
  let reading = false;
  return {
    observe(phase: string | null | undefined): void {
      if (phase != null && phase !== lastIpcPhase) {
        lastIpcPhase = phase;
        report(`startup phase: ${phase}`);
      }
      if (reading) return;
      reading = true;
      void readStartupEvents(desktopLogPath)
        .then((events) => {
          for (const event of events.slice(reportedFileEvents)) report(`startup event: ${event.phase}`);
          reportedFileEvents = Math.max(reportedFileEvents, events.length);
        })
        .finally(() => {
          reading = false;
        });
    },
  };
}
